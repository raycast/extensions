import { useCachedPromise } from "@raycast/utils";
import { chatwoot } from "./chatwoot";
import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { Notification } from "./types";
import OpenInChatwoot from "./open-in-chatwoot";

const NOTIFICATION_STATUS_ACCESSORY: Record<Notification["notification_type"], List.Item.Accessory> = {
  assigned_conversation_new_message: {
    icon: Icon.SpeechBubbleActive,
    tag: { value: "New message", color: Color.Blue },
  },
};
export default function MyInbox() {
  const {
    isLoading,
    data: notifications,
    mutate,
  } = useCachedPromise(
    async () => {
      const { data } = await chatwoot.notifications.list();
      return data.payload;
    },
    [],
    { initialData: [] },
  );

  async function markAsRead(notification: Notification) {
    const toast = await showToast(Toast.Style.Animated, "Marking as Read", notification.id.toString());
    try {
      await mutate(
        chatwoot.notifications.markAsRead({
          primaryActorid: notification.primary_actor_id,
          primaryActorType: notification.primary_actor_type,
        }),
        {
          optimisticUpdate(data) {
            return data.map((n) => (n.id === notification.id ? { ...n, read_at: new Date().valueOf() / 1000 } : n));
          },
        },
      );
      toast.style = Toast.Style.Success;
      toast.title = "Marked as Read";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = `${error}`;
    }
  }

  return (
    <List isLoading={isLoading}>
      {!isLoading && !notifications.length ? (
        <List.EmptyView
          icon={Icon.Tray}
          title="Notifications from all subscribed inboxes"
          actions={
            <ActionPanel>
              <OpenInChatwoot route="inbox-view" />
            </ActionPanel>
          }
        />
      ) : (
        notifications.map((notification) => (
          <List.Item
            key={notification.id}
            title={notification.push_message_body}
            accessories={[
              { icon: notification.read_at ? Icon.Eye : Icon.EyeDisabled },
              NOTIFICATION_STATUS_ACCESSORY[notification.notification_type] ?? {},
              { date: new Date(notification.created_at * 1000) },
            ]}
            actions={
              <ActionPanel>
                {!notification.read_at && (
                  <Action icon={Icon.Eye} title="Mark as Read" onAction={() => markAsRead(notification)} />
                )}
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
