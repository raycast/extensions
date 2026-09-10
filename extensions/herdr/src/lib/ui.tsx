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
import { formatHerdrError, stoppedSessionOf } from "./herdr";
import { shortcuts } from "./shortcuts";
import { launchHerdrInTerminal } from "./terminal";
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

/** Runs `action` behind a toast. A string it returns becomes the success toast's message. */
export async function runAction(
  title: string,
  action: () => Promise<void | string>,
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

/** Opens Manage Sessions, the one picker for the Selected Session. */
export function SwitchSessionAction({ title = "Switch Session…" }: { title?: string }) {
  return (
    <Action
      title={title}
      icon={Icon.Switch}
      shortcut={shortcuts.switchSession}
      onAction={() => launchCommand({ name: "sessions", type: LaunchType.UserInitiated })}
    />
  );
}

// Reads never start a session, so a Stopped Selected Session is shown as such;
// attaching through the terminal is the only way to start it from here.
function SessionStoppedView({ session, onRetry }: { session: string; onRetry?: () => void }) {
  const markdown = `# Session “${session}” is stopped\n\nAttach to start it in your terminal, or choose another session for Raycast to control.`;
  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
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
          <SwitchSessionAction title="Choose Another Session" />
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
