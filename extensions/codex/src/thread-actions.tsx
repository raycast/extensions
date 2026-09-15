import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import type { CodexThread } from "./utils/app-server";
import { buildCodexThreadUrl, openCodexThread } from "./utils/launch";
import {
  revalidateWithToast,
  runNoViewActionWithFailureToast,
} from "./utils/raycast";

// The refresh failure toast is worded differently on every surface, so callers
// pass a handler that already wraps itself in revalidateWithToast.
export function ThreadRowActions({
  thread,
  refreshTitle,
  onRefresh,
}: {
  thread: CodexThread;
  refreshTitle: string;
  onRefresh: () => Promise<unknown>;
}) {
  return (
    <ActionPanel>
      <Action
        title="Open in Codex"
        icon={Icon.AppWindow}
        onAction={() =>
          runNoViewActionWithFailureToast(
            "Unable to open thread in Codex",
            () => openCodexThread(thread.id),
          )
        }
      />
      <Action.ShowInFinder
        title="Open in Finder"
        path={thread.cwd}
        shortcut={Keyboard.Shortcut.Common.OpenWith}
      />
      <Action
        title={refreshTitle}
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={onRefresh}
      />
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Thread Deeplink"
          content={buildCodexThreadUrl(thread.id)}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
        <Action.CopyToClipboard
          title="Copy Working Directory"
          content={thread.cwd}
          shortcut={Keyboard.Shortcut.Common.CopyPath}
        />
        <Action.CopyToClipboard title="Copy Thread ID" content={thread.id} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export function ToggleDetailAction({
  isShowingDetail,
  onToggleDetail,
}: {
  isShowingDetail: boolean;
  onToggleDetail: () => void;
}) {
  return (
    <Action
      title={isShowingDetail ? "Hide Details" : "Show Details"}
      icon={isShowingDetail ? Icon.AppWindowList : Icon.AppWindowSidebarRight}
      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
      onAction={onToggleDetail}
    />
  );
}

export function RefreshAction({
  title,
  successTitle,
  failureTitle,
  onRefresh,
}: {
  title: string;
  successTitle: string;
  failureTitle: string;
  onRefresh: () => Promise<unknown>;
}) {
  return (
    <Action
      title={title}
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={() =>
        revalidateWithToast(onRefresh, { successTitle, failureTitle })
      }
    />
  );
}
