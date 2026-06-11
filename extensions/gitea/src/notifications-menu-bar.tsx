import { MenuBarExtra, Icon, Color, open, launchCommand, LaunchType } from "@raycast/api";
import { showFailureToast, useCachedPromise, useCachedState } from "@raycast/utils";
import { NotificationStatus } from "./domain/notification";
import {
  getUnreadNotificationCount,
  listUnreadNotifications,
  readAllNotifications,
  updateNotificationStatus,
} from "./services/notifications";
import { NotificationThread } from "./types/api";
import { getNotificationIcon } from "./utils/icons";
import { CacheKey } from "./constants";

export default function MenuBarCommand() {
  const [notifications, setNotifications] = useCachedState<NotificationThread[]>(CacheKey.NotificationsMenuBar, []);
  const [unreadCount, setUnreadCount] = useCachedState<number>(`${CacheKey.NotificationsMenuBar}:count`, 0);
  const { isLoading, revalidate: revalidateNotifications } = useCachedPromise(() => listUnreadNotifications(), [], {
    onData: (data) => {
      if (Array.isArray(data)) setNotifications(data as NotificationThread[]);
    },
  });
  const { revalidate: revalidateUnreadCount } = useCachedPromise(() => getUnreadNotificationCount(), [], {
    onData: setUnreadCount,
  });

  const revalidate = () => {
    revalidateNotifications();
    revalidateUnreadCount();
  };

  const handleMarkAllAsRead = async () => {
    const previousNotifications = notifications;
    const previousUnreadCount = unreadCount;
    setNotifications([]);
    setUnreadCount(0);

    try {
      await readAllNotifications(NotificationStatus.Unread);
      revalidate();
    } catch (error) {
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      showFailureToast(error, { title: "Failed to mark all as read" });
    }
  };

  const handleOpenNotification = async (item: NotificationThread) => {
    if (item.subject?.html_url) {
      open(item.subject.html_url);
    }

    if (!item.id) {
      revalidate();
      return;
    }

    const previousNotifications = notifications;
    const previousUnreadCount = unreadCount;
    setNotifications((current) => current.filter((notification) => notification.id !== item.id));
    setUnreadCount((current) => Math.max(0, current - 1));

    try {
      await updateNotificationStatus({ id: String(item.id), toStatus: NotificationStatus.Read });
      revalidate();
    } catch (error) {
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      showFailureToast(error, { title: "Failed to mark notification as read" });
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
            {notifications?.map((item) => (
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
            <MenuBarExtra.Item
              title="Mark All as Read"
              tooltip="Marks all unread notifications as read"
              icon={Icon.CheckCircle}
              onAction={handleMarkAllAsRead}
            />
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
