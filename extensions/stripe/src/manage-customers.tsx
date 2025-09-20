import { Action, ActionPanel, Icon, List, Color, getPreferenceValues, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { withEnvContext, ListContainer } from "./components";
import { useStripeDashboard, useEnvContext } from "./hooks";
import { STRIPE_API_VERSION } from "./enums";
import SubscriptionList from "./manage-subscriptions";
import CustomerPaymentsList from "./customer-payments";
import Stripe from "stripe";

const { stripeTestApiKey, stripeLiveApiKey } = getPreferenceValues();

// Create Stripe clients for both environments
const stripeTest = stripeTestApiKey ? new Stripe(stripeTestApiKey, { apiVersion: STRIPE_API_VERSION }) : null;
const stripeLive = stripeLiveApiKey ? new Stripe(stripeLiveApiKey, { apiVersion: STRIPE_API_VERSION }) : null;

function CustomerList() {
  const { environment } = useEnvContext();
  const { dashboardUrl } = useStripeDashboard();
  const stripe = environment === "test" ? stripeTest : stripeLive;
  const [searchQuery, setSearchQuery] = useState("");
  const { push } = useNavigation();

  const { isLoading, data, pagination } = useCachedPromise(
    (query: string) => async (options: { page: number; cursor?: string }) => {
      if (!stripe) {
        throw new Error(`Stripe ${environment} API key is not configured`);
      }

      // Use search if query is provided
      if (query && query.trim()) {
        // Remove mailto: prefix if present
        const cleanQuery = query.replace(/^mailto:/i, "").trim();

        // If the query doesn't contain a colon, assume it's an email search
        let searchQuery = cleanQuery;
        if (!cleanQuery.includes(":")) {
          searchQuery = `email~"${cleanQuery}"`;
        }

        const searchParams: Stripe.CustomerSearchParams = {
          query: searchQuery,
          limit: 25,
          expand: ["data.subscriptions"],
        };

        // Add page for search pagination
        if (options.page && options.page > 1) {
          searchParams.page = String(options.page);
        }

        const response = await stripe.customers.search(searchParams);

        return {
          data: response.data,
          hasMore: response.has_more,
          cursor: undefined, // Search uses page-based pagination
        };
      } else {
        // Use list when no query
        const params: Stripe.CustomerListParams = {
          limit: 25,
          expand: ["data.subscriptions"],
        };

        // Add starting_after for pagination
        if (options.cursor) {
          params.starting_after = options.cursor;
        }

        const response = await stripe.customers.list(params);

        return {
          data: response.data,
          hasMore: response.has_more,
          cursor: response.data[response.data.length - 1]?.id,
        };
      }
    },
    [searchQuery],
    {
      keepPreviousData: true,
    },
  );

  return (
    <ListContainer
      isLoading={isLoading}
      pagination={pagination}
      searchBarPlaceholder="Search by customer email..."
      onSearchTextChange={setSearchQuery}
    >
      {data?.map((customer: Stripe.Customer) => {
        const subscriptions = customer.subscriptions as Stripe.ApiList<Stripe.Subscription> | undefined;
        const hasSubscriptions = subscriptions?.data && subscriptions.data.length > 0;
        const subscriptionCount = subscriptions?.data?.length || 0;

        return (
          <List.Item
            key={customer.id}
            title={customer.email || customer.name || "Unnamed Customer"}
            subtitle={customer.id}
            accessories={[
              {
                date: new Date(customer.created * 1000),
                tooltip: "Created",
              },
              ...(hasSubscriptions
                ? [
                    {
                      tag: {
                        value: `${subscriptionCount} subscription${subscriptionCount > 1 ? "s" : ""}`,
                        color: Color.Blue,
                      },
                    },
                  ]
                : []),
              ...(customer.currency
                ? [
                    {
                      text: customer.currency.toUpperCase(),
                      tooltip: "Default Currency",
                    },
                  ]
                : []),
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="View Payments"
                  icon={Icon.Coins}
                  onAction={() => push(<CustomerPaymentsList customerId={customer.id} />)}
                />
                <Action
                  title="View Subscriptions"
                  icon={Icon.Calendar}
                  onAction={() => push(<SubscriptionList customerId={customer.id} />)}
                />
                <Action.OpenInBrowser
                  title="View in Stripe Dashboard"
                  url={`${dashboardUrl}/customers/${customer.id}`}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                {customer.email && (
                  <Action.CopyToClipboard
                    title="Copy Email"
                    content={customer.email}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                )}
                <Action.CopyToClipboard
                  title="Copy Customer ID"
                  content={customer.id}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </ListContainer>
  );
}

export default withEnvContext(CustomerList);
