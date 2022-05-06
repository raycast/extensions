import { List } from "@raycast/api";
import {UseRecurly} from "../hooks/useRecurly";
import {Account} from "recurly";
import useRecurlyAccountSubscriptions from "../hooks/useRecurlyAccountSubscriptions";
import SubscriptionItemDetail from "./SubscriptionItemDetail";

export type AccountSubscriptionsListProps = {
  recurly: UseRecurly;
  account: Account;
};

export default function AccountSubscriptionsList({recurly, account}: AccountSubscriptionsListProps) {
  const {subscriptionsLoading, subscriptions} = useRecurlyAccountSubscriptions(recurly, account.id || '');

  return <List
    isLoading={subscriptionsLoading}
    isShowingDetail={true}
  >
    {subscriptions.map((subscription, idx) => <List.Item
      key={subscription.id || idx}
      title={subscription.uuid || 'no id'}
      detail={<SubscriptionItemDetail subscription={subscription} />}
    />)}
  </List>
}