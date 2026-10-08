import { List } from "@raycast/api";
import { Subscription } from "recurly";
import { formatCustomFields, formatDateTime } from "./AccountDetail";

export type SubscriptionItemDetailProps = {
  subscription: Subscription;
};

const Label = List.Item.Detail.Metadata.Label;

export default function SubscriptionItemDetail({ subscription }: SubscriptionItemDetailProps) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <Label title="Subscription ID" text={subscription.uuid || ""} />

          <List.Item.Detail.Metadata.Separator />

          <Label title="Plan" />
          <Label title="Name" text={subscription.plan?.name || ""} />
          <Label title="Code" text={subscription.plan?.code || ""} />

          <List.Item.Detail.Metadata.Separator />

          <Label title="Current Period" text={formatCurrentPeriod(subscription)} />
          <Label title="Auto Renew" text={subscription.autoRenew ? "Yes" : "No"} />
          <Label title="Collection" text={subscription.collectionMethod || "Unknown"} />
          {subscription.autoRenew && (
            <Label title="Renews On" text={formatDateTime(subscription.currentPeriodEndsAt) || ""} />
          )}
          <Label title="Started On" text={formatDateTime(subscription.currentTermStartedAt) || ""} />

          <List.Item.Detail.Metadata.Separator />

          <Label title="Subscription Details" />
          {formatSubscriptionDetails(subscription)}

          <List.Item.Detail.Metadata.Separator />

          <Label title="Custom Fields" />
          {formatCustomFields(subscription.customFields)}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

const formatSubscriptionDetails = (subscription: Subscription) =>
  [
    <Label
      key="plan"
      title={`${subscription.quantity} x ${subscription.plan?.name}`}
      text={`${subscription.unitAmount} ${subscription.currency}`}
    />,
  ]
    .concat(
      !subscription.addOns
        ? []
        : subscription.addOns.map((addOn) => (
            <Label
              key={addOn.id}
              title={`${addOn.quantity} x ${addOn.addOn?.name}`}
              text={`${addOn.unitAmount} ${subscription.currency}`}
            />
          ))
    )
    .concat(
      <Label key="estimated-total" title="Estimated Total*" text={`${subscription.total} ${subscription.currency}`} />,
      <Label key="asterisk" title="* Does not include coupons or discounts." />
    );

const formatCurrentPeriod = (subscription: Subscription) =>
  `${formatDate(subscription.currentPeriodStartedAt)} — ${formatDate(subscription.currentPeriodEndsAt)}`;

const formatDate = (date: Date | null | undefined) => (date ? date.toLocaleDateString() : "Unknown");
