import { Action, ActionPanel, Clipboard, Icon, Keyboard, open, showToast, Toast } from "@raycast/api";
import { AppendChildForm } from "./AppendChildForm";
import { SaveBookmarkForm } from "./SaveBookmarkForm";
import { setNodeCompleted } from "../lib/api";
import { setNodeCompletedOptimistically } from "../lib/cache";
import { getPreferences } from "../lib/preferences";
import { platformShortcut } from "../lib/shortcuts";
import { getWorkflowyAppUrl, getWorkflowyWebUrl } from "../lib/urls";
import type { WorkflowyNodeRecord } from "../lib/nodes";

interface Props {
  node: WorkflowyNodeRecord;
  onDidMutate?: () => void;
  allowBookmark?: boolean;
  primaryAction?: "open" | "toggleComplete";
}

export function NodeActions({ node, onDidMutate, allowBookmark = true, primaryAction = "open" }: Props) {
  const preferences = getPreferences();
  const isCompleted = node.completed > 0;
  const opensInWeb = preferences.openWorkflowyLocationTarget === "web";

  async function handleToggleComplete() {
    try {
      await setNodeCompleted(preferences.apiKey, node.id, !isCompleted);
      setNodeCompletedOptimistically(node.id, !isCompleted);
      onDidMutate?.();
      await showToast({
        style: Toast.Style.Success,
        title: isCompleted ? "Marked as incomplete" : "Marked as complete",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not update task",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const toggleAction = (
    <Action
      title={isCompleted ? "Mark Incomplete" : "Mark Complete"}
      shortcut={primaryAction === "toggleComplete" ? undefined : platformShortcut(["cmd"], "k")}
      icon={isCompleted ? Icon.Circle : Icon.CheckCircle}
      onAction={handleToggleComplete}
    />
  );

  const primaryOpenShortcut: Keyboard.Shortcut | undefined = primaryAction === "toggleComplete" ? platformShortcut(["cmd"], "enter") : undefined;
  const alternateOpenShortcut: Keyboard.Shortcut | undefined = primaryAction === "toggleComplete" ? platformShortcut(["cmd", "shift"], "enter") : undefined;

  const preferredOpenAction = opensInWeb ? (
    <Action.OpenInBrowser title="Open in Workflowy" shortcut={primaryOpenShortcut} url={getWorkflowyWebUrl(node.id)} />
  ) : (
    <Action title="Open in Workflowy" shortcut={primaryOpenShortcut} onAction={() => open(getWorkflowyAppUrl(node.id))} icon={Icon.ArrowRight} />
  );

  const alternateOpenAction = opensInWeb ? (
    <Action title="Open in Workflowy App" shortcut={alternateOpenShortcut} onAction={() => open(getWorkflowyAppUrl(node.id))} />
  ) : (
    <Action.OpenInBrowser title="Open in Workflowy Web" shortcut={alternateOpenShortcut} url={getWorkflowyWebUrl(node.id)} />
  );

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {primaryAction === "toggleComplete" ? toggleAction : preferredOpenAction}
        {primaryAction === "toggleComplete" ? preferredOpenAction : alternateOpenAction}
        {primaryAction === "toggleComplete" ? alternateOpenAction : toggleAction}
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.Push
          title="Add Child Item"
          shortcut={platformShortcut(["cmd", "shift"], "a")}
          target={<AppendChildForm parentId={node.id} />}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Copy Item Text"
          shortcut={platformShortcut(["cmd"], "c")}
          onAction={() => Clipboard.copy(node.name)}
        />
        <Action.CopyToClipboard title="Copy Workflowy Link" shortcut={platformShortcut(["cmd", "shift"], "c")} content={getWorkflowyWebUrl(node.id)} />
        {allowBookmark ? (
          <Action.Push
            title="Save as Bookmark"
            shortcut={platformShortcut(["cmd", "shift"], "b")}
            target={<SaveBookmarkForm nodeId={node.id} defaultName={node.name} />}
          />
        ) : null}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
