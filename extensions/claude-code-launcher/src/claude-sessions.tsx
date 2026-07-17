import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  Image,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  openCommandPreferences,
  showHUD,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { access, constants } from "fs/promises";
import {
  BackgroundSession,
  ClaudeBinaryNotFoundError,
  ClaudeSession,
  InteractiveSession,
  dispatchBackgroundAgent,
  isRunning,
  listSessions,
  removeSession,
  stopSession,
} from "./claude-cli";
import { focusSessionTerminal } from "./focus-terminal";
import { launchClaudeInTerminal } from "./launch-terminal";
import { getIcon } from "./project-icons";
import { loadStoredProjects } from "./projects";
import { collapseTilde, expandTilde, getDirectoryName } from "./utils";

const REFRESH_INTERVAL_MS = 3000;
const CUSTOM_DIRECTORY = "__custom__";

const STATUS_COLORS: Record<string, Color> = {
  busy: Color.Orange,
  idle: Color.Blue,
  waiting: Color.Red,
  done: Color.Green,
};

const STATUS_ICONS: Record<string, Image.ImageLike> = {
  busy: { source: Icon.PlayFilled, tintColor: Color.Orange },
  idle: { source: Icon.PauseFilled, tintColor: Color.Blue },
  waiting: { source: Icon.Bell, tintColor: Color.Red },
  done: { source: Icon.CheckCircle, tintColor: Color.Green },
};

function sessionTitle(session: ClaudeSession): string {
  return session.name || getDirectoryName(session.cwd);
}

// Live process status first (busy/idle), else the background job state (done)
function statusLabel(session: ClaudeSession): string {
  return session.status ?? (session.kind === "background" ? session.state : "unknown");
}

function sessionIcon(session: ClaudeSession): { value: Image.ImageLike; tooltip: string } {
  const label = statusLabel(session);
  const icon = STATUS_ICONS[label] ?? { source: Icon.QuestionMarkCircle, tintColor: Color.SecondaryText };
  const detail = session.waitingFor ? ` (${session.waitingFor})` : "";
  return { value: icon, tooltip: `Status: ${label}${detail}` };
}

function sessionAccessories(session: ClaudeSession): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];
  const label = statusLabel(session);
  // The left icon shows the status; keep text tags only for what it cannot
  // show: raw values of unknown statuses, and the done state of an agent
  // whose process is still alive and attachable (idle + done)
  if (!(label in STATUS_ICONS)) {
    accessories.push({ tag: { value: label, color: STATUS_COLORS[label] ?? Color.SecondaryText } });
  }
  // What the session is waiting on (e.g. "permission prompt") — the icon alone cannot show it
  if (session.waitingFor) {
    accessories.push({ tag: { value: session.waitingFor, color: Color.Red } });
  }
  if (session.kind === "background" && session.status && session.state !== session.status) {
    accessories.push({ tag: { value: session.state, color: STATUS_COLORS[session.state] ?? Color.SecondaryText } });
  }
  accessories.push({ tag: { value: session.kind, color: Color.SecondaryText } });
  if (session.startedAt) {
    const startedAt = new Date(session.startedAt);
    accessories.push({ date: startedAt, tooltip: `Started: ${startedAt.toLocaleString()}` });
  }
  return accessories;
}

async function openSessionInTerminal(
  session: ClaudeSession,
  preferences: Preferences.ClaudeSessions,
  claudeArgs: string[],
  successTitle: string,
): Promise<void> {
  try {
    await launchClaudeInTerminal(session.cwd, preferences, claudeArgs);
    showToast({ style: Toast.Style.Success, title: successTitle, message: sessionTitle(session) });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    await showFailureToast(errorMessage, { title: "Failed to open terminal" });
  }
}

