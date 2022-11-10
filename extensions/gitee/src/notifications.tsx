import { List } from "@raycast/api";
import React, { useState } from "react";
import { getNotifications } from "./hooks/hooks";
import { GiteeEmptyView } from "./components/GiteeEmptyView";
import { notificationFilter } from "./utils/constants";
import { NotificationItem } from "./components/NotificationItem";

export default function MyRepositories() {
  const [filter, setFilter] = useState<string>(notificationFilter[0].value + "");
  const [refresh, setRefresh] = useState<number>(0);
  const { notifications, loading } = getNotifications(filter, refresh);

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder={"Search notifications"}
      searchBarAccessory={
        <List.Dropdown tooltip="Issues Filter" storeValue={true} onChange={setFilter}>
          {notificationFilter.map((value) => {
            return <List.Dropdown.Item key={value.value} title={value.label} value={value.value} />;
          })}
        </List.Dropdown>
      }
    >
      <GiteeEmptyView title={"No Notifications"} />
      <List.Section title={"Unread"}>
        {notifications?.map((notification) => {
          return (
            notification.unread && (
              <NotificationItem key={notification.id} notification={notification} setRefresh={setRefresh} />
            )
          );
        })}
      </List.Section>
      <List.Section title={"Read"}>
        {notifications?.map((notification) => {
          return (
            !notification.unread && (
              <NotificationItem key={notification.id} notification={notification} setRefresh={setRefresh} />
            )
          );
        })}
      </List.Section>
    </List>
  );
}
