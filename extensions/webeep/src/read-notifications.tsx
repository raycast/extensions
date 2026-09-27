import { Action, ActionPanel, Color, Icon, List, showToast, Toast, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { AuthEmptyView, isAuthError, showError } from "./components/errors";
import { fetchNotifications, markAllNotificationsRead, WebeepNotification } from "./lib/notifications";

function markdownFor(notification: WebeepNotification): string {
  return `## ${notification.subject}\n\n${notification.message}`;
}

export default function ReadNotifications() {
  const { data, isLoading, error, revalidate } = useCachedPromise(fetchNotifications, [], { onError: showError });

  async function markAllRead() {
    try {
      await markAllNotificationsRead();
      await showToast({ style: Toast.Style.Success, title: "All notifications marked as read" });
      revalidate();
    } catch (err) {
      await showError(err, "Could not mark notifications as read");
    }
  }

  const notifications = data?.notifications ?? [];

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search notifications…">
      {error && isAuthError(error) ? (
        <AuthEmptyView error={error} />
      ) : data && notifications.length === 0 ? (
        <List.EmptyView icon={Icon.Bell} title="No notifications" description="You are all caught up" />
      ) : (
        <List.Section title="Notifications" subtitle={data ? `${data.unread} unread` : undefined}>
          {notifications.map((notification) => (
            <List.Item
              key={notification.id}
              title={notification.subject}
              icon={
                notification.read
                  ? { source: Icon.Bell, tintColor: Color.SecondaryText }
                  : { source: Icon.Bell, tintColor: Color.Blue }
              }
              keywords={[notification.preview, notification.kind]}
              accessories={[{ date: notification.created }]}
              detail={<List.Item.Detail markdown={markdownFor(notification)} />}
              actions={
                <ActionPanel>
                  {notification.url ? (
                    <Action.OpenInBrowser
                      title={notification.urlName ? `Open ${notification.urlName}` : "Open in Browser"}
                      url={notification.url}
                    />
                  ) : null}
                  {notification.url ? (
                    <Action.CopyToClipboard
                      title="Copy Link"
                      content={notification.url}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                  ) : null}
                  <Action
                    title="Mark All as Read"
                    icon={Icon.CheckCircle}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                    onAction={markAllRead}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={revalidate}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