function CopySessionActions({ session }: { session: ClaudeSession }) {
  const jobId = session.kind === "background" ? session.id : session.jobId;
  return (
    <ActionPanel.Section>
      <Action.CopyToClipboard title="Copy Session ID" content={session.sessionId} />
      {jobId && <Action.CopyToClipboard title="Copy Job ID" content={jobId} />}
      <Action.CopyToClipboard
        title="Copy Path"
        content={session.cwd}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
      <Action.ShowInFinder
        title="Show in Finder"
        path={expandTilde(session.cwd)}
        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
      />
    </ActionPanel.Section>
  );
}

function InteractiveSessionActions({
  session,
  preferences,
  revalidate,
}: {
  session: InteractiveSession;
  preferences: Preferences.ClaudeSessions;
  revalidate: () => void;
}) {
  return (
    <>
      <Action
        title="Jump to Terminal"
        icon={Icon.Window}
        onAction={async () => {
          try {
            const result = await focusSessionTerminal(session.pid);
            await showHUD(
              result.kind === "window"
                ? "Jumped to Terminal"
                : `Activated ${result.appName} — exact window not targetable`,
            );
          } catch (error) {
            await showFailureToast(error, { title: "Could not jump to terminal" });
          }
        }}
      />
      <Action
        title={`Fork to New ${preferences.terminalApp} Window`}
        icon={Icon.Terminal}
        onAction={() =>
          openSessionInTerminal(
            session,
            preferences,
            ["--resume", session.sessionId, "--fork-session"],
            "Forked Session",
          )
        }
      />
      <Action
        title="Stop Session"
        icon={Icon.Stop}
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
        onAction={async () => {
          await confirmAlert({
            title: "Stop Session",
            message: `Send SIGTERM to the Claude process of "${sessionTitle(session)}" running in your terminal?`,
            primaryAction: {
              title: "Stop",
              style: Alert.ActionStyle.Destructive,
              onAction: () => {
                try {
                  process.kill(session.pid, "SIGTERM");
                  showToast({ style: Toast.Style.Success, title: "Stopped Session", message: sessionTitle(session) });
                } catch (error) {
                  if ((error as NodeJS.ErrnoException).code === "ESRCH") {
                    showToast({ style: Toast.Style.Success, title: "Session Already Exited" });
                  } else {
                    showFailureToast(error, { title: "Failed to stop session" });
                  }
                }
                revalidate();
              },
            },
          });
        }}
      />
    </>
  );
}

function BackgroundSessionActions({
  session,
  preferences,
  revalidate,
}: {
  session: BackgroundSession;
  preferences: Preferences.ClaudeSessions;
  revalidate: () => void;
}) {
  const running = isRunning(session);
  return (
    <>
      <Action
        title={`${running ? "Attach" : "Resume"} in ${preferences.terminalApp}`}
        icon={Icon.Terminal}
        onAction={() =>
          openSessionInTerminal(session, preferences, ["attach", session.id], running ? "Attached" : "Resumed")
        }
      />
      {running ? (
        <Action
          title="Stop Session"
          icon={Icon.Stop}
          shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
          onAction={async () => {
            await confirmAlert({
              title: "Stop Background Agent",
              message: `Stop "${sessionTitle(session)}"? Its conversation is kept and can be resumed later.`,
              primaryAction: {
                title: "Stop",
                onAction: async () => {
                  try {
                    await stopSession(session.id);
                    showToast({ style: Toast.Style.Success, title: "Stopped Session", message: sessionTitle(session) });
                  } catch (error) {
                    await showFailureToast(error, { title: "Failed to stop session" });
                  }
                  revalidate();
                },
              },
            });
          }}
        />
      ) : (
        <Action
          title="Delete Session"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={async () => {
            await confirmAlert({
              title: "Delete Session",
              message: `Delete "${sessionTitle(session)}"? This removes the session and its worktree.`,
              primaryAction: {
                title: "Delete",
                style: Alert.ActionStyle.Destructive,
                onAction: async () => {
                  try {
                    await removeSession(session.id);
                    showToast({ style: Toast.Style.Success, title: "Deleted Session", message: sessionTitle(session) });
                  } catch (error) {
                    await showFailureToast(error, { title: "Failed to delete session" });
                  }
                  revalidate();
                },
              },
            });
          }}
        />
      )}
    </>
  );
}

