import { List, Icon } from "@raycast/api";
import { NotificationDropdown, NotificationList } from "./components/notifications";
import { NotificationFilterOptions, NotificationStatusFilter } from "./domain/notification";
import { useMemo, useState } from "react";
import { useNotifications } from "./hooks/useNotifications";

export default function Command() {
  const [filter, setFilter] = useState<NotificationStatusFilter>(NotificationStatusFilter.Unread);
  const { items, isLoading, mutate, pagination } = useNotifications(filter);
  const { pinnedNotifications, unpinnedNotifications } = useMemo(() => {
    return {
      pinnedNotifications: items.filter((item) => item.pinned),
      unpinnedNotifications: items.filter((item) => !item.pinned),
    };
  }, [items]);

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      searchBarAccessory={
        <NotificationDropdown options={NotificationFilterOptions} value={filter} onFilterChange={setFilter} />
      }
      throttle
    >
      {items.length <= 0 ? (
        <List.EmptyView
          icon={Icon.Tray}
          title={filter === NotificationStatusFilter.All ? "No notifications found." : "No unread notifications."}
        />
      ) : (
        <>
          <List.Section>
            <NotificationList items={pinnedNotifications} mutate={mutate} />
          </List.Section>
          <List.Section>
            <NotificationList items={unpinnedNotifications} mutate={mutate} />
          </List.Section>
        </>
      )}
    </List>
  );
}
