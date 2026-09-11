import { Action, ActionPanel, Icon, List, popToRoot, launchCommand, LaunchType } from "@raycast/api";
import { useEffect, useState } from "react";
import { showFailureToast } from "@raycast/utils";
import { useWooCommerce } from "../hooks/useWooCommerce";
import type { WooCustomer, WooStore } from "../types/types";

export function SearchCustomers({ store }: { store: WooStore }) {
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  // Possible roles:
  // all, administrator, editor, author, contributor, subscriber, customer and shop_manager
  const {
    data: customers,
    isLoading,
    error,
  } = useWooCommerce<WooCustomer[]>(store, "customers", {
    per_page: "20",
    search: searchText,
    role: filterStatus,
  });

  useEffect(() => {
    if (!error) return;
    console.error(error);
    void showFailureToast({
      title: "Error Fetching Customers",
      message: error.message || "Please check your store settings and try again.",
    });
  }, [error]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search customers..."
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by type"
          onChange={(value) => setFilterStatus(value as WooCustomer["role"] | "")}
          value={filterStatus}
        >
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Administrator" value="administrator" />
          <List.Dropdown.Item title="Editor" value="editor" />
          <List.Dropdown.Item title="Author" value="author" />
          <List.Dropdown.Item title="Contributor" value="contributor" />
          <List.Dropdown.Item title="Subscriber" value="subscriber" />
          <List.Dropdown.Item title="Customer" value="customer" />
          <List.Dropdown.Item title="Shop Manager" value="shop_manager" />
        </List.Dropdown>
      }
    >
      {customers?.map((customer) => {
        const fullName = `${customer.first_name} ${customer.last_name}`.trim() || customer.username || customer.email;

        return (
          <List.Item
            key={customer.id}
            icon={customer.avatar_url ? { source: customer.avatar_url } : Icon.Person}
            title={fullName}
            subtitle={customer.email}
            accessories={[...(customer.role ? [{ tag: customer.role }] : [])]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open in WooCommerce"
                  url={`${store.storeUrl}/wp-admin/user-edit.php?user_id=${customer.id}`}
                  onOpen={() => popToRoot()}
                />
              </ActionPanel>
            }
          />
        );
      })}

      {!isLoading && error && (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to Load Customers"
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

      {!isLoading && !error && customers?.length === 0 && (
        <List.EmptyView title="No Customers Found" description="Try a different search term." />
      )}
    </List>
  );
}