function GlobalActions({
  preferences,
  revalidate,
}: {
  preferences: Preferences.ClaudeSessions;
  revalidate: () => void;
}) {
  return (
    <ActionPanel.Section>
      <Action.Push
        title="New Session"
        icon={Icon.Plus}
        target={<NewSessionForm preferences={preferences} />}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
      />
      <Action.Push
        title="New Background Agent"
        icon={Icon.Bolt}
        target={<NewBackgroundAgentForm onDispatched={revalidate} />}
        shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={revalidate}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
    </ActionPanel.Section>
  );
}

function useDirectoryField() {
  const { data: projects } = useCachedPromise(loadStoredProjects, []);
  const [directoryChoice, setDirectoryChoice] = useState<string | undefined>();
  const [customDirectory, setCustomDirectory] = useState<string[]>([]);
  const [directoryError, setDirectoryError] = useState<string | undefined>();

  // The dropdown shows the first project before any onChange fires, so submit
  // must resolve against the same fallback the user sees, not the raw state
  const effectiveChoice = directoryChoice ?? (projects && projects.length > 0 ? projects[0].path : CUSTOM_DIRECTORY);

  const resolveDirectory = async (): Promise<string | undefined> => {
    const directory = effectiveChoice === CUSTOM_DIRECTORY ? customDirectory[0] : effectiveChoice;
    if (!directory) {
      setDirectoryError("Please select a directory");
      return undefined;
    }

    try {
      const expandedPath = expandTilde(directory);
      await access(expandedPath, constants.R_OK);
      const stats = await import("fs/promises").then((fs) => fs.stat(expandedPath));
      if (!stats.isDirectory()) {
        setDirectoryError("Path must be a directory");
        return undefined;
      }
    } catch {
      setDirectoryError("Directory does not exist or is not accessible");
      return undefined;
    }

    setDirectoryError(undefined);
    return directory;
  };

  const fields = (
    <>
      <Form.Dropdown
        id="directory"
        title="Directory"
        value={effectiveChoice}
        onChange={(value) => {
          setDirectoryChoice(value);
          setDirectoryError(undefined);
        }}
        error={directoryError}
      >
        {(projects ?? []).map((project) => (
          <Form.Dropdown.Item
            key={project.id}
            value={project.path}
            title={project.name || getDirectoryName(project.path)}
            icon={getIcon(project.icon || "Folder")}
          />
        ))}
        <Form.Dropdown.Item value={CUSTOM_DIRECTORY} title="Choose Directory…" icon={Icon.Folder} />
      </Form.Dropdown>
      {effectiveChoice === CUSTOM_DIRECTORY && (
        <Form.FilePicker
          id="customDirectory"
          title="Custom Directory"
          allowMultipleSelection={false}
          canChooseDirectories={true}
          canChooseFiles={false}
          value={customDirectory}
          onChange={(paths) => {
            setCustomDirectory(paths);
            setDirectoryError(undefined);
          }}
        />
      )}
    </>
  );

  return { fields, resolveDirectory };
}

