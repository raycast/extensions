import { getApplications, MenuBarExtra, open, openCommandPreferences } from "@raycast/api";
import { NotificationResult } from "./api/getNotifications";
import { updateNotification } from "./api/updateNotification";
import View from "./components/View";
import { getNotificationMenuBarIcon, getNotificationMenuBarTitle, getNotificationTitle } from "./helpers/notifications";
import { getUserIcon } from "./helpers/users";
import useNotifications from "./hooks/useNotifications";

function UnreadNotifications() {
  const { isLoadingNotifications, unreadNotifications, urlKey, mutateNotifications } = useNotifications();

  async function openNotification(notification: NotificationResult) {
    const applications = await getApplications();
    const linearApp = applications.find((app) => app.bundleId === "com.linear");
    notification.issue ? await open(notification.issue.url, linearApp) : await openInbox();
    await mutateNotifications(updateNotification({ id: notification.id, readAt: new Date() }), {
      optimisticUpdate(data) {
        if (!data) {
          return data;
        }
        return {
          ...data,
          notifications: data?.notifications?.map((x) => (x.id === notification.id ? { ...x, readAt: new Date() } : x)),
        };
      },
      shouldRevalidateAfter: true,
    });
  }

  async function openInbox() {
    const applications = await getApplications();
    const linearApp = applications.find((app) => app.bundleId === "com.linear");
    await open(`https://linear.app/${urlKey}/inbox`, linearApp);
  }

  return (
    <MenuBarExtra
      title={getNotificationMenuBarTitle(unreadNotifications)}
      icon={getNotificationMenuBarIcon(unreadNotifications)}
      isLoading={isLoadingNotifications}
    >
      <MenuBarExtra.Item
        title="Open Inbox"
        icon="linear.png"
        shortcut={{ modifiers: ["cmd"], key: "o" }}
        onAction={openInbox}
      />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title={unreadNotifications.length !== 0 ? "Unread Notifications" : "No Unread Notifications"}
      />
      {unreadNotifications.map((notification) => {
        const baseTitle = `${getNotificationTitle(notification)} by ${
          notification.actor ? notification.actor.displayName : "Linear"
        }`;

        return (
          <MenuBarExtra.Item
            key={notification.id}
            icon={notification.actor ? getUserIcon(notification.actor) : "linear.png"}
            title={notification.issue ? `${notification.issue.identifier}: ${baseTitle}` : baseTitle}
            tooltip={notification.issue?.title}
            onAction={() => openNotification(notification)}
          />
        );
      })}

      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title="Configure Command"
        shortcut={{ modifiers: ["cmd"], key: "," }}
        onAction={() => openCommandPreferences()}
      />
    </MenuBarExtra>
  );
}

export default function Command() {
  return (
    <View>
      <UnreadNotifications />
    </View>
  );
}
