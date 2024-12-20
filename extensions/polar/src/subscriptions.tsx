import { Action, ActionPanel, Detail, List } from "@raycast/api";
import React, { useCallback, useEffect, useState } from "react";
import { authenticate } from "./oauth";
import { PolarProvider, queryClient } from "./providers";
import { QueryClientProvider } from "@tanstack/react-query";
import { useListSubscriptions } from "./hooks/subscriptions";
import { formatCurrencyAndAmount } from "./utils";
import { Subscription } from "@polar-sh/sdk/models/components";
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
        <SubscriptionsView />
      </PolarProvider>
    </QueryClientProvider>
  );
}

interface SubscriptionItemProps {
  subscription: Subscription;
}

const SubscriptionItem = ({ subscription }: SubscriptionItemProps) => {
  const { data: organization, isLoading } = useOrganization(
    subscription.product.organizationId,
  );

  return (
    <List.Item
      key={subscription.id}
      title={subscription.product.name}
      subtitle={formatCurrencyAndAmount(subscription.amount ?? 0)}
      detail={
        <List.Item.Detail
          isLoading={isLoading}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Link
                title="Customer"
                text={subscription.user.email}
                target={`mailto:${subscription.user.email}`}
              />
              <List.Item.Detail.Metadata.Label
                title="Subscribed At"
                text={subscription.createdAt.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "numeric",
                  minute: "numeric",
                })}
              />
              {subscription.status === "active" && (
                <List.Item.Detail.Metadata.Label
                  title={
                    subscription.cancelAtPeriodEnd ? "Expires At" : "Renews At"
                  }
                  text={
                    subscription.currentPeriodEnd?.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }) ?? "—"
                  }
                />
              )}
              <List.Item.Detail.Metadata.Label
                title="Organization"
                text={organization?.name}
              />
              <List.Item.Detail.Metadata.Label
                title="Product"
                text={subscription.product.name}
              />
              <List.Item.Detail.Metadata.Label
                title="Interval"
                text={
                  subscription.recurringInterval === "year"
                    ? "Yearly"
                    : "Monthly"
                }
              />
              <List.Item.Detail.Metadata.Label
                title="Amount"
                text={formatCurrencyAndAmount(subscription.amount ?? 0)}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Polar"
            url={`https://polar.sh/dashboard/${organization?.slug}/sales/subscriptions`}
          />
          <Action.CopyToClipboard
            title="Copy Subscription ID"
            content={subscription.id}
          />
          <Action.OpenInBrowser
            title="Email Customer"
            url={`mailto:${subscription.user.email}`}
          />
        </ActionPanel>
      }
      accessories={[
        {
          text: subscription.createdAt.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
        },
      ]}
    />
  );
};

const SubscriptionsView = () => {
  const {
    data: subscriptions,
    isLoading,
    hasNextPage,
    fetchNextPage,
  } = useListSubscriptions(
    {
      active: true,
    },
    20,
  );

  const handleLoadMore = useCallback(() => {
    fetchNextPage();
  }, [fetchNextPage]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter Subscriptions..."
      filtering={true}
      pagination={{
        pageSize: 20,
        hasMore: hasNextPage,
        onLoadMore: handleLoadMore,
      }}
      isShowingDetail
    >
      {subscriptions?.pages
        .flatMap((page) => page.result.items)
        .map((subscription) => (
          <SubscriptionItem key={subscription.id} subscription={subscription} />
        ))}
    </List>
  );
};
