import { useCachedPromise } from "@raycast/utils";
import { fizzy } from "./fizzy";
import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";

export default function MyNotifications() {
  const {
    isLoading,
    data: notifications,
    mutate,
  } = useCachedPromise(fizzy.notifications.list, [], { initialData: [] });
  const read = notifications.filter((notification) => notification.read);
  const unread = notifications.filter((notification) => !notification.read);

  return (
    <List isLoading={isLoading} isShowingDetail>
      <List.Section title="New For You" subtitle={unread.length.toString()}>
        {unread.map((notification) => (
          <List.Item
            key={notification.id}
            icon={notification.read ? Icon.BellDisabled : Icon.Bell}
            title={notification.title}
            detail={<List.Item.Detail markdown={notification.body} />}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Bell}
                  title="Mark as Read"
                  onAction={async () => {
                    const toast = await showToast(Toast.Style.Animated, "Marking as Read", notification.title);
                    try {
                      await mutate(fizzy.notifications.markAsRead(notification.id), {
                        optimisticUpdate(data) {
                          return data.map((notification) =>
                            notification.id === notification.id ? { ...notification, read: true } : notification,
                          );
                        },
                        shouldRevalidateAfter: false,
                      });
                      toast.style = Toast.Style.Success;
                      toast.title = "Marked as Read";
                    } catch (error) {
                      toast.style = Toast.Style.Failure;
                      toast.title = "Failed to mark as read";
                      toast.message = `${error}`;
                    }
                  }}
                />
                <Action
                  icon={Icon.Bell}
                  title="Mark All as Read"
                  onAction={async () => {
                    const toast = await showToast(Toast.Style.Animated, "Marking All as Read", notification.title);
                    try {
                      await mutate(fizzy.notifications.markAllAsRead(), {
                        optimisticUpdate(data) {
                          return data.map((n) => ({ ...n, read: true }));
                        },
                        shouldRevalidateAfter: false,
                      });
                      toast.style = Toast.Style.Success;
                      toast.title = "Marked All as Read";
                    } catch (error) {
                      toast.style = Toast.Style.Failure;
                      toast.title = "Failed to mark all as read";
                      toast.message = `${error}`;
                    }
                  }}
                />
                <Action.OpenInBrowser url={notification.url} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Previously Seen" subtitle={read.length.toString()}>
        {read.map((notification) => (
          <List.Item
            key={notification.id}
            icon={notification.read ? Icon.BellDisabled : Icon.Bell}
            title={notification.title}
            detail={<List.Item.Detail markdown={notification.body} />}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Bell}
                  title="Mark as Unread"
                  onAction={async () => {
                    const toast = await showToast(Toast.Style.Animated, "Marking as Unread", notification.title);
                    try {
                      await mutate(fizzy.notifications.markAsUnread(notification.id), {
                        optimisticUpdate(data) {
                          return data.map((n) => (n.id === notification.id ? { ...n, read: false } : n));
                        },
                        shouldRevalidateAfter: false,
                      });
                      toast.style = Toast.Style.Success;
                      toast.title = "Marked as Unread";
                    } catch (error) {
                      toast.style = Toast.Style.Failure;
                      toast.title = "Failed to mark as unread";
                      toast.message = `${error}`;
                    }
                  }}
                />
                <Action.OpenInBrowser url={notification.url} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
