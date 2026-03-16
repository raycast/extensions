import { useCallback, useEffect, useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  closeMainWindow,
  Color,
  confirmAlert,
  Icon,
  List,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useWslHistory } from "./hooks/use-wsl-history";
import { execWslStreaming, isWslInstalled } from "./lib/wsl";
import { getPrefs } from "./lib/preferences";
import { isWindowsTerminalInstalled, openInWindowsTerminal } from "./lib/terminal";
import { WslNotInstalled } from "./components/wsl-not-installed";
import { ChildProcess } from "child_process";

interface ShellArguments {
  command: string;
}

interface SessionEntry {
  id: string;
  command: string;
  output: string;
  finished: boolean;
  exitCode: number | null;
  hasError: boolean;
}

function sessionDetailMarkdown(entry: SessionEntry): string {
  const outputBlock = entry.output || (entry.finished ? "(no output)" : "");
  return `\`\`\`\n$ ${entry.command}\n\`\`\`

\`\`\`
${outputBlock}
\`\`\``;
}

function historyDetailMarkdown(command: string): string {
  return `Press **Enter** to run this command.

\`\`\`
$ ${command}
\`\`\``;
}

export default function Command(props: { arguments?: ShellArguments }) {
  const [searchText, setSearchText] = useState("");
  const [wslAvailable, setWslAvailable] = useState<boolean | null>(null);
  const [sessionEntries, setSessionEntries] = useState<SessionEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  // Guard: after executeCommand sets selectedId, ignore the next onSelectionChange
  // from Raycast (which would revert to the old item). Reset after a short delay.
  const selectionLockedRef = useRef(false);
  const childrenRef = useRef<Map<string, ChildProcess>>(new Map());
  const prefs = getPrefs();
  const { recentlyUsed, shellHistory, isLoading, addToRecentlyUsed, removeFromRecentlyUsed } =
    useWslHistory(searchText);
  const hasWT = isWindowsTerminalInstalled();
  const distroLabel = prefs.defaultDistro || "WSL";

  useEffect(() => {
    isWslInstalled().then(setWslAvailable);
  }, []);

  // Kill all running processes on unmount
  useEffect(() => {
    const children = childrenRef.current;
    return () => {
      for (const child of children.values()) {
        child.kill("SIGTERM");
      }
      children.clear();
    };
  }, []);

  const executeCommand = useCallback(
    (command: string) => {
      const id = String(Date.now());
      const entry: SessionEntry = {
        id,
        command,
        output: "",
        finished: false,
        exitCode: null,
        hasError: false,
      };

      selectionLockedRef.current = true;
      setSessionEntries((prev) => [entry, ...prev]);
      setSearchText("");
      setSelectedId(id);
      addToRecentlyUsed(command);
      // Unlock after Raycast has settled on the new selection
      setTimeout(() => {
        selectionLockedRef.current = false;
      }, 300);

      showToast({ style: Toast.Style.Animated, title: "Executing command..." });

      const child = execWslStreaming(command, prefs.defaultDistro || undefined, {
        onStdout: (data) => {
          setSessionEntries((prev) => prev.map((e) => (e.id === id ? { ...e, output: e.output + data } : e)));
        },
        onStderr: (data) => {
          setSessionEntries((prev) =>
            prev.map((e) => (e.id === id ? { ...e, output: e.output + data, hasError: true } : e)),
          );
        },
        onExit: (code) => {
          setSessionEntries((prev) => prev.map((e) => (e.id === id ? { ...e, finished: true, exitCode: code } : e)));
          childrenRef.current.delete(id);
          if (code === 0) {
            showToast({ style: Toast.Style.Success, title: "Command completed" });
          } else {
            showToast({
              style: Toast.Style.Failure,
              title: "Command failed",
              message: `Exit code ${code ?? "unknown"}`,
            });
          }
        },
      });

      childrenRef.current.set(id, child);
    },
    [prefs.defaultDistro, addToRecentlyUsed],
  );

  // Handle argument-based execution
  useEffect(() => {
    if (props.arguments?.command) {
      executeCommand(props.arguments.command);
    }
  }, [props.arguments?.command]);

  if (wslAvailable === false) {
    return <WslNotInstalled />;
  }

  const handleOpenInTerminal = (command: string) => {
    addToRecentlyUsed(command);
    openInWindowsTerminal(prefs.defaultDistro || undefined, command);
    closeMainWindow();
    popToRoot();
  };

  const handleRemoveFromRecent = async (command: string) => {
    const confirmed = await confirmAlert({
      title: "Remove from Recently Used",
      message: `Remove "${command}" from the recently used list? This cannot be undone.`,
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) {
      removeFromRecentlyUsed(command);
    }
  };

  const handleClearSession = async () => {
    const confirmed = await confirmAlert({
      title: "Clear Session",
      message: "Remove all executed commands from this session?",
      primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) {
      for (const child of childrenRef.current.values()) {
        child.kill("SIGTERM");
      }
      childrenRef.current.clear();
      setSessionEntries([]);
    }
  };

  const trimmedSearch = searchText.trim();

  // Any running entries mean the list is "loading"
  const hasRunning = sessionEntries.some((e) => !e.finished);

  function sessionIcon(entry: SessionEntry) {
    if (!entry.finished) return { source: Icon.Clock, tintColor: Color.Blue };
    if (entry.exitCode === 0 && !entry.hasError) return { source: Icon.CheckCircle, tintColor: Color.Green };
    return { source: Icon.XMarkCircle, tintColor: Color.Red };
  }

  function sessionAccessories(entry: SessionEntry): List.Item.Accessory[] {
    const acc: List.Item.Accessory[] = [];
    if (entry.finished && entry.exitCode !== null) {
      acc.push({
        tag: {
          value: `exit ${entry.exitCode}`,
          color: entry.exitCode === 0 ? Color.Green : Color.Red,
        },
      });
    }
    if (!entry.finished) {
      acc.push({ tag: { value: "running", color: Color.Blue } });
    }
    return acc;
  }

  return (
    <List
      isLoading={wslAvailable === null || isLoading || hasRunning}
      isShowingDetail
      onSearchTextChange={setSearchText}
      searchText={searchText}
      selectedItemId={selectedId}
      onSelectionChange={(id) => {
        if (!selectionLockedRef.current) {
          setSelectedId(id ?? undefined);
        }
      }}
      navigationTitle={`${distroLabel} — Terminal`}
      searchBarPlaceholder={`Run a command in ${distroLabel}…`}
    >
      {/* "Run Command" item when there's typed text */}
      {trimmedSearch && (
        <List.Section title="Run Command" subtitle={distroLabel}>
          <List.Item
            id="run-new"
            icon={{ source: Icon.Play, tintColor: Color.Green }}
            title={trimmedSearch}
            detail={<List.Item.Detail markdown={`Press **Enter** to execute:\n\n\`\`\`\n$ ${trimmedSearch}\n\`\`\``} />}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action title="Run in Raycast" icon={Icon.Play} onAction={() => executeCommand(trimmedSearch)} />
                  {hasWT && (
                    <Action
                      title="Run in Windows Terminal"
                      icon={Icon.Window}
                      shortcut={{ modifiers: ["cmd"], key: "t" }}
                      onAction={() => handleOpenInTerminal(trimmedSearch)}
                    />
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy Command"
                    content={trimmedSearch}
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel.Section>
                {sessionEntries.length > 0 && (
                  <ActionPanel.Section>
                    <Action
                      title="Clear Session"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd"], key: "k" }}
                      onAction={handleClearSession}
                    />
                  </ActionPanel.Section>
                )}
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {/* Session entries */}
      {sessionEntries.length > 0 && (
        <List.Section title="Session">
          {sessionEntries.map((entry) => (
            <List.Item
              key={entry.id}
              id={entry.id}
              icon={sessionIcon(entry)}
              title={entry.command}
              accessories={sessionAccessories(entry)}
              detail={<List.Item.Detail markdown={sessionDetailMarkdown(entry)} />}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.CopyToClipboard
                      title="Copy Output"
                      content={entry.output}
                      icon={Icon.Clipboard}
                      shortcut={{ modifiers: ["cmd"], key: "." }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Command"
                      content={entry.command}
                      icon={Icon.Terminal}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Rerun Command"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={() => executeCommand(entry.command)}
                    />
                    {hasWT && (
                      <Action
                        title="Run in Windows Terminal"
                        icon={Icon.Window}
                        shortcut={{ modifiers: ["cmd"], key: "t" }}
                        onAction={() => handleOpenInTerminal(entry.command)}
                      />
                    )}
                    <Action
                      title="Edit Command"
                      icon={Icon.Pencil}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                      onAction={() => setSearchText(entry.command)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Clear Session"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd"], key: "k" }}
                      onAction={handleClearSession}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {/* Recently Used */}
      {recentlyUsed.length > 0 && (
        <List.Section title="Recently Used">
          {recentlyUsed.map((command, index) => (
            <List.Item
              key={`recent-${index}`}
              id={`recent-${index}`}
              icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
              title={command}
              accessories={[{ icon: { source: Icon.Clock, tintColor: Color.SecondaryText }, tooltip: "Recently used" }]}
              detail={<List.Item.Detail markdown={historyDetailMarkdown(command)} />}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action title="Run in Raycast" icon={Icon.Play} onAction={() => executeCommand(command)} />
                    {hasWT && (
                      <Action
                        title="Run in Windows Terminal"
                        icon={Icon.Window}
                        shortcut={{ modifiers: ["cmd"], key: "t" }}
                        onAction={() => handleOpenInTerminal(command)}
                      />
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Edit Command"
                      icon={Icon.Pencil}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                      onAction={() => setSearchText(command)}
                    />
                    <Action.CopyToClipboard
                      title="Copy Command"
                      content={command}
                      icon={Icon.Clipboard}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Remove from Recently Used"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={() => handleRemoveFromRecent(command)}
                    />
                  </ActionPanel.Section>
                  {sessionEntries.length > 0 && (
                    <ActionPanel.Section>
                      <Action
                        title="Clear Session"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["cmd"], key: "k" }}
                        onAction={handleClearSession}
                      />
                    </ActionPanel.Section>
                  )}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {/* Shell History */}
      {shellHistory.length > 0 && (
        <List.Section title="Shell History">
          {shellHistory.map((command, index) => (
            <List.Item
              key={`history-${index}`}
              id={`history-${index}`}
              icon={{ source: Icon.Terminal, tintColor: Color.SecondaryText }}
              title={command}
              detail={<List.Item.Detail markdown={historyDetailMarkdown(command)} />}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action title="Run in Raycast" icon={Icon.Play} onAction={() => executeCommand(command)} />
                    {hasWT && (
                      <Action
                        title="Run in Windows Terminal"
                        icon={Icon.Window}
                        shortcut={{ modifiers: ["cmd"], key: "t" }}
                        onAction={() => handleOpenInTerminal(command)}
                      />
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Edit Command"
                      icon={Icon.Pencil}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                      onAction={() => setSearchText(command)}
                    />
                    <Action.CopyToClipboard
                      title="Copy Command"
                      content={command}
                      icon={Icon.Clipboard}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                  </ActionPanel.Section>
                  {sessionEntries.length > 0 && (
                    <ActionPanel.Section>
                      <Action
                        title="Clear Session"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["cmd"], key: "k" }}
                        onAction={handleClearSession}
                      />
                    </ActionPanel.Section>
                  )}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {/* Empty state when no session and no history matches */}
      {sessionEntries.length === 0 &&
        !isLoading &&
        recentlyUsed.length === 0 &&
        shellHistory.length === 0 &&
        !trimmedSearch && (
          <List.EmptyView
            title="No Commands Yet"
            description={`Type a command above to run it in ${distroLabel}, or start typing to search your shell history.`}
            icon={{ source: Icon.Terminal, tintColor: Color.Blue }}
          />
        )}
    </List>
  );
}
