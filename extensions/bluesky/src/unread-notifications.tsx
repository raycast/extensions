import { LaunchType, MenuBarExtra, launchCommand, showHUD } from "@raycast/api";
import {
  MenuBarIconUrl,
  NewNotification,
  NewNotifications,
  NoNewNotifications,
  NotificationInMenuBarHUD,
  NotificationTextCacheKey,
  SessionStartFailed,
  UpdatingMessage,
} from "./utils/constants";
import { useEffect, useState } from "react";

import CustomAction from "./components/actions/CustomAction";
import { getUnreadNotificationCount } from "./libs/atp";
import { useCachedState } from "@raycast/utils";
import useStartATSession from "./hooks/useStartATSession";

export default function UnreadNotifications() {
  const [notificationText, setNotificationText] = useCachedState<string>(NotificationTextCacheKey, "");

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

  useEffect(() => {
    setActionProps(null);
    setNotificationText(UpdatingMessage);
    (async () => {
      if (sessionStarted) {
        const notificationCount = await getUnreadNotificationCount();
        if (notificationCount >= 1) {
          setActionProps({
            onAction: async () => {
              await launchCommand({ name: "notifications", type: LaunchType.UserInitiated });
            },
          });
        }

        if (notificationCount > 1) {
          setNotificationText(`${notificationCount} ${NewNotifications}`);
        } else if (notificationCount == 1) {
          setNotificationText(`${notificationCount} ${NewNotification}`);
        } else {
          setNotificationText(NoNewNotifications);
        }
      }
    })();
  }, [sessionStarted]);

  return (
    <MenuBarExtra icon={MenuBarIconUrl}>
      {notificationText && notificationText.length > 0 && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title={notificationText} {...actionProps} />
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
