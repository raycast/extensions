import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  Detail,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { memo, useEffect, useMemo, useState } from "react";

import { useInteractiveSession } from "../hooks/use-interactive-session";
import { usePreferredTerminalApplication } from "../hooks/use-preferred-terminal";
import { useTranscript } from "../hooks/use-transcript";
import { McpManager } from "./mcp-manager";
import { SkillsManager } from "./skills-manager";
import { UsageDashboard } from "./usage-dashboard";
import { StartupConfiguration } from "./startup-configuration";
import { ShortcutSettings } from "./shortcut-settings";
import {
  CliModelOption,
  SlashCommandOption,
  effortTitle,
  loadModelOptions,
  modelEfforts,
  slashCommands,
} from "../lib/cli-catalog";
import { providerName } from "../lib/format";
import { InteractiveSnapshot } from "../lib/interactive";
import { PermissionProfile, permissionProfiles } from "../lib/permissions";
import { providerIcon } from "../lib/presentation";
import { shortcut, shortcutDefinitions, shortcutLabel, useShortcutStore } from "../lib/shortcuts";
import {
  installedTerminalApplications,
  openProjectInTerminal,
  preferredTerminalName,
  resumeSession,
  selectPreferredTerminalApplication,
  terminalApplicationId,
} from "../lib/terminal";
import { terminalPreviewDimensions, terminalPreviewMarkdown } from "../lib/terminal-preview";
import { ChatSession, Transcript } from "../lib/types";

const defaultTerminalScale = 1.48;

interface ConversationWorkspaceProps {
  sessions: ChatSession[];
  initialSessionKey: string;
  codexRoot: string;
}

export function ConversationWorkspace({ sessions, initialSessionKey, codexRoot }: ConversationWorkspaceProps) {
  const session = sessions.find((candidate) => sessionKey(candidate) === initialSessionKey) || sessions[0];

  if (!session) {
    return <Detail markdown={"# No conversations available"} />;
  }

  return <ConversationScreen key={sessionKey(session)} session={session} codexRoot={codexRoot} />;
}

const ConversationScreen = memo(function ConversationScreen({
  session,
  codexRoot,
}: {
  session: ChatSession;
  codexRoot: string;
}) {
  const interactive = useInteractiveSession(session);
  const runnerIsActive = interactive.snapshot.status === "running" || interactive.snapshot.status === "starting";
  const [startupConfirmed, setStartupConfirmed] = useState(() => runnerIsActive || session.isActive);

  if (!startupConfirmed && !runnerIsActive && !session.isActive) {
    return (
      <StartupConfiguration session={session} codexRoot={codexRoot} onConfigured={() => setStartupConfirmed(true)} />
    );
  }
  return <TerminalConsole session={session} codexRoot={codexRoot} interactive={interactive} />;
}, conversationScreenPropsMatch);

function conversationScreenPropsMatch(
  current: { session: ChatSession; codexRoot: string },
  next: { session: ChatSession; codexRoot: string },
): boolean {
  const currentSession = current.session;
  const nextSession = next.session;
  return (
    current.codexRoot === next.codexRoot &&
    currentSession.id === nextSession.id &&
    currentSession.provider === nextSession.provider &&
    currentSession.title === nextSession.title &&
    currentSession.projectName === nextSession.projectName &&
    currentSession.cwd === nextSession.cwd &&
    currentSession.sourcePath === nextSession.sourcePath &&
    currentSession.isActive === nextSession.isActive &&
    currentSession.model === nextSession.model &&
    currentSession.cliVersion === nextSession.cliVersion
  );
}

