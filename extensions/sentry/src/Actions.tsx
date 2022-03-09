import { Action, ActionPanel, environment, Icon, showToast, Toast } from "@raycast/api";
import { clearCache } from "./cache";
import { Issue } from "./types";

function DevelopmentActions() {
  async function handleClearCache() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Clearing cache" });
    try {
      await clearCache();
      toast.style = Toast.Style.Success;
      toast.title = "Cleared cache";
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed clearing cache";
      toast.message = e instanceof Error ? e.message : undefined;
    }
  }

  return environment.isDevelopment ? (
    <ActionPanel.Section>
      <Action icon={Icon.Trash} title="Clear Cache" onAction={handleClearCache} />
    </ActionPanel.Section>
  ) : null;
}

export function Actions(props: { issue: Issue }) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser url={props.issue.permalink} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Link"
          content={props.issue.permalink}
          shortcut={{ modifiers: ["cmd"], key: "." }}
        />
        <Action.CopyToClipboard
          title="Copy Short ID"
          content={props.issue.shortId}
          shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
        />
      </ActionPanel.Section>
      <DevelopmentActions />
    </ActionPanel>
  );
}
