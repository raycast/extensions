import { List, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import React, { useCallback } from "react";
import { withAuth } from "./contexts/AuthContext";
import { withAuthGuard } from "./hooks/useAuthGuard";
import { useInfiniteCustomers } from "./hooks/useQueries";
import type { Customer } from "dodopayments/resources";
import { formatDateShort } from "./utils/formatting";

function CustomersList() {
  const { data: customersData, isLoading, error, fetchNextPage, hasNextPage } = useInfiniteCustomers({ limit: 50 });

  // Show toast notifications based on query state
  React.useEffect(() => {
    if (isLoading) {
      showToast({
        style: Toast.Style.Animated,
        title: "Loading customers...",
      });
    } else if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load customers",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } else if (customersData) {
      const totalItems = customersData.pages.reduce((acc, page) => acc + page.items.length, 0);
      showToast({
        style: Toast.Style.Success,
        title: `Loaded ${totalItems} customers`,
      });
    }
  }, [isLoading, error, customersData]);

  // Flatten all pages into a single array
  const customers: Customer[] = React.useMemo(
    () => customersData?.pages.flatMap((page) => page.items) || [],
    [customersData?.pages],
  );

  const handleFetchNextPage = useCallback(() => fetchNextPage(), [fetchNextPage]);

  if (!isLoading && customers.length === 0) {
    return (
      <List searchBarPlaceholder="Search customers...">
        <List.EmptyView
          icon={Icon.PersonLines}
          title="No Customers Found"
          description="No customers are available for your account."
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search customers..."
      pagination={{
        hasMore: hasNextPage,
        pageSize: 50,
        onLoadMore: handleFetchNextPage,
      }}
      isShowingDetail
    >
      {customers.map((customer) => (
        <List.Item
          key={customer.customer_id}
          icon={Icon.Person}
          title={customer.name || customer.email}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  {/* Customer Information with clickable email */}
                  <List.Item.Detail.Metadata.Link
                    title="Email"
                    text={customer.email}
                    target={`mailto:${customer.email}`}
                  />
                  <List.Item.Detail.Metadata.Label title="Name" text={customer.name || "—"} />
                  <List.Item.Detail.Metadata.Label title="Phone" text={customer.phone_number || "—"} />
                  <List.Item.Detail.Metadata.Label title="Created At" text={formatDateShort(customer.created_at)} />

                  <List.Item.Detail.Metadata.Separator />

                  {/* Additional Details */}
                  <List.Item.Detail.Metadata.Label title="Customer ID" text={customer.customer_id} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open in Dodo Payments"
                url={`https://app.dodopayments.com/sales/customers/${customer.customer_id}?backTo=/sales/customers`}
                icon={Icon.Globe}
              />

              <Action.CopyToClipboard title="Copy Customer ID" content={customer.customer_id} />

              <Action.CopyToClipboard
                title="Copy Email"
                content={customer.email}
                shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
              />
              <Action.OpenInBrowser
                title="Email Customer"
                url={`mailto:${customer.email}`}
                icon={Icon.Envelope}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
              {customer.phone_number && (
                <Action.CopyToClipboard
                  title="Copy Phone Number"
                  content={customer.phone_number}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

// Export the component wrapped with authentication
export default withAuth(withAuthGuard(CustomersList));
