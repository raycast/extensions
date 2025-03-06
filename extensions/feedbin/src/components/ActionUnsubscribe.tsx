import {
  Action,
  Alert,
  Icon,
  clearSearchBar,
  confirmAlert,
} from "@raycast/api";
import { useFeedbinApiContext } from "../utils/FeedbinApiContext";
import { unsubscribe } from "../utils/api";
import { isPagesSubscription } from "../utils/isPagesSubscription";
import { refreshMenuBar } from "../utils/refreshMenuBar";

export interface ActionUnsubscribeProps {
  feedId: number;
}

export function ActionUnsubscribe(props: ActionUnsubscribeProps) {
  const { subscriptions } = useFeedbinApiContext();

  const subscription = subscriptions.data?.find(
    (s) => s.feed_id === props.feedId,
  );

  if (!subscription) return null;

  // Don't allow unsubscribing from Pages feeds
  if (isPagesSubscription(subscription)) {
    return null;
  }

  return (
    <Action
      title="Unsubscribe"
      icon={Icon.MinusCircle}
      style={Action.Style.Destructive}
      shortcut={{
        key: "x",
        modifiers: ["ctrl"],
      }}
      onAction={async () => {
        if (
          await confirmAlert({
            title: `Are you sure?`,
            message: subscription.feed_url,
            icon: Icon.ExclamationMark,
            primaryAction: {
              title: "Unsubscribe",
              style: Alert.ActionStyle.Destructive,
            },
          })
        ) {
          await subscriptions.mutate(unsubscribe(subscription.id), {
            optimisticUpdate: (subs) =>
              subs?.filter((sub) => sub.id !== subscription.id),
          });
          refreshMenuBar();
          clearSearchBar();
        }
      }}
    />
  );
}