function NewSessionForm({ preferences }: { preferences: Preferences.ClaudeSessions }) {
  const { pop } = useNavigation();
  const { fields, resolveDirectory } = useDirectoryField();

  const handleSubmit = async () => {
    const directory = await resolveDirectory();
    if (!directory) return;

    try {
      await launchClaudeInTerminal(directory, preferences);
      showToast({ style: Toast.Style.Success, title: "Opened in Terminal", message: getDirectoryName(directory) });
      pop();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      await showFailureToast(errorMessage, { title: "Failed to open terminal" });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={`Open in ${preferences.terminalApp}`} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {fields}
    </Form>
  );
}

function NewBackgroundAgentForm({ onDispatched }: { onDispatched: () => void }) {
  const { pop } = useNavigation();
  const { fields, resolveDirectory } = useDirectoryField();
  const [promptError, setPromptError] = useState<string | undefined>();

  const handleSubmit = async (values: { prompt: string; name: string }) => {
    if (!values.prompt.trim()) {
      setPromptError("Please enter a prompt");
      return;
    }

    const directory = await resolveDirectory();
    if (!directory) return;

    try {
      await showToast({ style: Toast.Style.Animated, title: "Dispatching background agent…" });
      await dispatchBackgroundAgent(directory, values.prompt.trim(), values.name.trim() || undefined);
      showToast({ style: Toast.Style.Success, title: "Dispatched Background Agent" });
      onDispatched();
      pop();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to dispatch background agent" });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Dispatch Background Agent" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {fields}
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder="What should the agent do?"
        error={promptError}
        onChange={() => setPromptError(undefined)}
      />
      <Form.TextField id="name" title="Name (Optional)" placeholder="my-agent" />
    </Form>
  );
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences.ClaudeSessions>();
  const {
    data: sessions,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(listSessions, [], {
    keepPreviousData: true,
  });

  useEffect(() => {
    // Pause polling while in an error state; the Retry action revalidates
    if (error) return;
    const timer = setInterval(revalidate, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [error, revalidate]);

  const { running, completed } = useMemo(() => {
    const all = sessions ?? [];
    // Waiting sessions need the user's attention, so they outrank busy ones
    const statusRank = (session: ClaudeSession) =>
      session.status === "waiting" ? 0 : session.status === "busy" ? 1 : 2;
    const byStartedAt = (a: ClaudeSession, b: ClaudeSession) => (b.startedAt ?? 0) - (a.startedAt ?? 0);
    return {
      running: all.filter(isRunning).sort((a, b) => statusRank(a) - statusRank(b) || byStartedAt(a, b)),
      completed: all.filter((session) => !isRunning(session)).sort(byStartedAt),
    };
  }, [sessions]);

  const renderItem = (session: ClaudeSession) => (
    <List.Item
      key={session.sessionId}
      icon={sessionIcon(session)}
      title={sessionTitle(session)}
      subtitle={collapseTilde(session.cwd)}
      keywords={[session.cwd, session.sessionId]}
      accessories={sessionAccessories(session)}
      actions={
        <ActionPanel>
          {session.kind === "interactive" ? (
            <InteractiveSessionActions session={session} preferences={preferences} revalidate={revalidate} />
          ) : (
            <BackgroundSessionActions session={session} preferences={preferences} revalidate={revalidate} />
          )}
          <CopySessionActions session={session} />
          <GlobalActions preferences={preferences} revalidate={revalidate} />
        </ActionPanel>
      }
    />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search sessions...">
      {error instanceof ClaudeBinaryNotFoundError ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Claude CLI Not Found"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Open Command Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to Load Sessions"
          description={error instanceof Error ? error.message : "An unknown error occurred"}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <GlobalActions preferences={preferences} revalidate={revalidate} />
            </ActionPanel>
          }
        />
      ) : (sessions ?? []).length === 0 ? (
        <List.EmptyView
          icon={Icon.Terminal}
          title="No Claude Sessions"
          description="Press ⌘N to start a session or ⌘⇧N to dispatch a background agent"
          actions={
            <ActionPanel>
              <GlobalActions preferences={preferences} revalidate={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        <>
          <List.Section title="Running" subtitle={`${running.length} items`}>
            {running.map(renderItem)}
          </List.Section>
          <List.Section title="Completed" subtitle={`${completed.length} items`}>
            {completed.map(renderItem)}
          </List.Section>
        </>
      )}
    </List>
  );
}
