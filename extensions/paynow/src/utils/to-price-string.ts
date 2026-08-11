import type { ManagementSchemas } from "@paynow-gg/typescript-sdk";
import { getPreferenceValues } from "@raycast/api";

type ToPriceStringObjectParam = Pick<
  ManagementSchemas["ProductDto"],
  "price" | "subscription_interval_scale" | "subscription_interval_value"
> &
  Partial<Pick<ManagementSchemas["ProductDto"], "allow_subscription" | "allow_one_time_purchase">>;

export function toPriceString(priceObj: ToPriceStringObjectParam): string;
export function toPriceString(price: number): string;
export function toPriceString(arg1: number | ToPriceStringObjectParam): string {
  const currency = getPreferenceValues<ExtensionPreferences>().currency || "USD";

  if (typeof arg1 === "number") {
    return arg1.toLocaleString("en-US", {
      style: "currency",
      currency: currency,
    });
  }

  const {
    price,
    subscription_interval_scale: interval,
    subscription_interval_value: duration,
    allow_one_time_purchase = false,
    allow_subscription = false,
  } = arg1;
  const priceStr = (price / 100).toLocaleString("en", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (allow_subscription && !allow_one_time_purchase) {
    const recurrence = (() => {
      switch (interval) {
        case "day":
          return duration > 1 ? `${duration} days` : "day";
        case "week":
          return duration > 1 ? `${duration} weeks` : "week";
        case "month":
          return duration > 1 ? `${duration} months` : "month";
        case "year":
          return duration > 1 ? `${duration} years` : "year";
      }
      return "unknown";
    })();
    return `${priceStr}/${recurrence}`;
  }

  return priceStr;
}
