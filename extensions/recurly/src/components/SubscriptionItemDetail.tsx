import {List} from "@raycast/api";
import {CouponRedemptionMini, Subscription} from "recurly";

export type SubscriptionItemDetailProps = {
  subscription: Subscription;
};

export default function SubscriptionItemDetail({subscription}: SubscriptionItemDetailProps) {
  return <List.Item.Detail markdown={formatSubscriptionMarkdown(subscription)}/>
}

const formatSubscriptionMarkdown = (subscription: Subscription) =>
  `# ${subscription.uuid}
---

`

const formatCouponRedemptions = (subscription: Subscription) =>
  subscription.couponRedemptions && subscription.couponRedemptions.length > 0
    ? subscription.couponRedemptions
      .map(formatCouponRedemption).join("\n\n")
    : '';

const formatCouponRedemption = (redemption: CouponRedemptionMini) =>
  `${redemption.coupon?.name} (${redemption.coupon?.code})
`