import type { Customer, CustomerEvent, Offering, Product, Subscription } from "./explorer-api";
import type { Project } from "./revenuecat";

export const demoProject: Project = { id: "demo_project", name: "Demo", icon_url: "revenuecat-icon.png" };
const now = Date.now();
const day = 86400000;
const people = [
  ["Alex Morgan", "SE", "iOS", "active"],
  ["Jamie Chen", "US", "Web", "trialing"],
  ["Taylor Rivera", "GB", "iOS", "active"],
  ["Sam Patel", "CA", "Android", "expired"],
  ["Jordan Lee", "AU", "Web", "active"],
  ["Casey Nguyen", "DE", "iOS", "trialing"],
  ["Riley Brooks", "NL", "Web", "active"],
  ["Avery Kim", "US", "Android", "active"],
  ["Morgan Ellis", "FR", "iOS", "expired"],
  ["Quinn Reyes", "ES", "Web", "active"],
  ["Drew Parker", "DK", "iOS", "trialing"],
  ["Robin Shaw", "NO", "Web", "active"],
];
export const demoCustomers: Customer[] = people.map(([name, country, platform, status], index) => ({
  id: `demo_customer_${String(index + 1).padStart(3, "0")}`,
  first_seen_at: now - (status === "trialing" ? 3 : 65 + index * 8) * day,
  last_seen_at: now - (index * day) / 3,
  last_seen_country: country,
  last_seen_platform: platform,
  last_seen_app_version: "3.2.1",
  attributes: {
    items: [
      { name: "$displayName", value: name },
      { name: "$email", value: `${name.toLowerCase().replace(" ", ".")}@example.com` },
    ],
    next_page: null,
  },
  active_entitlements: {
    items:
      status === "expired"
        ? []
        : [{ entitlement_id: "Demo Pro", expires_at: now + (status === "trialing" ? 4 : 22) * day }],
    next_page: null,
  },
}));
export function demoSubscriptionsFor(customerId: string): Subscription[] {
  const index = demoCustomers.findIndex((customer) => customer.id === customerId);
  if (index < 0) return [];
  const [, , platform, status] = people[index];
  return [
    {
      id: `demo_subscription_${index + 1}`,
      product_id: index % 3 === 0 ? "demo_pro_yearly" : "demo_pro_monthly",
      status,
      store: platform === "Web" ? "rc_billing" : platform === "Android" ? "play_store" : "app_store",
      environment: "sandbox",
      gives_access: status !== "expired",
      auto_renewal_status: status === "expired" ? "will_not_renew" : "will_renew",
      starts_at: demoCustomers[index].first_seen_at,
      current_period_ends_at: now + (status === "expired" ? -7 : status === "trialing" ? 4 : 22) * day,
      pending_payment: false,
      store_subscription_identifier: `demo_transaction_${index + 1}`,
      total_revenue_in_usd: { currency: "USD", gross: status === "trialing" ? 0 : index % 3 === 0 ? 79.99 : 29.97 },
    },
  ];
}
export function demoEventsFor(customerId: string): CustomerEvent[] {
  const subscription = demoSubscriptionsFor(customerId)[0];
  if (!subscription) return [];
  const types =
    subscription.status === "trialing"
      ? ["INITIAL_PURCHASE"]
      : subscription.status === "expired"
        ? ["EXPIRATION", "CANCELLATION", "INITIAL_PURCHASE"]
        : ["RENEWAL", "RENEWAL", "INITIAL_PURCHASE"];
  return types.map((type, index) => ({
    id: `demo_event_${customerId}_${index}`,
    type: `PURCHASES_${type}`,
    created_at: types.length === 1 ? subscription.starts_at : now - (5 + index * 30) * day,
    body: { product_id: subscription.product_id, store: subscription.store, app_user_id: customerId },
  }));
}
export const demoProducts: Product[] = [
  ["monthly", "Pro Monthly", "P1M", 9.99],
  ["yearly", "Pro Yearly", "P1Y", 79.99],
  ["family_monthly", "Family Monthly", "P1M", 14.99],
  ["family_yearly", "Family Yearly", "P1Y", 119.99],
  ["lifetime", "Pro Lifetime", null, 199.99],
  ["legacy_monthly", "Legacy Monthly", "P1M", 4.99],
].map(([key, name, duration, price]) => ({
  id: `demo_pro_${key}`,
  store_identifier: `app.demo.${key}`,
  display_name: String(name),
  type: duration ? "subscription" : "non_consumable",
  state: key === "legacy_monthly" ? "inactive" : "active",
  app_id: "demo_ios",
  subscription: duration ? { duration: String(duration), trial_duration: "P1W" } : null,
  indicative_price: { amount_micros: Math.round(Number(price) * 1e6), currency: "USD", country: "US" },
}));
export const demoOfferings: Offering[] = [
  {
    id: "demo_standard",
    lookup_key: "default",
    display_name: "Standard Plans",
    is_current: true,
    state: "active",
    paywall_id: "demo_standard_paywall",
  },
  {
    id: "demo_family",
    lookup_key: "family",
    display_name: "Family Plans",
    is_current: false,
    state: "active",
    paywall_id: "demo_family_paywall",
  },
  {
    id: "demo_annual",
    lookup_key: "annual_promo",
    display_name: "Annual Promotion",
    is_current: false,
    state: "inactive",
    paywall_id: "demo_annual_paywall",
  },
];
export function demoPage<T>(items: T[]) {
  return Promise.resolve({ items, next_page: null });
}
