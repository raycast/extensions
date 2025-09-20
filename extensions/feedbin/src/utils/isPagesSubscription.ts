import { Subscription } from "./api";

export function isPagesSubscription(subscription: Subscription) {
  return subscription.site_url === "http://pages.feedbinusercontent.com";
}
