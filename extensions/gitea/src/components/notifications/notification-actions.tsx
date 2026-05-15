import { Action, ActionPanel, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { readAllNotificationStatus, updateNotificationStatus, StatusType } from "../../api/notifications";
import type { PaginatedCachedPromiseMutate } from "../../hooks/usePaginatedCachedPromise";
import { NotificationThread } from "../../types/api";

export default function NotificationActions(props: {
  item: NotificationThread;
  mutate?: PaginatedCachedPromiseMutate<NotificationThread>;
}) {
  const subjectUrl = props.item.subject?.html_url;
  const isPinned = Boolean(props.item.pinned);

  const runUpdate = async (toStatus: StatusType) => {
    const updatePromise = updateNotificationStatus({ id: String(props.item.id), toStatus });
    if (props.mutate) {
      await props.mutate(updatePromise, { shouldRevalidateAfter: true });
      return;
    }
    await updatePromise;
  };

  const toggleReadStatus = async () => {
    const toStatus: StatusType = props.item.unread || isPinned ? StatusType.Read : StatusType.Unread;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Updating..." });

    try {
      await runUpdate(toStatus);
      toast.style = Toast.Style.Success;
      toast.title = `Marked as ${toStatus}`;
    } catch (err: unknown) {
      toast.style = Toast.Style.Failure;
      toast.title = `Could not mark as ${toStatus}`;
      toast.message = err instanceof Error ? err.message : String(err);
    }
  };

  const togglePinStatus = async () => {
    const toStatus = isPinned ? StatusType.Unread : StatusType.Pinned;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Updating..." });
    try {
      await runUpdate(toStatus);
      toast.style = Toast.Style.Success;
      toast.title = `${isPinned ? "Unpinned" : "Pinned"} notification`;
    } catch (err: unknown) {
      toast.style = Toast.Style.Failure;
      toast.title = `Could not ${isPinned ? "unpin" : "pin"} notification`;
      toast.message = err instanceof Error ? err.message : String(err);
    }
  };

  const markAllAsRead = async () => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Updating..." });
    try {
      const updatePromise = readAllNotificationStatus();
      if (props.mutate) {
        await props.mutate(updatePromise, { shouldRevalidateAfter: true });
      } else {
        await updatePromise;
      }
      toast.style = Toast.Style.Success;
      toast.title = `Marked all as read`;
    } catch (err: unknown) {
      toast.style = Toast.Style.Failure;
      toast.title = `Could not mark as read`;
      toast.message = err instanceof Error ? err.message : String(err);
    }
  };

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {subjectUrl ? (
          <Action.OpenInBrowser title="Open Notification" url={subjectUrl} shortcut={Keyboard.Shortcut.Common.Open} />
        ) : null}
      </ActionPanel.Section>
      <ActionPanel.Section title="Copy">
        {subjectUrl ? (
          <Action.CopyToClipboard title="Copy URL" content={subjectUrl} shortcut={Keyboard.Shortcut.Common.Copy} />
        ) : null}
      </ActionPanel.Section>
      <ActionPanel.Section title="Actions">
        <Action title="Mark All as Read" icon={Icon.Eye} onAction={markAllAsRead} />
        <Action
          title={props.item.unread || isPinned ? "Mark as Read" : "Mark as Unread"}
          icon={props.item.unread || isPinned ? Icon.Eye : Icon.EyeDisabled}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "r" },
            Windows: { modifiers: ["ctrl", "shift"], key: "r" },
          }}
          onAction={toggleReadStatus}
        />
        <Action
          title={props.item.pinned ? "Unpin Notification" : "Pin Notification"}
          icon={Icon.Pin}
          shortcut={Keyboard.Shortcut.Common.Pin}
          onAction={togglePinStatus}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
