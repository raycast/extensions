import { Action, ActionPanel, Icon } from "@raycast/api";
import { shortcuts } from "../../data/shortcuts";
import { Subscription } from "../../types";
import { getSubscriptionTitle } from "../../utils";
import SubscriptionsView from "./SubscriptionsView";

export type SetSubscriptionHidden = (subscription: Subscription, isHidden: boolean) => Promise<void>;

/** The actions of a statement charge that belongs to a detected subscription. */
export default function SubscriptionActions(props: { subscription: Subscription; onSetHidden: SetSubscriptionHidden }) {
  const { subscription, onSetHidden } = props;

  return (
    <ActionPanel.Section title={getSubscriptionTitle(subscription)}>
      {subscription.hidden ? (
        <Action
          title="Unhide Subscription"
          icon={Icon.Eye}
          shortcut={shortcuts.remove}
          onAction={() => onSetHidden(subscription, false)}
        />
      ) : (
        <>
          <Action.Push
            title="Show in Subscriptions"
            icon={Icon.Repeat}
            target={<SubscriptionsView selectedKey={subscription.key} navigationTitle="Subscriptions" />}
          />
          <Action
            title="Not a Subscription"
            icon={Icon.EyeDisabled}
            style={Action.Style.Destructive}
            shortcut={shortcuts.remove}
            onAction={() => onSetHidden(subscription, true)}
          />
        </>
      )}
    </ActionPanel.Section>
  );
}
