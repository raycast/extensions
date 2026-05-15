import { MenuBarExtra, Icon, showToast, Toast, Color, open, launchCommand, LaunchType } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { listNotifications, readAllNotificationStatus } from "./api/notifications";
import { NotificationThread } from "./types/api";
import { getNotificationIcon } from "./utils/icons";

export default function MenuBarCommand() {
  const cacheKey = "notifications-unread";
  const [notifications, setNotifications] = useCachedState<NotificationThread[]>(cacheKey, []);
  const { isLoading } = useCachedPromise(() => listNotifications({ limit: 20, all: false }), [], {
    onData: (data) => {
      if (Array.isArray(data)) setNotifications(data as NotificationThread[]);
    },
  });

  const unreadCount = notifications?.length ?? 0;

  const handleMarkAllAsRead = async () => {
    try {
      await readAllNotificationStatus();
      await launchCommand({ name: "notifications", type: LaunchType.Background });
    } catch {
      showToast({ style: Toast.Style.Failure, title: "Failed to mark all as read" });
    }
  };

  const handleOpenNotification = (item: NotificationThread) => {
    if (item.subject?.html_url) {
      open(item.subject.html_url);
    }
  };

  return (
    <MenuBarExtra
      icon={{
        source: "logo/gitea.png",
        tintColor: unreadCount > 0 ? Color.PrimaryText : Color.SecondaryText,
      }}
      isLoading={isLoading}
      title={unreadCount > 0 ? String(unreadCount) : undefined}
      tooltip={`${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`}
    >
      {unreadCount === 0 ? (
        <MenuBarExtra.Item title="No unread notifications" />
      ) : (
        <>
          <MenuBarExtra.Section>
            {notifications?.slice(0, 20).map((item) => (
              <MenuBarExtra.Item
                key={item.id}
                title={item.subject?.title || "[No Title]"}
                subtitle={item.repository?.full_name || "[No Repository]"}
                icon={getNotificationIcon(item)}
                onAction={() => handleOpenNotification(item)}
              />
            ))}
          </MenuBarExtra.Section>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item title="Mark All as Read" icon={Icon.CheckCircle} onAction={handleMarkAllAsRead} />
            <MenuBarExtra.Item
              title="Open Notifications"
              icon={Icon.List}
              onAction={() => launchCommand({ name: "notifications", type: LaunchType.UserInitiated })}
            />
          </MenuBarExtra.Section>
        </>
      )}
    </MenuBarExtra>
  );
}
