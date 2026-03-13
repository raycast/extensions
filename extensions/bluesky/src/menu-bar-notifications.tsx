import { LaunchType, MenuBarExtra, launchCommand, open, showHUD } from "@raycast/api";
import {
  MenuBarIconUrl,
  MenuBarNotificationCacheKey,
  NewNotification,
  NewNotifications,
  NoNewNotifications,
  NotificationInMenuBarHUD,
  NotificationTextCacheKey,
  SessionStartFailed,
  UpdatingMessage,
} from "./utils/constants";
import { getAccountIcon, getAccountName } from "./utils/common";
import { getNotifications, getUnreadNotificationCount, resolveATUri } from "./libs/atp";
import { useEffect, useState } from "react";

import CustomAction from "./components/actions/CustomAction";
import { ExtensionConfig } from "./config/config";
import { Notification } from "./types/types";
import { parseNotifications } from "./utils/parser";
import { useCachedState } from "@raycast/utils";
import useStartATSession from "./hooks/useStartATSession";

export default function UnreadNotifications() {
  const [notificationText, setNotificationText] = useCachedState<string>(NotificationTextCacheKey, "");
  const [unreadNotifications, setUnreadNotifications] = useCachedState<Notification[]>(MenuBarNotificationCacheKey, []);

  const [actionProps, setActionProps] = useState<{ onAction: () => Promise<void> } | null>();
  const [sessionStarted, sessionStartFailed] = useStartATSession(() => {
    return;
  });

  if (notificationText === "") {
    showHUD(NotificationInMenuBarHUD);
  }

  useEffect(() => {
    if (sessionStartFailed) {
      setNotificationText(SessionStartFailed);
    }
  }, [sessionStartFailed]);

  const fetchNotifications = async () => {
    const data = await getNotifications(null, ExtensionConfig.menubarNotificationLimit);
    if (!data) {
      return [];
    }

    let notifications = parseNotifications(data.notifications);
    notifications = notifications.filter((notifications) => !notifications.isRead);

    return notifications;
  };

  useEffect(() => {
    setActionProps(null);

    setNotificationText(UpdatingMessage);
    (async () => {
      if (sessionStarted) {
        setUnreadNotifications([]);

        const notificationCount = await getUnreadNotificationCount();
        const notifications = await fetchNotifications();

        if (notificationCount >= 1) {
          setActionProps({
            onAction: async () => {
              await launchCommand({ name: "notifications", type: LaunchType.UserInitiated });
            },
          });
        }

        setNotificationText(() => {
          if (notificationCount > 1) {
            return `${notificationCount} ${NewNotifications}`;
          } else if (notificationCount == 1) {
            return `${notificationCount} ${NewNotification}`;
          } else {
            return NoNewNotifications;
          }
        });

        setUnreadNotifications(notifications);
      }
    })();
  }, [sessionStarted]);

  const onNotificationSelected = async (notification: Notification) => {
    const notificationUrl = await resolveATUri(notification);

    if (notificationUrl) {
      open(notificationUrl);
    }
  };

  return (
    <MenuBarExtra icon={MenuBarIconUrl}>
      {notificationText && notificationText.length > 0 && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title={notificationText} {...actionProps} />
          {unreadNotifications.length > 0 &&
            unreadNotifications.map((notification) => {
              return (
                <MenuBarExtra.Item
                  icon={getAccountIcon(notification.author)}
                  key={notification.id}
                  title={`${getAccountName(notification.author)} ${notification.text}`}
                  onAction={() => onNotificationSelected(notification)}
                />
              );
            })}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <CustomAction
          menuBarItem={true}
          actionKey="homeView"
          onClick={async () => {
            await launchCommand({ name: "home", type: LaunchType.UserInitiated });
          }}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <CustomAction
          menuBarItem={true}
          actionKey="timelineView"
          onClick={async () => {
            await launchCommand({ name: "timeline", type: LaunchType.UserInitiated });
          }}
        />
        <CustomAction
          menuBarItem={true}
          actionKey="searchView"
          onClick={async () => {
            await launchCommand({ name: "search", type: LaunchType.UserInitiated });
          }}
        />
        <CustomAction
          menuBarItem={true}
          actionKey="newPostView"
          onClick={async () => {
            await launchCommand({ name: "new-post", type: LaunchType.UserInitiated });
          }}
        />
        <CustomAction
          menuBarItem={true}
          actionKey="recentPostsView"
          onClick={async () => {
            await launchCommand({ name: "recent-posts", type: LaunchType.UserInitiated });
          }}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <CustomAction
          menuBarItem={true}
          actionKey="aboutView"
          onClick={async () => {
            await launchCommand({ name: "home", type: LaunchType.UserInitiated, context: { navigateTo: "About" } });
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
