import { Action, ActionPanel, Detail, List } from "@raycast/api";
import React, { useCallback, useEffect, useState } from "react";
import { authenticate } from "./oauth";
import { PolarProvider, queryClient } from "./providers";
import { QueryClientProvider } from "@tanstack/react-query";
import { useCustomers } from "./hooks/customers";
import { Customer } from "@polar-sh/sdk/dist/commonjs/models/components/customer";
import { useOrganization } from "./hooks/organizations";

export default function Command() {
  const [accessToken, setAccessToken] = useState<string>();

  useEffect(() => {
    authenticate().then(setAccessToken);
  }, []);

  if (!accessToken) {
    return <Detail isLoading={true} markdown="Authenticating with Polar..." />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <PolarProvider accessToken={accessToken}>
        <CustomersView />
      </PolarProvider>
    </QueryClientProvider>
  );
}

interface CustomerProps {
  customer: Customer;
}

const CustomerItem = ({ customer }: CustomerProps) => {
  const { data: organization } = useOrganization(customer.organizationId);

  return (
    <List.Item
      key={customer.id}
      title={customer.email}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Email"
                text={customer.email}
              />
              <List.Item.Detail.Metadata.Label
                title="Name"
                text={customer.name ?? "—"}
              />
              <List.Item.Detail.Metadata.Label
                title="First Seen"
                text={new Date(customer.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "numeric",
                  minute: "numeric",
                })}
              />
              <List.Item.Detail.Metadata.Label
                title="Organization"
                text={organization?.name ?? "—"}
              />
              <List.Item.Detail.Metadata.Separator />
              {/* Add billing info */}
              <List.Item.Detail.Metadata.Label
                title="Address 1"
                text={customer.billingAddress?.line1 ?? "—"}
              />
              <List.Item.Detail.Metadata.Label
                title="Address 2"
                text={customer.billingAddress?.line2 ?? "—"}
              />
              <List.Item.Detail.Metadata.Label
                title="City"
                text={customer.billingAddress?.city ?? "—"}
              />
              <List.Item.Detail.Metadata.Label
                title="State"
                text={customer.billingAddress?.state ?? "—"}
              />
              <List.Item.Detail.Metadata.Label
                title="Country"
                text={customer.billingAddress?.country ?? "—"}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Email Customer"
            url={`mailto:${customer.email}`}
          />
          <Action.CopyToClipboard
            title="Copy Customer ID"
            content={customer.id}
          />
        </ActionPanel>
      }
      accessories={[
        {
          text: organization?.name,
        },
      ]}
    />
  );
};

const CustomersView = () => {
  const {
    data: customers,
    isLoading,
    fetchNextPage,
    hasNextPage,
  } = useCustomers({}, 20);

  const handleLoadMore = useCallback(() => {
    fetchNextPage();
  }, [fetchNextPage]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter Customers..."
      filtering={true}
      pagination={{
        pageSize: 20,
        hasMore: hasNextPage,
        onLoadMore: handleLoadMore,
      }}
      isShowingDetail
    >
      {customers?.pages
        .flatMap((page) => page.result.items)
        .map((customer) => (
          <CustomerItem key={customer.id} customer={customer} />
        ))}
    </List>
  );
};
