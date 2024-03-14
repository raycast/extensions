import { setTimeout } from "node:timers/promises";
import { useEffect, useState } from "react";
import { Color, MenuBarExtra, Icon, launchCommand, LaunchType } from "@raycast/api";
import apiServer from "./utils/api";
import { getAccessToken } from "./utils/oauth";
import { Notification } from "./utils/types";
import { groupNoficiations } from "./utils/helpers";
import { useCachedState } from "@raycast/utils";

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

  useEffect(() => {
    (async () => {
      await getAccessToken();
      const notifications = await apiServer.getAllNotifications();
      setNotifications(notifications);
      setMenuBarIcon(notifications.length > 0 ? iconActive : iconClear);
      setIsLoading(false);
    })();
  }, []);

  const groupedNotifications = groupNoficiations(notifications);

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{
        source: menuBarIcon,
        tintColor: Color.PrimaryText,
      }}
    >
      <MenuBarExtra.Section>
        {Object.entries(groupedNotifications).map(([type, items]) => {
          const menu = menus[type];
          return (
            <MenuBarExtra.Item
              key={type}
              icon={{ source: menu.icon ?? "" }}
              title={`${menu.title}: ${items.length}`}
              onAction={() => {}}
            />
          );
        })}
      </MenuBarExtra.Section>
      {notifications.length > 0 && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Dismiss all"
            onAction={async () => {
              await apiServer.dismissAllNotifications();
              setMenuBarIcon(iconClear);
              await setTimeout(100);
            }}
          />
        </MenuBarExtra.Section>
      )}
    </MenuBarExtra>
  );
}
