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
import { Entry, markAsRead, useEntries, useSubscriptionMap } from "./utils/api";

export default function MenuCommand(): JSX.Element {
  const { showCountInMenuBar } =
    getPreferenceValues<Preferences.UnreadMenuBar>();
  const entries = useEntries({ read: false });
  const subscriptionMap = useSubscriptionMap();

  useEffect(() => {
    (async () => {
      await updateCommandMetadata({
        subtitle: `${entries.data?.length.toString() ?? ""} unread items`,
      });
    })();
  }, []);

  const entriesGroupedByFeedId =
    entries.data?.reduce<Record<number, Entry[]>>((acc, entry) => {
      if (acc[entry.feed_id]) {
        acc[entry.feed_id].push(entry);
      } else {
        acc[entry.feed_id] = [entry];
      }
      return acc;
    }, {}) ?? {};

  const groupedEntries = Object.entries(entriesGroupedByFeedId)
    // Sometimes when adding or removing subscriptions
    // the subscriptionMap might not contain the subscription
    // for the entry returned.
    .filter(([key]) => subscriptionMap.data[+key])
    .sort(([aKey], [bKey]) =>
      subscriptionMap.data[+aKey].title.localeCompare(
        subscriptionMap.data[+bKey].title,
      ),
    );

  const unreadCount = entries.data ? entries.data.length : 0;

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
      <MenuBarExtra.Item
        title="Manage Subscriptions"
        onAction={() =>
          launchCommand({
            name: "subscriptions",
            type: LaunchType.UserInitiated,
          })
        }
      />
      {unreadCount === 0 && <MenuBarExtra.Section title="No unread items" />}
      {groupedEntries.map(([feedId, groupedEntries]) => {
        return (
          <MenuBarExtra.Section
            key={feedId}
            title={subscriptionMap.data?.[+feedId]?.title ?? "Unknown Feed"}
          >
            {groupedEntries.map((entry) => {
              let title = entry.title ?? entry.summary;
              if (title.length > 60) {
                title = title.substring(0, 60) + "...";
              }
              return (
                <MenuBarExtra.Item
                  key={entry.id}
                  title={title}
                  icon={Icon.Globe}
                  onAction={() => open(entry.url)}
                  alternate={
                    <MenuBarExtra.Item
                      icon={Icon.Check}
                      title={"Mark as Read: " + title}
                      onAction={async () => {
                        await entries.mutate(handleMarkAsRead(entry));
                      }}
                    />
                  }
                />
              );
            })}
          </MenuBarExtra.Section>
        );
      })}
      <MenuBarExtra.Section>
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