function TerminalConsole({
  session,
  codexRoot,
  interactive,
}: {
  session: ChatSession;
  codexRoot: string;
  interactive: ReturnType<typeof useInteractiveSession>;
}) {
  useShortcutStore();
  const { pop } = useNavigation();
  const [input, setInput] = useState("");
  const [scale, setScale] = useState(defaultTerminalScale);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [startError, setStartError] = useState<string>();
  const transcriptState = useTranscript(session);
  const snapshot = interactive.snapshot;
  const privateExternalSession = isPrivateExternalSessionError(startError);
  const isInteractive = snapshot.status === "running" || snapshot.status === "starting";
  const preferredTerminal = usePreferredTerminalApplication();
  const terminalName = preferredTerminalName(preferredTerminal);
  const terminalDimensions = terminalPreviewDimensions(scale, !showControls);
  const pageRows = Math.max(1, Math.floor(terminalDimensions.rows / 2));
  const previewSnapshot = useMemo(
    () =>
      startError && transcriptState.transcript
        ? failedSessionSnapshot(snapshot, session, transcriptState.transcript, startError, privateExternalSession)
        : snapshot,
    [privateExternalSession, session, snapshot, startError, transcriptState.transcript],
  );
  const terminalMarkdown = useMemo(
    () =>
      terminalPreviewMarkdown(previewSnapshot, {
        title: `${providerName(session.provider)} · ${session.projectName}`,
        scale,
        scrollOffset,
        fullWidth: !showControls,
      }),
    [previewSnapshot, scrollOffset, scale, session.projectName, session.provider, showControls],
  );
  const displayedMarkdown = terminalMarkdown;

  useEffect(() => {
    if (snapshot.status !== "idle") return;
    let active = true;
    void interactive.start().catch(async (error) => {
      if (!active) return;
      const message = error instanceof Error ? error.message : String(error);
      setStartError(message);
      await showToast({
        style: Toast.Style.Failure,
        title: `Could Not Start ${providerName(session.provider)}`,
        message,
      });
    });
    return () => {
      active = false;
    };
  }, [interactive.start, session.provider, snapshot.status]);

  useEffect(() => {
    interactive.resize(terminalDimensions.columns, terminalDimensions.rows);
  }, [interactive.resize, terminalDimensions.columns, terminalDimensions.rows]);

  const increaseText = () => {
    setScale((current) => Math.min(2, Number((current + 0.08).toFixed(2))));
    setScrollOffset(0);
  };
  const decreaseText = () => {
    setScale((current) => Math.max(0.65, Number((current - 0.08).toFixed(2))));
    setScrollOffset(0);
  };
  const resetText = () => {
    setScale(defaultTerminalScale);
    setScrollOffset(0);
  };
  const deleteComposerCharacter = () => {
    if (input.length > 0) {
      setInput((current) => Array.from(current).slice(0, -1).join(""));
      return;
    }
    if (isInteractive) interactive.sendKey("backspace");
    setScrollOffset(0);
  };
  const scrollUp = () => setScrollOffset((current) => current + pageRows);
  const scrollDown = () => setScrollOffset((current) => Math.max(0, current - pageRows));
  const jumpToBottom = () => setScrollOffset(0);
  const previousSentPrompt = () => {
    if (!isInteractive) return;
    interactive.sendKey("up");
    setScrollOffset(0);
  };
  const nextSentPrompt = () => {
    if (!isInteractive) return;
    interactive.sendKey("down");
    setScrollOffset(0);
  };

  const retrySharedConnection = async (openPreferredTerminal = false): Promise<boolean> => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Checking External Session…",
      message: "The previous CLI must be closed.",
    });
    setStartError(undefined);
    try {
      await interactive.start();
      setScrollOffset(0);
      toast.style = Toast.Style.Success;
      toast.title = "Shared Mode Started";
      toast.message = openPreferredTerminal
        ? `${"Also connecting"} ${terminalName}…`
        : "You can now write from Raycast.";
      if (openPreferredTerminal) await resumeSession(session);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStartError(message);
      toast.style = Toast.Style.Failure;
      toast.title = "The External CLI Is Still Open";
      toast.message = "Close it in the other application and try again.";
      return false;
    }
  };

  const retryInteractiveConnection = async (): Promise<boolean> => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Starting CLI…",
    });
    setStartError(undefined);
    try {
      await interactive.start();
      setScrollOffset(0);
      toast.style = Toast.Style.Success;
      toast.title = "CLI Started";
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStartError(message);
      toast.style = Toast.Style.Failure;
      toast.title = "Could Not Start The CLI";
      toast.message = message;
      return false;
    }
  };

  const sendCurrentInput = async () => {
    if (startError) {
      await showToast({
        style: Toast.Style.Failure,
        title: privateExternalSession ? "The Session Is Not Shared Yet" : "The CLI Is Not Running",
        message: privateExternalSession
          ? "Close the CLI in the other application and choose Start Shared Mode."
          : "Choose Retry Start from Actions.",
      });
      return;
    }
    const currentInput = input.trim();
    if (!currentInput) {
      if (isInteractive) {
        interactive.sendKey("enter");
        setScrollOffset(0);
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Write a message or /command to start",
        });
      }
      return;
    }
    const sent = await sendInput(session, snapshot, interactive.send, currentInput);
    if (!sent) return;
    setInput("");
    setScrollOffset(0);
  };

  if (!showControls) {
    return (
      <Detail
        navigationTitle={`${providerName(session.provider)} · ${session.projectName}`}
        isLoading={
          snapshot.status === "starting" ||
          Boolean(snapshot.operation) ||
          snapshot.historyLoading ||
          (Boolean(startError) && transcriptState.isLoading)
        }
        markdown={displayedMarkdown}
        actions={
          <ActionPanel>
            {privateExternalSession ? (
              <SharedSessionActions session={session} terminalName={terminalName} onRetry={retrySharedConnection} />
            ) : startError ? (
              <ActionPanel.Section title="CLI">
                <Action title={"Retry Start"} icon={Icon.ArrowClockwise} onAction={retryInteractiveConnection} />
              </ActionPanel.Section>
            ) : null}
            <ActionPanel.Section title={"Chat"}>
              <Action
                title={"Chat and Show Options"}
                icon={Icon.Message}
                onAction={() => setShowControls(true)}
                shortcut={shortcut("chat.toggle-view")}
              />
              <DeleteComposerAction onAction={deleteComposerCharacter} />
            </ActionPanel.Section>
            <ChatNavigationActions
              interactive={interactive}
              onScrollUp={scrollUp}
              onScrollDown={scrollDown}
              onJumpToBottom={jumpToBottom}
              onIncreaseText={increaseText}
              onDecreaseText={decreaseText}
              onResetText={resetText}
              onPreviousPrompt={isInteractive ? previousSentPrompt : undefined}
              onNextPrompt={isInteractive ? nextSentPrompt : undefined}
            />
            <ActionPanel.Section title={"Session"}>
              <Action
                title={`${"Open Or Connect In"} ${terminalName}`}
                icon={Icon.Terminal}
                onAction={() => resumeSession(session)}
                shortcut={shortcut("chat.open-external")}
              />
              <Action.Push
                title={"Change Model and Effort"}
                icon={Icon.Stars}
                target={
                  <ModelPicker session={session} codexRoot={codexRoot} onShowTerminal={() => setScrollOffset(0)} />
                }
                shortcut={shortcut("chat.change-model")}
              />
              {isInteractive ? (
                <Action
                  title={"End Live Chat"}
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  onAction={() => endInteractiveChat(interactive, pop)}
                  shortcut={shortcut("chat.end")}
                />
              ) : null}
              <Action.Push
                title={`${"Permissions"} · ${snapshot.permissionProfileTitle}`}
                icon={Icon.Lock}
                target={<PermissionPicker session={session} onShowTerminal={() => setScrollOffset(0)} />}
                shortcut={shortcut("chat.permissions")}
              />
            </ActionPanel.Section>
            <WorkspaceToolsActions
              session={session}
              codexRoot={codexRoot}
              terminalText={[previewSnapshot.historyOutput, previewSnapshot.output].filter(Boolean).join("\n\n")}
              onResetScroll={jumpToBottom}
            />
            {isInteractive ? <TerminalKeyActions interactive={interactive} /> : null}
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      navigationTitle={`Terminal · ${providerName(session.provider)}`}
      isShowingDetail
      filtering={false}
      searchText={input}
      onSearchTextChange={setInput}
      searchBarPlaceholder={`${"Write to"} ${providerName(session.provider)} ${"or use a /command…"}`}
      isLoading={snapshot.status === "starting" || Boolean(snapshot.operation)}
    >
      <List.Section
        title={`${providerName(session.provider)} · ${session.projectName}`}
        subtitle={
          previewSnapshot.historyLoading
            ? "Loading history…"
            : `${previewSnapshot.historyMessageCount || 0} ${"messages"}`
        }
      >
        <List.Item
          id="terminal-send"
          icon={providerIcon(session.provider)}
          title={startError ? (privateExternalSession ? "Start Shared Mode" : "Retry Start") : "Send"}
          accessories={[{ tag: "↵" }]}
          detail={<List.Item.Detail markdown={displayedMarkdown} />}
          actions={
            <ActionPanel>
              {privateExternalSession ? (
                <SharedSessionActions
                  session={session}
                  terminalName={terminalName}
                  onRetry={retrySharedConnection}
                  onShowTerminalOnly={() => setShowControls(false)}
                  onDelete={deleteComposerCharacter}
                />
              ) : startError ? (
                <ActionPanel.Section title="CLI">
                  <Action title={"Retry Start"} icon={Icon.ArrowClockwise} onAction={retryInteractiveConnection} />
                  <ShowOnlyTerminalAction onAction={() => setShowControls(false)} />
                  <DeleteComposerAction onAction={deleteComposerCharacter} />
                </ActionPanel.Section>
              ) : (
                <>
                  <ActionPanel.Section title={"Input"}>
                    <Action
                      title={input ? "Send Text and Enter" : "Send Enter"}
                      icon={Icon.ArrowRight}
                      onAction={sendCurrentInput}
                    />
                    <ShowOnlyTerminalAction onAction={() => setShowControls(false)} />
                    <DeleteComposerAction onAction={deleteComposerCharacter} />
                    {isInteractive ? (
                      <Action
                        title={"Paste Image from Clipboard"}
                        icon={Icon.Image}
                        onAction={() => pasteClipboardImage(interactive)}
                        shortcut={shortcut("chat.paste-image")}
                      />
                    ) : null}
                  </ActionPanel.Section>
                  <ActionPanel.Section title={"Chat Settings"}>
                    <Action.Push
                      title={"Open /Command Palette…"}
                      icon={Icon.List}
                      target={<SlashCommandPicker session={session} onShowTerminal={jumpToBottom} />}
                      shortcut={shortcut("chat.command-palette")}
                    />
                    <Action.Push
                      title={"Change Model and Effort…"}
                      icon={Icon.Stars}
                      target={<ModelPicker session={session} codexRoot={codexRoot} onShowTerminal={jumpToBottom} />}
                      shortcut={shortcut("chat.change-model")}
                    />
                    <Action.Push
                      title={`${"Permissions…"} · ${snapshot.permissionProfileTitle}`}
                      icon={Icon.Lock}
                      target={<PermissionPicker session={session} onShowTerminal={jumpToBottom} />}
                      shortcut={shortcut("chat.permissions")}
                    />
                  </ActionPanel.Section>
                </>
              )}
              <ChatNavigationActions
                interactive={interactive}
                onScrollUp={scrollUp}
                onScrollDown={scrollDown}
                onJumpToBottom={jumpToBottom}
                onIncreaseText={increaseText}
                onDecreaseText={decreaseText}
                onResetText={resetText}
                onPreviousPrompt={isInteractive ? previousSentPrompt : undefined}
                onNextPrompt={isInteractive ? nextSentPrompt : undefined}
              />
              <ActionPanel.Section title={"Session"}>
                <Action
                  title={`${"Open In"} ${terminalName} · ${"Shared"}`}
                  icon={Icon.Terminal}
                  onAction={() => resumeSession(session)}
                  shortcut={shortcut("chat.open-external")}
                />
                <Action
                  title={`${"Open Project In"} ${terminalName}`}
                  icon={Icon.Folder}
                  onAction={() => openProjectInTerminal(session.cwd)}
                />
                <Action.CopyToClipboard
                  title={"Copy Terminal Text"}
                  content={[previewSnapshot.historyOutput, previewSnapshot.output].filter(Boolean).join("\n\n")}
                />
                {isInteractive ? (
                  <Action
                    title={"End Live Chat"}
                    icon={Icon.XMarkCircle}
                    style={Action.Style.Destructive}
                    shortcut={shortcut("chat.end")}
                    onAction={() => endInteractiveChat(interactive, pop)}
                  />
                ) : null}
              </ActionPanel.Section>
              <WorkspaceToolsActions
                session={session}
                codexRoot={codexRoot}
                terminalText={[previewSnapshot.historyOutput, previewSnapshot.output].filter(Boolean).join("\n\n")}
                onResetScroll={jumpToBottom}
              />
              {isInteractive ? <TerminalKeyActions interactive={interactive} /> : null}
            </ActionPanel>
          }
        />
        <List.Item
          id="terminal-image"
          icon={Icon.Image}
          title={"Image"}
          accessories={[{ tag: shortcutLabel("chat.paste-image") }]}
          detail={<List.Item.Detail markdown={displayedMarkdown} />}
          actions={
            <ActionPanel>
              <Action
                title={"Paste Image from Clipboard"}
                icon={Icon.Image}
                onAction={() => pasteClipboardImage(interactive)}
                shortcut={shortcut("chat.paste-image")}
              />
              <ShowOnlyTerminalAction onAction={() => setShowControls(false)} />
              <DeleteComposerAction onAction={deleteComposerCharacter} />
              <Action title={"Send Input"} icon={Icon.ArrowRight} onAction={sendCurrentInput} />
              <ChatNavigationActions
                interactive={interactive}
                onScrollUp={scrollUp}
                onScrollDown={scrollDown}
                onJumpToBottom={jumpToBottom}
                onIncreaseText={increaseText}
                onDecreaseText={decreaseText}
                onResetText={resetText}
                onPreviousPrompt={isInteractive ? previousSentPrompt : undefined}
                onNextPrompt={isInteractive ? nextSentPrompt : undefined}
              />
            </ActionPanel>
          }
        />
        <List.Item
          id="terminal-permissions"
          icon={Icon.Lock}
          title={"Permissions"}
          accessories={[{ tag: shortcutLabel("chat.permissions") }]}
          detail={<List.Item.Detail markdown={displayedMarkdown} />}
          actions={
            <ActionPanel>
              <Action.Push
                title={"Change Permissions"}
                icon={Icon.Lock}
                target={<PermissionPicker session={session} onShowTerminal={() => setScrollOffset(0)} />}
                shortcut={shortcut("chat.permissions")}
              />
              <ShowOnlyTerminalAction onAction={() => setShowControls(false)} />
              <DeleteComposerAction onAction={deleteComposerCharacter} />
              <Action title={"Send Input"} icon={Icon.ArrowRight} onAction={sendCurrentInput} />
              <ChatNavigationActions
                interactive={interactive}
                onScrollUp={scrollUp}
                onScrollDown={scrollDown}
                onJumpToBottom={jumpToBottom}
                onIncreaseText={increaseText}
                onDecreaseText={decreaseText}
                onResetText={resetText}
                onPreviousPrompt={isInteractive ? previousSentPrompt : undefined}
                onNextPrompt={isInteractive ? nextSentPrompt : undefined}
              />
            </ActionPanel>
          }
        />
        <List.Item
          id="terminal-commands"
          icon={Icon.Terminal}
          title={"Commands"}
          accessories={[{ tag: shortcutLabel("chat.command-palette") }]}
          detail={<List.Item.Detail markdown={displayedMarkdown} />}
          actions={
            <ActionPanel>
              <Action.Push
                title={"Open /Command Palette"}
                icon={Icon.List}
                target={<SlashCommandPicker session={session} onShowTerminal={() => setScrollOffset(0)} />}
                shortcut={shortcut("chat.command-palette")}
              />
              <ShowOnlyTerminalAction onAction={() => setShowControls(false)} />
              <DeleteComposerAction onAction={deleteComposerCharacter} />
              <Action title={"Send Input"} icon={Icon.ArrowRight} onAction={sendCurrentInput} />
              <ChatNavigationActions
                interactive={interactive}
                onScrollUp={scrollUp}
                onScrollDown={scrollDown}
                onJumpToBottom={jumpToBottom}
                onIncreaseText={increaseText}
                onDecreaseText={decreaseText}
                onResetText={resetText}
                onPreviousPrompt={isInteractive ? previousSentPrompt : undefined}
                onNextPrompt={isInteractive ? nextSentPrompt : undefined}
              />
            </ActionPanel>
          }
        />
        <List.Item
          id="terminal-usage"
          icon={Icon.Gauge}
          title={"Usage"}
          accessories={[{ tag: shortcutLabel("chat.usage") }]}
          detail={<List.Item.Detail markdown={displayedMarkdown} />}
          actions={
            <ActionPanel>
              <Action.Push
                title={"View Claude and Codex Usage"}
                icon={Icon.Gauge}
                target={<UsageDashboard />}
                shortcut={shortcut("chat.usage")}
              />
              <ShowOnlyTerminalAction onAction={() => setShowControls(false)} />
              <DeleteComposerAction onAction={deleteComposerCharacter} />
              <Action title={"Send Input"} icon={Icon.ArrowRight} onAction={sendCurrentInput} />
              <ChatNavigationActions
                interactive={interactive}
                onScrollUp={scrollUp}
                onScrollDown={scrollDown}
                onJumpToBottom={jumpToBottom}
                onIncreaseText={increaseText}
                onDecreaseText={decreaseText}
                onResetText={resetText}
                onPreviousPrompt={isInteractive ? previousSentPrompt : undefined}
                onNextPrompt={isInteractive ? nextSentPrompt : undefined}
              />
            </ActionPanel>
          }
        />
        <List.Item
          id="terminal-extras"
          icon={Icon.CircleEllipsis}
          title={"Extras"}
          detail={<List.Item.Detail markdown={displayedMarkdown} />}
          actions={
            <ActionPanel>
              <Action.Push
                title={"Open Extras"}
                icon={Icon.CircleEllipsis}
                target={
                  <ConversationExtras
                    session={session}
                    codexRoot={codexRoot}
                    terminalText={[previewSnapshot.historyOutput, previewSnapshot.output].filter(Boolean).join("\n\n")}
                    onResetScroll={jumpToBottom}
                  />
                }
              />
              <ShowOnlyTerminalAction onAction={() => setShowControls(false)} />
              <DeleteComposerAction onAction={deleteComposerCharacter} />
              <Action title={"Send Input"} icon={Icon.ArrowRight} onAction={sendCurrentInput} />
              <ChatNavigationActions
                interactive={interactive}
                onScrollUp={scrollUp}
                onScrollDown={scrollDown}
                onJumpToBottom={jumpToBottom}
                onIncreaseText={increaseText}
                onDecreaseText={decreaseText}
                onResetText={resetText}
                onPreviousPrompt={isInteractive ? previousSentPrompt : undefined}
                onNextPrompt={isInteractive ? nextSentPrompt : undefined}
              />
            </ActionPanel>
          }
        />
        <List.Item
          id="terminal-open"
          icon={{ fileIcon: preferredTerminal.path }}
          title={`${"Open in"} ${terminalName}`}
          accessories={[{ tag: shortcutLabel("chat.open-external") }]}
          detail={<List.Item.Detail markdown={displayedMarkdown} />}
          actions={
            <ActionPanel>
              <Action
                title={`${"Open Shared Chat in"} ${terminalName}`}
                icon={{ fileIcon: preferredTerminal.path }}
                onAction={() => resumeSession(session)}
                shortcut={shortcut("chat.open-external")}
              />
              <Action
                title={`${"Open Project in"} ${terminalName}`}
                icon={Icon.Folder}
                onAction={() => openProjectInTerminal(session.cwd)}
              />
              <ShowOnlyTerminalAction onAction={() => setShowControls(false)} />
              <DeleteComposerAction onAction={deleteComposerCharacter} />
              <Action title={"Send Input"} icon={Icon.ArrowRight} onAction={sendCurrentInput} />
              <ChatNavigationActions
                interactive={interactive}
                onScrollUp={scrollUp}
                onScrollDown={scrollDown}
                onJumpToBottom={jumpToBottom}
                onIncreaseText={increaseText}
                onDecreaseText={decreaseText}
                onResetText={resetText}
                onPreviousPrompt={isInteractive ? previousSentPrompt : undefined}
                onNextPrompt={isInteractive ? nextSentPrompt : undefined}
              />
            </ActionPanel>
          }
        />
        <List.Item
          id="terminal-close"
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          title={"End"}
          accessories={[{ tag: shortcutLabel("chat.end") }]}
          detail={<List.Item.Detail markdown={displayedMarkdown} />}
          actions={
            <ActionPanel>
              <Action
                title={"End Live Chat"}
                icon={Icon.XMarkCircle}
                style={Action.Style.Destructive}
                onAction={() => endInteractiveChat(interactive, pop)}
                shortcut={shortcut("chat.end")}
              />
              <ShowOnlyTerminalAction onAction={() => setShowControls(false)} />
              <DeleteComposerAction onAction={deleteComposerCharacter} />
              <ChatNavigationActions
                interactive={interactive}
                onScrollUp={scrollUp}
                onScrollDown={scrollDown}
                onJumpToBottom={jumpToBottom}
                onIncreaseText={increaseText}
                onDecreaseText={decreaseText}
                onResetText={resetText}
                onPreviousPrompt={isInteractive ? previousSentPrompt : undefined}
                onNextPrompt={isInteractive ? nextSentPrompt : undefined}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function ConversationExtras({
  session,
  codexRoot,
  terminalText,
  onResetScroll,
}: {
  session: ChatSession;
  codexRoot: string;
  terminalText: string;
  onResetScroll: () => void;
}) {
  const preferredTerminal = usePreferredTerminalApplication();
  const terminalName = preferredTerminalName(preferredTerminal);

  return (
    <List navigationTitle={"Extras"} searchBarPlaceholder={"Search extras…"}>
      <List.Section title={"Configuration"}>
        <List.Item
          id="extras-shortcuts"
          icon={Icon.Keyboard}
          title={"Keyboard Shortcuts"}
          accessories={[{ tag: "Customizable" }]}
          actions={
            <ActionPanel>
              <Action.Push title={"Configure Keyboard Shortcuts"} icon={Icon.Keyboard} target={<ShortcutSettings />} />
            </ActionPanel>
          }
        />
        <List.Item
          id="extras-model"
          icon={Icon.Stars}
          title={"Model, Effort, and Fast Mode"}
          accessories={[{ tag: shortcutLabel("chat.change-model") }]}
          actions={
            <ActionPanel>
              <Action.Push
                title={"Choose Model and Effort…"}
                icon={Icon.Stars}
                target={<ModelPicker session={session} codexRoot={codexRoot} onShowTerminal={onResetScroll} />}
              />
            </ActionPanel>
          }
        />
        <List.Item
          id="extras-startup-settings"
          icon={Icon.Gear}
          title={"Startup Settings"}
          accessories={[{ tag: "Next start" }]}
          actions={
            <ActionPanel>
              <Action.Push
                title={"Configure Next Start…"}
                icon={Icon.Gear}
                target={
                  <StartupConfiguration
                    session={session}
                    codexRoot={codexRoot}
                    submitTitle={"Save Startup Settings"}
                    saveForNextRun
                  />
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          id="extras-terminal-application"
          icon={Icon.AppWindowList}
          title={"Terminal or Editor"}
          accessories={[{ tag: terminalName }]}
          actions={
            <ActionPanel>
              <Action.Push
                title={"Choose Terminal or Editor"}
                icon={Icon.AppWindowList}
                target={<PreferredTerminalPicker />}
              />
              <Action title={"Open Extension Preferences"} icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title={"Project"}>
        <List.Item
          id="extras-integrations"
          icon={Icon.Network}
          title={"MCPs and Skills"}
          actions={
            <ActionPanel>
              <Action.Push
                title={"Manage Project MCPs…"}
                icon={Icon.Network}
                target={<McpManager workingDirectory={session.cwd} initialProvider={session.provider} />}
              />
              <Action.Push
                title={"Manage Project Skills…"}
                icon={Icon.Book}
                target={<SkillsManager workingDirectory={session.cwd} initialProvider={session.provider} />}
              />
            </ActionPanel>
          }
        />
        <List.Item
          id="extras-open-session"
          icon={Icon.Terminal}
          title={`${"Open or Connect in"} ${terminalName}`}
          actions={
            <ActionPanel>
              <Action
                title={`${"Open Shared Chat in"} ${terminalName}`}
                icon={Icon.Terminal}
                onAction={() => resumeSession(session)}
              />
              <Action
                title={`${"Open Project in"} ${terminalName}`}
                icon={Icon.Folder}
                onAction={() => openProjectInTerminal(session.cwd)}
              />
              <Action.CopyToClipboard title={"Copy Terminal Text"} content={terminalText} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function PreferredTerminalPicker() {
  const { pop } = useNavigation();
  const preferredTerminal = usePreferredTerminalApplication();
  const selectedId = terminalApplicationId(preferredTerminal);
  const applications = installedTerminalApplications();

  const selectApplication = async (application: (typeof applications)[number]) => {
    selectPreferredTerminalApplication(application);
    await showToast({
      style: Toast.Style.Success,
      title: "Terminal or Editor Updated",
      message: preferredTerminalName(application),
    });
    pop();
  };

  return (
    <List navigationTitle={"Terminal or Editor"} searchBarPlaceholder={"Search installed compatible apps…"}>
      <List.Section title={"Installed and Supported"}>
        {applications.map((application) => {
          const applicationId = terminalApplicationId(application);
          return (
            <List.Item
              key={applicationId}
              id={applicationId}
              icon={{ fileIcon: application.path }}
              title={preferredTerminalName(application)}
              accessories={
                applicationId === selectedId
                  ? [
                      {
                        icon: Icon.CheckCircle,
                        tooltip: "Selected",
                      },
                    ]
                  : []
              }
              actions={
                <ActionPanel>
                  <Action
                    title={`${"Use"} ${preferredTerminalName(application)}`}
                    icon={Icon.CheckCircle}
                    onAction={() => selectApplication(application)}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
function WorkspaceToolsActions({
  session,
  codexRoot,
  terminalText,
  onResetScroll,
}: {
  session: ChatSession;
  codexRoot: string;
  terminalText: string;
  onResetScroll: () => void;
}) {
  return (
    <ActionPanel.Section title={"Tools"}>
      <Action.Push
        title={"View Claude and Codex Usage…"}
        icon={Icon.Gauge}
        target={<UsageDashboard />}
        shortcut={shortcut("chat.usage")}
      />
      <Action.Push
        title={"Open Extras…"}
        icon={Icon.CircleEllipsis}
        target={
          <ConversationExtras
            session={session}
            codexRoot={codexRoot}
            terminalText={terminalText}
            onResetScroll={onResetScroll}
          />
        }
      />
      <Action.Push title={"Configure Keyboard Shortcuts…"} icon={Icon.Keyboard} target={<ShortcutSettings />} />
      <Action.Push
        title={"Shortcuts and Usage Guide…"}
        icon={Icon.QuestionMark}
        target={<ShortcutGuide provider={session.provider} />}
        shortcut={shortcut("chat.guide")}
      />
    </ActionPanel.Section>
  );
}

function failedSessionSnapshot(
  snapshot: InteractiveSnapshot,
  session: ChatSession,
  transcript: Transcript,
  error: string,
  privateExternalSession: boolean,
): InteractiveSnapshot {
  return {
    ...snapshot,
    status: "idle",
    output: privateExternalSession
      ? [
          "EXTERNAL SESSION · LIVE READ ONLY",
          "The CLI is still open in another application.",
          "Close that CLI, then choose Start Shared Mode from Actions.",
        ].join("\n")
      : ["THE CLI COULD NOT START", error, "Choose Retry Start from Actions."].join("\n"),
    historyOutput: transcriptTerminalOutput(session, transcript),
    historyMessageCount: transcript.messages.length,
    historyLoading: false,
    terminalLines: undefined,
    terminalCursor: undefined,
  };
}

function isPrivateExternalSessionError(error: string | undefined): boolean {
  return Boolean(error && /private PTY|open in another application|external session/iu.test(error));
}

function transcriptTerminalOutput(session: ChatSession, transcript: Transcript): string {
  if (transcript.messages.length === 0) return "";
  const assistantName = providerName(session.provider);
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return transcript.messages
    .map((message) => {
      const author = message.role === "user" ? `❯ ${"You"}` : `✦ ${assistantName}`;
      const timestamp = message.timestamp ? ` · ${dateFormatter.format(new Date(message.timestamp))}` : "";
      return `${author}${timestamp}\n${message.content.trim()}`;
    })
    .join("\n\n");
}

function SharedSessionActions({
  session,
  terminalName,
  onRetry,
  onShowTerminalOnly,
  onDelete,
}: {
  session: ChatSession;
  terminalName: string;
  onRetry: (openPreferredTerminal?: boolean) => Promise<boolean>;
  onShowTerminalOnly?: () => void;
  onDelete?: () => void;
}) {
  return (
    <ActionPanel.Section title={"Shared Mode"}>
      <Action title={"Start Shared Mode"} icon={Icon.Link} onAction={() => onRetry(false)} />
      {onShowTerminalOnly ? <ShowOnlyTerminalAction onAction={onShowTerminalOnly} /> : null}
      {onDelete ? <DeleteComposerAction onAction={onDelete} /> : null}
      <Action title={`${"Start And Open In"} ${terminalName}`} icon={Icon.Terminal} onAction={() => onRetry(true)} />
      <Action.Push
        title={"How to Migrate This Session"}
        icon={Icon.QuestionMark}
        target={<SharedSessionGuide session={session} terminalName={terminalName} onRetry={onRetry} />}
      />
    </ActionPanel.Section>
  );
}

function SharedSessionGuide({
  session,
  terminalName,
  onRetry,
}: {
  session: ChatSession;
  terminalName: string;
  onRetry: (openPreferredTerminal?: boolean) => Promise<boolean>;
}) {
  const { pop } = useNavigation();
  const retry = async (openPreferredTerminal: boolean) => {
    if (await onRetry(openPreferredTerminal)) pop();
  };
  const provider = providerName(session.provider);
  return (
    <Detail
      navigationTitle={"Migrate To Shared Mode"}
      markdown={[
        `# Share ${provider} Between Raycast And ${terminalName}`,
        "",
        `1. In the other application, exit only the ${provider} CLI with \`/exit\` or \`Ctrl-C\`. You do not need to close the project or editor.`,
        "2. Return to Raycast and choose **Start shared mode**.",
        `3. To see the same TUI in ${terminalName}, choose **Start and open**. Zed reuses its existing window, switches it to the selected project without merging it into the current worktree, and runs the shared command in a Terminal Thread. macOS may ask for Accessibility permission the first time; if automation is unavailable, the command remains copied for manual paste.`,
        "",
        "> The extension will not start a second resume process while the private CLI is active because concurrent writers could damage the history.",
      ].join("\n")}
      actions={
        <ActionPanel>
          <Action title={"Start Shared Mode"} icon={Icon.Link} onAction={() => retry(false)} />
          <Action title={`${"Start And Open In"} ${terminalName}`} icon={Icon.Terminal} onAction={() => retry(true)} />
        </ActionPanel>
      }
    />
  );
}

function ShowOnlyTerminalAction({ onAction }: { onAction: () => void }) {
  return (
    <Action
      title={"Show Terminal Only"}
      icon={Icon.Terminal}
      onAction={onAction}
      shortcut={shortcut("chat.toggle-view")}
    />
  );
}

function DeleteComposerAction({ onAction }: { onAction: () => void }) {
  return (
    <Action
      title={"Delete Last Character or Attachment"}
      icon={Icon.DeleteDocument}
      onAction={onAction}
      shortcut={shortcut("chat.delete-input")}
    />
  );
}

function ChatNavigationActions({
  interactive,
  onScrollUp,
  onScrollDown,
  onJumpToBottom,
  onIncreaseText,
  onDecreaseText,
  onResetText,
  onPreviousPrompt,
  onNextPrompt,
}: {
  interactive: ReturnType<typeof useInteractiveSession>;
  onScrollUp: () => void;
  onScrollDown: () => void;
  onJumpToBottom: () => void;
  onIncreaseText: () => void;
  onDecreaseText: () => void;
  onResetText: () => void;
  onPreviousPrompt?: () => void;
  onNextPrompt?: () => void;
}) {
  return (
    <>
      <ActionPanel.Section title={"Navigation"}>
        <Action
          title={"Scroll Chat up"}
          icon={Icon.ArrowUp}
          onAction={onScrollUp}
          shortcut={shortcut("chat.scroll-up")}
        />
        <Action
          title={"Scroll Chat Down"}
          icon={Icon.ArrowDown}
          onAction={onScrollDown}
          shortcut={shortcut("chat.scroll-down")}
        />
        {onPreviousPrompt ? (
          <Action
            title={"Previous Sent Prompt"}
            icon={Icon.ArrowLeft}
            onAction={onPreviousPrompt}
            shortcut={shortcut("chat.previous-prompt")}
          />
        ) : null}
        {onNextPrompt ? (
          <Action
            title={"Next Sent Prompt"}
            icon={Icon.ArrowRight}
            onAction={onNextPrompt}
            shortcut={shortcut("chat.next-prompt")}
          />
        ) : null}
        <Action title={"Jump to Latest Output"} icon={Icon.ChevronDown} onAction={onJumpToBottom} />
        <Action
          title={"Send Escape"}
          icon={Icon.XMarkCircle}
          onAction={() => interactive.sendKey("escape")}
          shortcut={shortcut("terminal.escape")}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title={"Appearance"}>
        <Action
          title={"Increase Text Size"}
          icon={Icon.Plus}
          onAction={onIncreaseText}
          shortcut={shortcut("chat.zoom-in")}
        />
        <Action
          title={"Decrease Text Size"}
          icon={Icon.Minus}
          onAction={onDecreaseText}
          shortcut={shortcut("chat.zoom-out")}
        />
        <Action title={"Reset Size"} icon={Icon.Repeat} onAction={onResetText} shortcut={shortcut("chat.zoom-reset")} />
      </ActionPanel.Section>
    </>
  );
}

function TerminalKeyActions({ interactive }: { interactive: ReturnType<typeof useInteractiveSession> }) {
  return (
    <ActionPanel.Section title={"Advanced"}>
      <ActionPanel.Submenu title={"Terminal Keys…"} icon={Icon.Keyboard}>
        <ActionPanel.Section title={"Selector"}>
          <Action
            title={"Up"}
            icon={Icon.ArrowUp}
            onAction={() => interactive.sendKey("up")}
            shortcut={shortcut("terminal.up")}
          />
          <Action
            title={"Down"}
            icon={Icon.ArrowDown}
            onAction={() => interactive.sendKey("down")}
            shortcut={shortcut("terminal.down")}
          />
          <Action
            title={"Left"}
            icon={Icon.ArrowLeft}
            onAction={() => interactive.sendKey("left")}
            shortcut={shortcut("terminal.left")}
          />
          <Action
            title={"Right"}
            icon={Icon.ArrowRight}
            onAction={() => interactive.sendKey("right")}
            shortcut={shortcut("terminal.right")}
          />
          <Action
            title={"Confirm"}
            icon={Icon.Check}
            onAction={() => interactive.sendKey("enter")}
            shortcut={shortcut("terminal.enter")}
          />
        </ActionPanel.Section>
        <ActionPanel.Section title={"Process"}>
          <Action
            title={"Send Tab"}
            icon={Icon.ArrowRight}
            onAction={() => interactive.sendKey("tab")}
            shortcut={shortcut("terminal.tab")}
          />
          <Action
            title="Send Ctrl-C"
            icon={Icon.Stop}
            onAction={() => interactive.sendKey("ctrl-c")}
            shortcut={shortcut("terminal.ctrl-c")}
          />
          <Action
            title="Send Ctrl-D"
            icon={Icon.Eject}
            onAction={() => interactive.sendKey("ctrl-d")}
            shortcut={shortcut("terminal.ctrl-d")}
          />
        </ActionPanel.Section>
      </ActionPanel.Submenu>
    </ActionPanel.Section>
  );
}

async function endInteractiveChat(
  interactive: ReturnType<typeof useInteractiveSession>,
  onEnded: () => void,
): Promise<void> {
  const confirmed = await confirmAlert({
    icon: Icon.XMarkCircle,
    title: "End Live Chat",
    message: "The extension will send /exit and close the shared process if the CLI does not exit cleanly.",
    primaryAction: {
      title: "End Chat",
      style: Alert.ActionStyle.Destructive,
    },
  });
  if (!confirmed) return;

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Ending Live Chat…",
  });
  try {
    await interactive.stop();
    toast.style = Toast.Style.Success;
    toast.title = "Live Chat Ended";
    onEnded();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could Not End The Chat";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

async function toggleFastMode(interactive: ReturnType<typeof useInteractiveSession>): Promise<void> {
  const enabling = !interactive.snapshot.fastMode;
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: enabling ? "Turning On Fast Mode…" : "Turning Off Fast Mode…",
  });
  try {
    await interactive.toggleFast();
    toast.style = Toast.Style.Success;
    toast.title = enabling ? "Fast Mode On" : "Fast Mode Off";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could Not Change Fast Mode";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

function ModelPicker({
  session,
  codexRoot,
  onShowTerminal,
}: {
  session: ChatSession;
  codexRoot: string;
  onShowTerminal: () => void;
}) {
  const { pop } = useNavigation();
  const interactive = useInteractiveSession(session);
  const models = useMemo(() => loadModelOptions(session, codexRoot), [codexRoot, session]);
  const activeModel = interactive.snapshot.activeModel || session.model;
  const selectedModel = models.find((model) => model.id === activeModel);
  const fastModeSupported = Boolean(selectedModel?.supportsFast);
  const [effort, setEffort] = useState(
    () => interactive.snapshot.reasoningEffort || selectedModel?.defaultEffort || "high",
  );
  const availableModels = models.filter((model) => model.supportedEfforts.includes(effort));

  const selectModel = async (model: CliModelOption) => {
    if (!(await confirmInteractiveStart(session, interactive.snapshot))) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `${"Changing To"} ${model.title}`,
      message: `${"Effort"} ${effortTitle(effort).toLowerCase()}`,
    });
    try {
      await interactive.changeModel({
        modelId: model.id,
        effort,
        selectorIndex: model.selectorIndex,
        supportedEfforts: model.supportedEfforts,
      });
      toast.style = Toast.Style.Success;
      toast.title = `${"Model Changed To"} ${model.title}`;
      toast.message = `${"Effort"} ${effortTitle(effort).toLowerCase()}`;
      onShowTerminal();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could Not Complete The Selector";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  };

  const openManualSelector = async () => {
    const sent = await sendInput(session, interactive.snapshot, interactive.send, "/model");
    if (sent) {
      onShowTerminal();
      pop();
    }
  };

  return (
    <List
      navigationTitle={`${"Model For"} ${providerName(session.provider)}`}
      searchBarPlaceholder={"Search models…"}
      isLoading={Boolean(interactive.snapshot.operation)}
      searchBarAccessory={
        <List.Dropdown value={effort} tooltip={"Reasoning effort"} onChange={setEffort}>
          {modelEfforts(session.provider).map((effortOption) => (
            <List.Dropdown.Item key={effortOption} title={effortTitle(effortOption)} value={effortOption} />
          ))}
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action title={"Open Manual Model Selector"} icon={Icon.Terminal} onAction={openManualSelector} />
        </ActionPanel>
      }
    >
      {session.provider === "codex" ? (
        <List.Section title={"Speed"} subtitle="Codex">
          <List.Item
            id="codex-fast-mode"
            icon={Icon.Bolt}
            title="Fast Mode"
            subtitle={fastModeSupported ? "Faster inference with higher plan usage" : "Select a compatible model first"}
            accessories={[
              {
                tag: {
                  value: fastModeSupported ? (interactive.snapshot.fastMode ? "ON" : "OFF") : "UNAVAILABLE",
                  color: interactive.snapshot.fastMode
                    ? Color.Green
                    : fastModeSupported
                      ? Color.SecondaryText
                      : Color.Orange,
                },
              },
            ]}
            actions={
              fastModeSupported ? (
                <ActionPanel>
                  <Action
                    title={interactive.snapshot.fastMode ? "Turn off Fast Mode" : "Turn on Fast Mode"}
                    icon={Icon.Bolt}
                    onAction={() => toggleFastMode(interactive)}
                  />
                </ActionPanel>
              ) : undefined
            }
          />
        </List.Section>
      ) : null}
      {availableModels.length === 0 ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title={"No Models Support This Effort"}
          description={"Choose another effort level or open the CLI's manual selector."}
          actions={
            <ActionPanel>
              <Action title={"Open Manual Model Selector"} icon={Icon.Terminal} onAction={openManualSelector} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title={`${"Effort"}: ${effortTitle(effort)}`} subtitle={`${availableModels.length} ${"models"}`}>
          {availableModels.map((model) => (
            <List.Item
              key={model.id}
              icon={providerIcon(session.provider)}
              title={model.title}
              subtitle={model.description}
              keywords={[model.id, effort, effortTitle(effort)]}
              accessories={[
                ...(model.id === activeModel
                  ? [
                      {
                        icon: Icon.Check,
                        tooltip: "Active model",
                      },
                    ]
                  : []),
                { text: model.id },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title={`${"Use"} ${model.title} · ${effortTitle(effort)}`}
                    icon={Icon.Stars}
                    onAction={() => selectModel(model)}
                  />
                  <Action title={"Open Manual Model Selector"} icon={Icon.Terminal} onAction={openManualSelector} />
                  <Action.CopyToClipboard title={"Copy Model ID"} content={model.id} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function PermissionPicker({ session, onShowTerminal }: { session: ChatSession; onShowTerminal?: () => void }) {
  const { pop } = useNavigation();
  const interactive = useInteractiveSession(session);
  const profiles = permissionProfiles(session.provider);
  const isInteractive = interactive.snapshot.status === "running" || interactive.snapshot.status === "starting";

  const openNativeSelector = async () => {
    const sent = await sendInput(session, interactive.snapshot, interactive.send, "/permissions");
    if (!sent) return;
    onShowTerminal?.();
    pop();
  };

  const selectProfile = async (profile: PermissionProfile) => {
    if (profile.dangerous) {
      const confirmed = await confirmAlert({
        icon: Icon.Warning,
        title: `${"Use"} ${profile.title}`,
        message: `${profile.description}\n\n${"The CLI will be able to run commands and modify files with reduced or no safeguards."}`,
        primaryAction: {
          title: "Use Profile",
          style: Alert.ActionStyle.Destructive,
        },
      });
      if (!confirmed) return;
    }
    try {
      interactive.configurePermissions(profile.id);
      await showToast({
        style: Toast.Style.Success,
        title: `${"Permissions"}: ${profile.title}`,
        message: "They will apply the next time this conversation starts.",
      });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Change The Profile",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <List
      navigationTitle={`${"Permissions For"} ${providerName(session.provider)}`}
      searchBarPlaceholder={"Search permission profiles…"}
      selectedItemId={isInteractive ? "native-permissions" : interactive.snapshot.permissionProfileId}
    >
      {isInteractive ? (
        <List.Section title={"Live Session"} subtitle={interactive.snapshot.permissionProfileTitle}>
          <List.Item
            id="native-permissions"
            icon={Icon.Lock}
            title={"Open /permissions In The CLI"}
            subtitle={"Change permissions for the session that is already running"}
            accessories={[{ tag: { value: "Live", color: Color.Green } }]}
            actions={
              <ActionPanel>
                <Action title={"Open Native Selector"} icon={Icon.Terminal} onAction={openNativeSelector} />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : (
        <List.Section title={"Startup Profile"} subtitle={`${profiles.length} ${"options"}`}>
          {profiles.map((profile) => (
            <List.Item
              key={profile.id}
              id={profile.id}
              icon={profile.dangerous ? Icon.Warning : Icon.Lock}
              title={profile.title}
              subtitle={profile.description}
              accessories={[
                ...(profile.id === interactive.snapshot.permissionProfileId
                  ? [
                      {
                        icon: Icon.Check,
                        tooltip: "Selected profile",
                      },
                    ]
                  : []),
                ...(profile.dangerous
                  ? [
                      {
                        tag: {
                          value: "Unrestricted",
                          color: Color.Red,
                        },
                      },
                    ]
                  : []),
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title={`${"Use"} ${profile.title}`}
                    icon={profile.dangerous ? Icon.Warning : Icon.Lock}
                    style={profile.dangerous ? Action.Style.Destructive : Action.Style.Regular}
                    onAction={() => selectProfile(profile)}
                  />
                  <Action
                    title={"Open Native /Permissions Selector"}
                    icon={Icon.Terminal}
                    onAction={openNativeSelector}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function SlashCommandPicker({ session, onShowTerminal }: { session: ChatSession; onShowTerminal: () => void }) {
  const { pop } = useNavigation();
  const interactive = useInteractiveSession(session);
  const commands = slashCommands(session.provider);
  const categories: SlashCommandOption["category"][] = ["Session", "Workflow", "Tools", "Configuration"];

  const execute = async (command: SlashCommandOption) => {
    if (command.destructive) {
      const confirmed = await confirmAlert({
        title: `${"Run"} ${command.command}`,
        message: command.description,
        primaryAction: {
          title: "Run",
          style: Alert.ActionStyle.Destructive,
        },
      });
      if (!confirmed) return;
    }
    const sent = await sendInput(session, interactive.snapshot, interactive.send, command.command);
    if (sent) {
      onShowTerminal();
      pop();
    }
  };

  return (
    <List
      navigationTitle={`/${providerName(session.provider)}`}
      searchBarPlaceholder={"Search /commands by name or function…"}
    >
      {categories.map((category) => {
        const categoryCommands = commands.filter((command) => command.category === category);
        return (
          <List.Section key={category} title={slashCategoryTitle(category)} subtitle={`${categoryCommands.length}`}>
            {categoryCommands.map((command) => (
              <List.Item
                key={command.command}
                icon={command.opensSelector ? Icon.List : Icon.Terminal}
                title={command.command}
                subtitle={command.title}
                accessories={[{ text: command.description }]}
                keywords={[command.title, command.description, command.argumentHint || ""]}
                actions={
                  <ActionPanel>
                    {command.argumentHint ? (
                      <Action.Push
                        title={`${"Complete"} ${command.command}`}
                        icon={Icon.TextCursor}
                        target={
                          <CommandInputForm
                            session={session}
                            initialInput={`${command.command} `}
                            onSent={onShowTerminal}
                          />
                        }
                      />
                    ) : (
                      <Action
                        title={`${"Run"} ${command.command}`}
                        icon={command.opensSelector ? Icon.List : Icon.Terminal}
                        style={command.destructive ? Action.Style.Destructive : Action.Style.Regular}
                        onAction={() => execute(command)}
                      />
                    )}
                    {command.argumentHint ? (
                      <Action
                        title={`${"Run"} ${command.command} ${"Without Arguments"}`}
                        onAction={() => execute(command)}
                      />
                    ) : (
                      <Action.Push
                        title={"Edit Before Sending"}
                        icon={Icon.TextCursor}
                        target={
                          <CommandInputForm
                            session={session}
                            initialInput={`${command.command} `}
                            onSent={onShowTerminal}
                          />
                        }
                      />
                    )}
                    <Action.CopyToClipboard title={"Copy /Command"} content={command.command} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}

function slashCategoryTitle(category: SlashCommandOption["category"]): string {
  return category;
}

function CommandInputForm({
  session,
  initialInput,
  onSent,
}: {
  session: ChatSession;
  initialInput: string;
  onSent: () => void;
}) {
  const { pop } = useNavigation();
  const interactive = useInteractiveSession(session);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async ({ input }: { input: string }) => {
    const normalizedInput = input.trim();
    if (!normalizedInput) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Enter a /command",
      });
      return;
    }

    setIsSubmitting(true);
    const sent = await sendInput(session, interactive.snapshot, interactive.send, normalizedInput);
    if (!sent) {
      setIsSubmitting(false);
      return;
    }
    onSent();
    pop();
  };

  return (
    <Form
      navigationTitle={`${"Complete /command"} · ${providerName(session.provider)}`}
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={"Send /Command"} icon={Icon.ArrowRight} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="input"
        title={"Command"}
        placeholder={"Add arguments on one line"}
        defaultValue={initialInput}
        autoFocus
      />
    </Form>
  );
}

function ShortcutGuide({ provider }: { provider: ChatSession["provider"] }) {
  useShortcutStore();
  const preferredTerminal = usePreferredTerminalApplication();
  const terminalName = preferredTerminalName(preferredTerminal);
  const shortcutSections = ["Chat", "Terminal Keys", "Conversation List", "Managers"].flatMap((section) => [
    `## ${section}`,
    "",
    "| Shortcut | Action | Description |",
    "| --- | --- | --- |",
    ...shortcutDefinitions
      .filter((definition) => definition.section === section)
      .map((definition) => `| \`${shortcutLabel(definition.id)}\` | ${definition.title} | ${definition.description} |`),
    "",
  ]);
  const markdown = [
    `# Shortcuts · ${providerName(provider)}`,
    "",
    "Every PromptCast-defined shortcut can be changed from **Extras → Keyboard Shortcuts**. Disabled actions remain available in the Action Panel.",
    "",
    ...shortcutSections,
    "## Raycast Native Shortcuts",
    "",
    "| Shortcut | Action |",
    "| --- | --- |",
    "| `↵` | Run the primary action or send the top-bar text |",
    "| `⌘K` | Open the Raycast Action Panel |",
    "",
    "Raycast owns these two shortcuts, so extensions cannot override them.",
    "",
    "## External Terminal History",
    "",
    `- **Open in ${terminalName}** uses \`${shortcutLabel("chat.open-external")}\`.`,
    "- Use the trackpad or mouse wheel in Zed, VS Code, Warp, or your terminal.",
    "- Keyboard: press `Ctrl-B`, then `[`, navigate with arrows or Page Up/Page Down, and press `q` to exit history.",
    "- Shared sessions retain up to 50,000 lines.",
    "",
    "## Recommended Flow",
    "",
    `1. Press \`${shortcutLabel("chat.toggle-view")}\` to switch between full terminal and chat options.`,
    "2. Write in the top bar and send with `↵`.",
    `3. Use \`${shortcutLabel("terminal.escape")}\` whenever the CLI expects a normal Escape key.`,
    `4. Scroll with \`${shortcutLabel("chat.scroll-up")}\` and \`${shortcutLabel("chat.scroll-down")}\`.`,
    `5. Recover prompts with \`${shortcutLabel("chat.previous-prompt")}\` and \`${shortcutLabel("chat.next-prompt")}\`.`,
  ].join("\n");
  return <Detail navigationTitle={"Shortcuts And Usage Guide"} markdown={markdown} />;
}

async function sendInput(
  session: ChatSession,
  snapshot: InteractiveSnapshot,
  send: (input: string) => Promise<void>,
  input: string,
): Promise<boolean> {
  if (!(await confirmInteractiveStart(session, snapshot))) return false;
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: input.startsWith("/")
      ? `${"Sending"} ${input.split(/\s+/)[0]}`
      : `${"Sending message to"} ${providerName(session.provider)}`,
  });
  try {
    await send(input);
    toast.style = Toast.Style.Success;
    toast.title = input.startsWith("/") ? "/Command Received By The CLI" : "Message Received By The CLI";
    toast.message = "Live activity is already visible in the terminal.";
    return true;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could Not Send The Input";
    toast.message = error instanceof Error ? error.message : String(error);
    return false;
  }
}

async function pasteClipboardImage(interactive: ReturnType<typeof useInteractiveSession>): Promise<void> {
  if (interactive.snapshot.status !== "running" && interactive.snapshot.status !== "starting") {
    await showToast({
      style: Toast.Style.Failure,
      title: "The CLI Is Not Running Yet",
      message: "Send a message first, then paste the image again.",
    });
    return;
  }

  const clipboard = await Clipboard.read();
  const file = clipboard.file || "";
  const looksLikeImage = /\.(avif|bmp|gif|heic|heif|jpe?g|png|tiff?|webp)$/i.test(file);
  if (!looksLikeImage && (clipboard.text || clipboard.html)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "There Is No Image In The Clipboard",
      message: "Copy a screenshot or image file and try again.",
    });
    return;
  }

  interactive.sendKey("ctrl-v");
  await showToast({
    style: Toast.Style.Success,
    title: "Image Sent To The CLI",
    message: "Claude or Codex will show the attached image in the prompt.",
  });
}

async function confirmInteractiveStart(session: ChatSession, snapshot: InteractiveSnapshot): Promise<boolean> {
  if (snapshot.status === "running" || snapshot.status === "starting") return true;
  const activeWarning = session.isActive
    ? "This session appears to be open in another process. Starting a second CLI can cause conflicts.\n\n"
    : "";
  return confirmAlert({
    icon:
      snapshot.permissionProfileId.includes("yolo") || snapshot.permissionProfileId.includes("dangerous")
        ? Icon.Warning
        : Icon.Lock,
    title: `${"Start"} ${providerName(session.provider)} · ${snapshot.permissionProfileTitle}`,
    message: `${activeWarning}${"Permission profile"}: ${
      snapshot.permissionProfileTitle
    }\n\n${"The exact command will be"}:\n\n${snapshot.command}\n\n${"Permissions are applied inside the CLI, not through Raycast dialogs."}`,
    primaryAction: {
      title: "Start CLI",
      style: Alert.ActionStyle.Destructive,
    },
  });
}

function sessionKey(session: ChatSession): string {
  return `${session.provider}:${session.id}`;
}
