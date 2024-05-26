import { setTimeout } from "node:timers/promises";
import { useEffect, useState } from "react";
import { Color, MenuBarExtra, Icon, getPreferenceValues, open, openCommandPreferences } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import apiServer from "./utils/api";
import { client, getAccessToken } from "./utils/oauth";
import { Notification } from "./utils/types";
import { groupNotifications } from "./utils/helpers";

const menus: Record<string, { icon: string; title: string }> = {
  reblog: { icon: Icon.Repeat, title: "Boosts" },
  mention: { icon: Icon.AtSymbol, title: "Mentions" },
  status: { icon: Icon.Message, title: "Statuses" },
  follow: { icon: Icon.Person, title: "Follows" },
  follow_request: { icon: Icon.PlusTopRightSquare, title: "Follow requests" },
  favourite: { icon: Icon.Star, title: "Favorites" },
  poll: { icon: Icon.BarChart, title: "Polls" },
  update: { icon: Icon.Pencil, title: "Updates" },
  "admin.sign_up": { icon: Icon.PersonLines, title: "New users" },
  "admin.report": { icon: Icon.Megaphone, title: "Reports" },
  severed_relationships: { icon: Icon.TwoPeople, title: "Severed relationships" },
};

const iconClear = "menu-bar-notifications-icon.svg";
const iconActive = "menu-bar-notifications-active-icon.svg";

export default function MenuBarNotifications() {
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [menuBarIcon, setMenuBarIcon] = useCachedState("notifications-menu-bar-icon", iconClear);
  const [needReauthorize, setNeedReauthorize] = useState(false);

  useEffect(() => {
    (async () => {
      await getAccessToken();
      const { notifications, needReauthorize } = await apiServer
        .getAllNotifications()
        .then((notifications) => ({ notifications, needReauthorize: false }))
        .catch(({ error }) => {
          if (error === "This action is outside the authorized scopes") {
            setNeedReauthorize(true);
          }
          return { notifications: [], needReauthorize: true };
        });

      setNotifications(notifications);
      setMenuBarIcon(needReauthorize || notifications.length > 0 ? iconActive : iconClear);
      setIsLoading(false);
    })();
  }, []);

  const groupedNotifications = groupNotifications(notifications);
  const { instance, openNotificationWith } = getPreferenceValues<Preferences.MenuBarNotifications>();
  const openWithApp = openNotificationWith?.bundleId ?? openNotificationWith?.name;

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{
        source: menuBarIcon,
        tintColor: Color.PrimaryText,
      }}
    >
      {needReauthorize && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="This feature requires re-authorize to use"
            onAction={async () => {
              await client.removeTokens();
              await open("raycast://extensions/SevicheCC/mastodon/menu-bar-notifications");
            }}
          />
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={`Open ${openNotificationWith?.name ?? "Mastodon"}`}
          icon={
            openWithApp && openNotificationWith?.path
              ? { fileIcon: openNotificationWith?.path }
              : {
                  source: iconClear,
                  tintColor: Color.PrimaryText,
                }
          }
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={() => {
            open(`https://${instance}`, openWithApp);
          }}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        {Object.entries(groupedNotifications).map(([type, items = []]) => {
          const menu = menus[type];
          return (
            <MenuBarExtra.Item
              key={type}
              icon={{ source: menu.icon ?? "" }}
              title={`${menu.title}: ${items.length}`}
              onAction={() => {
                open(`https://${instance}/notifications`, openWithApp);
              }}
            />
          );
        })}
        {notifications.length === 0 && <MenuBarExtra.Item title="No unread notifications" />}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        {notifications.length > 0 && (
          <MenuBarExtra.Item
            title="Dismiss all"
            icon={Icon.Check}
            shortcut={{ modifiers: ["shift"], key: "escape" }}
            onAction={async () => {
              await apiServer.dismissAllNotifications();
              setMenuBarIcon(iconClear);
              await setTimeout(100);
            }}
          />
        )}
        <MenuBarExtra.Item
          title="Configure Command"
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={() => {
            openCommandPreferences();
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
