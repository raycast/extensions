import { homedir } from "node:os";
import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  LaunchType,
  Toast,
  closeMainWindow,
  launchCommand,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { formatHerdrError, getSessions, stoppedSessionOf } from "./herdr";
import { shortcuts } from "./shortcuts";
import { launchHerdrInTerminal, type LaunchResult } from "./terminal";
import type { AgentStatus, TabInfo } from "./types";
export { shortcuts } from "./shortcuts";

// Herdr defaults a tab's label to its number, which identifies nothing.
export function tabLabel(tab?: TabInfo): string | undefined {
  if (!tab || tab.label === String(tab.number)) return undefined;
  return tab.label;
}

export function abbreviatePath(path?: string): string | undefined {
  if (!path) return undefined;
  const home = homedir();
  return path === home || path.startsWith(`${home}/`) ? `~${path.slice(home.length)}` : path;
}

export function statusTitle(status?: AgentStatus): string {
  switch (status) {
    case "working":
      return "Working";
    case "blocked":
      return "Needs Attention";
    case "done":
      return "Done";
    case "idle":
      return "Idle";
    default:
      return "Unknown";
  }
}

export function statusColor(status?: AgentStatus): Color {
  switch (status) {
    case "working":
      return Color.Blue;
    case "blocked":
      return Color.Red;
    case "done":
      return Color.Green;
    case "idle":
      return Color.SecondaryText;
    default:
      return Color.Yellow;
  }
}

export function statusIcon(status?: AgentStatus): { source: Icon; tintColor: Color } {
  const source = status === "working" ? Icon.Bolt : status === "blocked" ? Icon.ExclamationMark : Icon.CircleFilled;
  return { source, tintColor: statusColor(status) };
}

/**
 * Runs `action` behind a toast. A string it returns becomes the success toast's
 * message. The type stays narrow so a raw `runHerdr` result, which is CLI
 * stdout, cannot be passed by accident.
 */
export async function runAction(
  title: string,
  action: () => Promise<void | string | LaunchResult>,
  options: { success?: string; onSuccess?: () => void | Promise<void> } = {},
): Promise<boolean> {
  const toast = await showToast({ style: Toast.Style.Animated, title });
  try {
    const message = await action();
    await options.onSuccess?.();
    toast.style = Toast.Style.Success;
    toast.title = options.success || title.replace(/^\w+ing\b/, "Done");
    if (typeof message === "string") toast.message = message;
    return true;
  } catch (error) {
    const formatted = formatHerdrError(error);
    toast.style = Toast.Style.Failure;
    toast.title = formatted.title;
    toast.message = formatted.message;
    return false;
  }
}

/**
 * Opens Manage Sessions, the one picker for the Selected Session. Selecting or
 * switching happens there, so this action is never titled Switch.
 */
export function ManageSessionsAction({ title = "Manage Sessions…" }: { title?: string }) {
  return (
    <Action
      title={title}
      icon={Icon.Switch}
      shortcut={shortcuts.manageSessions}
      onAction={() => launchCommand({ name: "sessions", type: LaunchType.UserInitiated })}
    />
  );
}

// Reads never start a session, so a Stopped Selected Session is shown as such;
// attaching through the terminal is the only way to start it from here. Herdr
// reports a session that does not exist the same way, and `herdr --session`
// would create it, so the start action is offered only for a listed session.
function SessionStoppedView({ session, onRetry }: { session: string; onRetry?: () => void }) {
  const sessions = useCachedPromise(getSessions, [], { keepPreviousData: true });
  const missing = sessions.data !== undefined && !sessions.data.some((item) => item.name === session);
  const markdown = missing
    ? `# Session “${session}” was not found\n\nIt may have been deleted, or the Default Session preference may be misspelled. Choose another session for Raycast to control.`
    : `# Session “${session}” is stopped\n\nAttach to start it in your terminal, or choose another session for Raycast to control.`;
  return (
    <Detail
      isLoading={sessions.isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {missing ? null : (
            <Action
              title="Start and Attach in Terminal"
              icon={Icon.Terminal}
              onAction={async () => {
                const succeeded = await runAction(
                  "Starting session",
                  () => launchHerdrInTerminal(["session", "attach", session], { includeSession: false }),
                  { success: "Terminal Opened" },
                );
                if (succeeded) await closeMainWindow({ clearRootSearch: true });
              }}
            />
          )}
          <ManageSessionsAction title="Choose Another Session" />
          {onRetry ? (
            <Action title="Try Again" icon={Icon.ArrowClockwise} shortcut={shortcuts.refresh} onAction={onRetry} />
          ) : null}
          <Action title="Open Extension Preferences…" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}

export function ErrorView({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const stoppedSession = stoppedSessionOf(error);
  if (stoppedSession) return <SessionStoppedView session={stoppedSession} onRetry={onRetry} />;
  const formatted = formatHerdrError(error);
  const isMissing = error instanceof Error && "code" in error && error.code === "binary_not_found";
  const markdown = `# ${formatted.title}\n\n${formatted.message || "Make sure Herdr is installed and its server is running."}`;
  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          {onRetry ? <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} /> : null}
          {isMissing ? (
            <Action.OpenInBrowser title="Open Herdr Installation Guide" url="https://herdr.dev/docs/install/" />
          ) : null}
          <Action title="Open Extension Preferences…" icon={Icon.Gear} onAction={openExtensionPreferences} />
          <Action.OpenInBrowser title="Open Herdr Troubleshooting" url="https://herdr.dev/docs/troubleshooting/" />
        </ActionPanel>
      }
    />
  );
}
