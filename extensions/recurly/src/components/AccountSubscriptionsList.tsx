import { List } from "@raycast/api";
import { UseRecurly } from "../hooks/useRecurly";
import { Account } from "recurly";
import useRecurlyAccountSubscriptions from "../hooks/useRecurlyAccountSubscriptions";
import SubscriptionItemDetail from "./SubscriptionItemDetail";

export type AccountSubscriptionsListProps = {
  recurly: UseRecurly;
  account: Account;
};

export default function AccountSubscriptionsList({ recurly, account }: AccountSubscriptionsListProps) {
  const { subscriptionsLoading, subscriptions } = useRecurlyAccountSubscriptions(recurly, account.id || "");

  return (
    <List isLoading={subscriptionsLoading} isShowingDetail={true} navigationTitle={account.email || "No Email"}>
      {subscriptions.map((subscription, idx) => (
        <List.Item
          key={subscription.id || idx}
          title={`${subscription.plan?.name} (${subscription.plan?.code})`}
          icon={formatSubscriptionStateEmoji(subscription.state)}
          detail={<SubscriptionItemDetail subscription={subscription} />}
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
