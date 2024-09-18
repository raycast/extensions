import {
  Icon,
  LaunchType,
  MenuBarExtra,
  Toast,
  getPreferenceValues,
  launchCommand,
  open,
  openCommandPreferences,
  openExtensionPreferences,
  showToast,
  updateCommandMetadata,
} from "@raycast/api";
import { useEffect } from "react";
import {
  Entry,
  markAsRead,
  useEntries,
  useSubscriptionMap,
  useUnreadEntriesIds,
} from "./utils/api";
import { getIcon } from "./utils/getIcon";

export default function MenuCommand(): JSX.Element {
  const { showCountInMenuBar, openWhileMarkingAsRead } =
    getPreferenceValues<Preferences.UnreadMenuBar>();
  const entries = useEntries({ read: false, per_page: 30 });
  const subscriptionMap = useSubscriptionMap();
  const unreadEntryIds = useUnreadEntriesIds();
  const unreadCount = unreadEntryIds.data?.length ?? 0;

  useEffect(() => {
    (async () => {
      await updateCommandMetadata({
        subtitle: `${unreadCount} unread items`,
      });
    })();
  }, [unreadCount]);

  const handleMarkAsRead = async (entry: Entry) => {
    try {
      showToast(Toast.Style.Animated, "Marking as read...");
      await markAsRead(entry.id);
      showToast(Toast.Style.Success, `Marked as read: ${entry.title}`);
    } catch (error) {
      showToast(Toast.Style.Failure, `Failed to mark as read: ${entry.title}`);
    }
  };

  return (
    <MenuBarExtra
      icon={{ source: "feedbin.png" }}
      title={showCountInMenuBar ? unreadCount.toString() : undefined}
      isLoading={entries.isLoading || subscriptionMap.isLoading}
    >
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Manage Subscriptions"
          icon={Icon.Network}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
          onAction={async () => {
            try {
              launchCommand({
                name: "subscriptions",
                type: LaunchType.UserInitiated,
              });
            } catch (e) {
              () => {};
            }
          }}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        {unreadCount === 0 && <MenuBarExtra.Section title="No unread items" />}
        {entries.data?.map((entry) => {
          const sub = subscriptionMap.data?.[entry.feed_id];

          return (
            <MenuBarExtra.Item
              key={entry.id}
              title={entry.title ?? "(no title)"}
              subtitle={sub?.title ?? "Unknown Feed"}
              icon={getIcon(entry.url)}
              onAction={() => open(entry.url)}
              alternate={
                openWhileMarkingAsRead ? (
                  <MenuBarExtra.Item
                    icon={Icon.Check}
                    title={entry.title ?? "(no title)"}
                    subtitle={"Mark as Read and Open"}
                    onAction={async () => {
                      open(entry.url);
                      await unreadEntryIds.mutate(handleMarkAsRead(entry));
                    }}
                  />
                ) : (
                  <MenuBarExtra.Item
                    icon={Icon.Check}
                    title={entry.title ?? "(no title)"}
                    subtitle={"Mark as Read"}
                    onAction={async () => {
                      await unreadEntryIds.mutate(handleMarkAsRead(entry));
                    }}
                  />
                )
              }
            />
          );
        })}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="View More"
          icon={Icon.List}
          shortcut={{ modifiers: ["cmd"], key: "m" }}
          onAction={async () => {
            try {
              launchCommand({
                name: "all-feeds",
                type: LaunchType.UserInitiated,
              });
            } catch (e) {
              () => {};
            }
          }}
        />
        <MenuBarExtra.Item
          title="Configure Command"
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openCommandPreferences}
          alternate={
            <MenuBarExtra.Item
              title="Configure Extension"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
            />
          }
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
