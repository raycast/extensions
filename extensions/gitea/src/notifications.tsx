import { List, Icon } from "@raycast/api";
import { NotificationDropdown, NotificationMenu } from "./components/notifications";
import { NotificationSortTypes, NotificationStatusFilter } from "./types/sorts/notification-search";
import { useState } from "react";
import { useNotifications } from "./hooks/useNotifications";

export default function Command() {
  const [filter, setFilter] = useState<NotificationStatusFilter>(NotificationStatusFilter.Unread);
  const { items, isLoading, mutate, pagination } = useNotifications(filter);

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      searchBarAccessory={
        <NotificationDropdown
          notifyFilter={NotificationSortTypes}
          onFilterChange={(v) => setFilter(v as NotificationStatusFilter)}
        />
      }
      throttle
    >
      {items.length <= 0 ? (
        <List.EmptyView icon={Icon.Tray} title="No unread notifications." />
      ) : (
        <>
          <List.Section>
            <NotificationMenu items={items.filter((v) => v.pinned)} mutate={mutate} />
          </List.Section>
          <List.Section>
            <NotificationMenu items={items.filter((v) => !v.pinned)} mutate={mutate} />
          </List.Section>
        </>
      )}
    </List>
  );
}
