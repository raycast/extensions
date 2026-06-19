import { List, ActionPanel, Action, popToRoot, launchCommand, LaunchType, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { showFailureToast } from "@raycast/utils";
import { useWooCommerce } from "../hooks/useWooCommerce";
import type { WooOrder, WooStore } from "../types/types";
import { formatCurrency } from "../helpers/formatters";

export function SearchOrders({ store }: { store: WooStore }) {
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const {
    data: orders,
    isLoading,
    error,
  } = useWooCommerce<WooOrder[]>(store, "orders", {
    per_page: "20",
    orderby: "date",
    search: searchText,
    status: filterStatus,
  });

  useEffect(() => {
    if (!error) return;
    console.error(error);
    void showFailureToast({
      title: "Error Fetching Orders",
      message: error.message || "Please check your store settings and try again.",
    });
  }, [error]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search orders..."
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by status"
          onChange={(value) => setFilterStatus(value as WooOrder["status"] | "")}
          value={filterStatus}
        >
          <List.Dropdown.Item title="All" value="" />
          <List.Dropdown.Item title="Pending" value="pending" />
          <List.Dropdown.Item title="Processing" value="processing" />
          <List.Dropdown.Item title="On Hold" value="on-hold" />
          <List.Dropdown.Item title="Completed" value="completed" />
          <List.Dropdown.Item title="Cancelled" value="cancelled" />
          <List.Dropdown.Item title="Refunded" value="refunded" />
          <List.Dropdown.Item title="Failed" value="failed" />
        </List.Dropdown>
      }
    >
      {orders?.map((order) => (
        <List.Item
          key={order.id}
          title={`#${order.id} - ${order.billing.first_name} ${order.billing.last_name}`}
          subtitle={order.billing.email}
          accessories={[{ text: formatCurrency(order.total, store) }, { tag: order.status }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open in WooCommerce"
                url={`${store.storeUrl}/wp-admin/post.php?post=${order.id}&action=edit`}
                onOpen={() => popToRoot()}
              />
            </ActionPanel>
          }
        />
      ))}

      {!isLoading && error && (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to Load Orders"
          description={error.message || "Please check your store settings and try again."}
          actions={
            <ActionPanel>
              <Action
                title="Manage Stores"
                icon={Icon.Gear}
                onAction={() =>
                  launchCommand({
                    name: "manage-stores",
                    type: LaunchType.UserInitiated,
                  })
                }
              />
            </ActionPanel>
          }
        />
      )}

      {!isLoading && !error && orders?.length === 0 && (
        <List.EmptyView title="No Orders Found" description="Try a different search or status filter." />
      )}
    </List>
  );
}
