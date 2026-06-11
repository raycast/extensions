import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { NotificationStatus } from "../../domain/notification";
import type { PaginatedResourceMutate } from "../../hooks/usePaginatedResource";
import { useNotificationActions } from "../../hooks/useNotificationActions";
import type { NotificationThread } from "../../types/api";

export default function NotificationActions(props: {
  item: NotificationThread;
  mutate?: PaginatedResourceMutate<NotificationThread>;
}) {
  const subjectUrl = props.item.subject?.html_url;
  const isPinned = Boolean(props.item.pinned);
  const { readAll, runWithToast, updateStatus } = useNotificationActions();

  const runUpdate = async (toStatus: NotificationStatus) => {
    const updatePromise = updateStatus({ id: String(props.item.id), toStatus });
    if (props.mutate) {
      await props.mutate(updatePromise, { shouldRevalidateAfter: true });
      return;
    }
    await updatePromise;
  };

  const toggleReadStatus = async () => {
    const toStatus: NotificationStatus = props.item.unread ? NotificationStatus.Read : NotificationStatus.Unread;
    await runWithToast(runUpdate(toStatus), {
      success: `Marked as ${toStatus}`,
      failure: `Could not mark as ${toStatus}`,
    });
  };

  const togglePinStatus = async () => {
    const toStatus = isPinned ? NotificationStatus.Unread : NotificationStatus.Pinned;

    await runWithToast(runUpdate(toStatus), {
      success: `${isPinned ? "Unpinned" : "Pinned"} notification`,
      failure: `Could not ${isPinned ? "unpin" : "pin"} notification`,
    });
  };

  const markAllAsRead = async () => {
    await runWithToast(
      (async () => {
        const updatePromise = readAll(NotificationStatus.Unread);
        if (props.mutate) {
          await props.mutate(updatePromise, { shouldRevalidateAfter: true });
        } else {
          await updatePromise;
        }
      })(),
      {
        success: "Marked all as read",
        failure: "Could not mark as read",
      },
    );
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
          title={props.item.unread ? "Mark as Read" : "Mark as Unread"}
          icon={props.item.unread ? Icon.Eye : Icon.EyeDisabled}
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
