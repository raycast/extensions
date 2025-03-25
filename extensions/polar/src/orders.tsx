import { Action, ActionPanel, Detail, List } from "@raycast/api";
import React, { useCallback, useEffect, useState } from "react";
import { authenticate } from "./oauth";
import { PolarProvider, queryClient } from "./providers";
import { QueryClientProvider } from "@tanstack/react-query";
import { useOrders } from "./hooks/orders";
import { formatCurrencyAndAmount } from "./utils";
import { Order } from "@polar-sh/sdk/models/components";
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
        <OrdersView />
      </PolarProvider>
    </QueryClientProvider>
  );
}

interface OrderProps {
  order: Order;
}

const OrderItem = ({ order }: OrderProps) => {
  const { data: organization, isLoading } = useOrganization(
    order.product.organizationId,
  );

  return (
    <List.Item
      key={order.id}
      title={order.product.name}
      subtitle={formatCurrencyAndAmount(order.amount)}
      detail={
        <List.Item.Detail
          isLoading={isLoading}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Link
                title="Customer"
                text={order.user.email}
                target={`mailto:${order.user.email}`}
              />
              <List.Item.Detail.Metadata.Label
                title="Timestamp"
                text={order.createdAt.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "numeric",
                  minute: "numeric",
                })}
              />
              <List.Item.Detail.Metadata.Label
                title="Organization"
                text={organization?.name}
              />
              <List.Item.Detail.Metadata.Label
                title="Product"
                text={order.product.name}
              />
              <List.Item.Detail.Metadata.TagList title="Type">
                <List.Item.Detail.Metadata.TagList.Item
                  text={order.subscription ? "Subscription" : "Purchase"}
                  color={order.subscription ? "orange" : "green"}
                />
                {order.subscription && (
                  <List.Item.Detail.Metadata.TagList.Item
                    text={
                      order.subscription.recurringInterval === "year"
                        ? "Yearly"
                        : "Monthly"
                    }
                  />
                )}
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Label
                title="Discount"
                text={order.discount?.code ?? "—"}
              />
              <List.Item.Detail.Metadata.Label
                title="Amount"
                text={formatCurrencyAndAmount(order.amount)}
              />
              <List.Item.Detail.Metadata.Label
                title="Tax"
                text={
                  order.taxAmount
                    ? formatCurrencyAndAmount(order.taxAmount)
                    : "—"
                }
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Polar"
            url={`https://polar.sh/dashboard/${organization?.slug}/sales/${order.id}`}
          />
          <Action.CopyToClipboard title="Copy Order ID" content={order.id} />
          <Action.OpenInBrowser
            title="Email Customer"
            url={`mailto:${order.user.email}`}
          />
        </ActionPanel>
      }
      accessories={[
        {
          text: order.createdAt.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
        },
      ]}
    />
  );
};

const OrdersView = () => {
  const {
    data: orders,
    isLoading,
    fetchNextPage,
    hasNextPage,
  } = useOrders({}, 20);

  const handleLoadMore = useCallback(() => {
    fetchNextPage();
  }, [fetchNextPage]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter Orders..."
      filtering={true}
      pagination={{
        pageSize: 20,
        hasMore: hasNextPage,
        onLoadMore: handleLoadMore,
      }}
      isShowingDetail
    >
      {orders?.pages
        .flatMap((page) => page.result.items)
        .map((order) => <OrderItem key={order.id} order={order} />)}
    </List>
  );
};
