import { Action, ActionPanel, List } from "@raycast/api";
import { UseRecurly } from "../hooks/useRecurly";
import { Account } from "recurly";
import useRecurlyAccountSubscriptions from "../hooks/useRecurlyAccountSubscriptions";
import SubscriptionItemDetail from "./SubscriptionItemDetail";
import { TenantConfiguration } from "../TenantConfiguration";

export type AccountSubscriptionsListProps = {
  recurly: UseRecurly;
  account: Account;
  tenant: TenantConfiguration;
};

export default function AccountSubscriptionsList({ recurly, account, tenant }: AccountSubscriptionsListProps) {
  const { subscriptionsLoading, subscriptions } = useRecurlyAccountSubscriptions(recurly, account.id || "");

  return (
    <List isLoading={subscriptionsLoading} isShowingDetail={true} navigationTitle={account.email || "No Email"}>
      {subscriptions.map((subscription, idx) => (
        <List.Item
          key={subscription.id || idx}
          title={`${subscription.plan?.name} (${subscription.plan?.code})`}
          icon={formatSubscriptionStateEmoji(subscription.state)}
          detail={<SubscriptionItemDetail subscription={subscription} />}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                url={`https://${tenant.subdomain}.recurly.com/subscriptions/${subscription.uuid}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

const formatSubscriptionStateEmoji = (state: string | null | undefined) => {
  switch (state) {
    case "active":
      return "🟢";
    case "canceled":
      return "🟡";
    case "expired":
      return "⚪";
    case "failed":
      return "🔴";
    case "future":
      return "🔵";
    case "paused":
      return "🟣";
    default:
      return "⚪";
  }
};
