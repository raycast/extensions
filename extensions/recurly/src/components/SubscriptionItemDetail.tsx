import {List} from "@raycast/api";
import {Subscription, SubscriptionAddOn} from "recurly";

export type SubscriptionItemDetailProps = {
  subscription: Subscription;
};

export default function SubscriptionItemDetail({subscription}: SubscriptionItemDetailProps) {
  return <List.Item.Detail markdown={formatSubscriptionMarkdown(subscription)}/>
}

const formatSubscriptionMarkdown = (subscription: Subscription) =>
  `${formatPlan(subscription)}
`

const formatPlan = (subscription: Subscription) =>
  !subscription.plan
    ? 'No plan set'
    : `
Created at ${formatDateTime(subscription.createdAt)} 

Activated at ${formatDateTime(subscription.activatedAt)}

Updated at ${formatDateTime(subscription.updatedAt)}

Canceled at ${formatDateTime(subscription.canceledAt)}

Expires at ${formatDateTime(subscription.expiresAt)}

---

# Plan

## ${subscription.plan.name}

Plan: ${subscription.unitAmount} ${subscription.currency}

Add-Ons: ${subscription.addOnsTotal || 0} ${subscription.currency}

Subtotal: ${subscription.subtotal} ${subscription.currency}

Tax: ${subscription.tax || 0} ${subscription.currency}

Total: ${subscription.total} ${subscription.currency}

${formatAddOns(subscription)}`;

const formatAddOns = (subscription: Subscription) =>
  !subscription.addOns || subscription.addOns.length === 0
    ? ''
    : `\n\n## AddOns\n\n${subscription.addOns.map(addOn => formatAddOn(subscription, addOn)).join("\n")}`;

const formatAddOn = (subscription: Subscription, addOnMini: SubscriptionAddOn | null | undefined) =>
  addOnMini && `- ${addOnMini.addOn?.name} (${addOnPrice(addOnMini)} ${subscription.currency})`

const addOnPrice = (addOnMini: SubscriptionAddOn) =>
  (addOnMini.quantity || 0) * (addOnMini.unitAmount || 0)

const formatDateTime = (date: Date | null | undefined) =>
  !date
    ? 'Not applicable'
    : `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`