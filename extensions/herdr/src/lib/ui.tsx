import { Action, ActionPanel, Color, Detail, Icon, Toast, openExtensionPreferences, showToast } from "@raycast/api";
import { formatHerdrError } from "./herdr";
import type { AgentStatus } from "./types";
export { shortcuts } from "./shortcuts";

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

export async function runAction(
  title: string,
  action: () => Promise<void>,
  options: { success?: string; onSuccess?: () => void | Promise<void> } = {},
): Promise<boolean> {
  const toast = await showToast({ style: Toast.Style.Animated, title });
  try {
    await action();
    await options.onSuccess?.();
    toast.style = Toast.Style.Success;
    toast.title = options.success || title.replace(/^\w+ing\b/, "Done");
    return true;
  } catch (error) {
    const formatted = formatHerdrError(error);
    toast.style = Toast.Style.Failure;
    toast.title = formatted.title;
    toast.message = formatted.message;
    return false;
  }
}

export function ErrorView({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
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
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          <Action.OpenInBrowser title="Open Herdr Troubleshooting" url="https://herdr.dev/docs/troubleshooting/" />
        </ActionPanel>
      }
    />
  );
}
