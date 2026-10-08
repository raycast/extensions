import { DateRange } from "../core/ranges";
import { Money } from "../core/money";

export type ProviderId = "stripe" | "lemonsqueezy" | "gumroad" | "paddle";

/** Fixed order. "First configured provider" for the free tier means first in this list. */
export const PROVIDER_IDS: ProviderId[] = ["stripe", "lemonsqueezy", "gumroad", "paddle"];

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  stripe: "Stripe",
  lemonsqueezy: "Lemon Squeezy",
  gumroad: "Gumroad",
  paddle: "Paddle",
};

/** Where "Open Dashboard" goes for a provider's sales. Adapters build per-object links themselves. */
export const DASHBOARD_URLS: Record<ProviderId, string> = {
  stripe: "https://dashboard.stripe.com/payments",
  lemonsqueezy: "https://app.lemonsqueezy.com/orders",
  gumroad: "https://gumroad.com/customers",
  paddle: "https://vendors.paddle.com/transactions-v2",
};

export type SaleStatus = "paid" | "refunded" | "partially_refunded" | "disputed" | "pending";

export type Sale = {
  id: string;
  provider: ProviderId;
  createdAt: Date;
  gross: Money;
  fee?: Money;
  net?: Money;
  refunded?: Money;
  customerEmail?: string;
  customerName?: string;
  productName?: string;
  status: SaleStatus;
  /** Deep link into the provider dashboard. */
  url: string;
  isSubscriptionPayment: boolean;
};

export type RefundKind = "refund" | "dispute" | "chargeback";

export type Refund = {
  id: string;
  provider: ProviderId;
  createdAt: Date;
  amount: Money;
  reason?: string;
  status?: string;
  saleId?: string;
  customerEmail?: string;
  url: string;
  kind: RefundKind;
};

export type SubscriptionStatus = "active" | "trialing" | "past_due" | "cancelled" | "paused";

export type Subscription = {
  id: string;
  provider: ProviderId;
  status: SubscriptionStatus;
  /** Monthly recurring revenue of this subscription after normalization. Zero for trials, paused and cancelled. */
  mrr: Money;
  /** Amount billed each interval, before normalization. */
  amount?: Money;
  interval?: string;
  customerEmail?: string;
  productName?: string;
  startedAt: Date;
  cancelledAt?: Date;
  url: string;
};

export type Customer = {
  id: string;
  provider: ProviderId;
  email: string;
  name?: string;
  totalSpent?: Money;
  createdAt?: Date;
  url: string;
};

export type Summary = {
  provider: ProviderId;
  range: DateRange;
  gross: Money[];
  /** After provider fees, when the provider reports fees. */
  net?: Money[];
  fees?: Money[];
  refunds: Money[];
  count: number;
  /** True when the provider had more data than the page cap allowed us to read. */
  partial: boolean;
  fetchedAt: Date;
};

export type SalesOptions = { limit: number };

export type SubscriptionsOptions = { cancelledSince: Date };

export interface Provider {
  id: ProviderId;
  label: string;
  dashboardUrl: string;
  /** Cheap authenticated call used by the license/settings screen. */
  verify(): Promise<void>;
  summary(range: DateRange): Promise<Summary>;
  sales(range: DateRange, opts: SalesOptions): Promise<Sale[]>;
  refunds(range: DateRange): Promise<Refund[]>;
  /** Not implemented for Gumroad, whose API only lists subscribers per product. */
  subscriptions?(opts: SubscriptionsOptions): Promise<Subscription[]>;
  searchCustomers(email: string): Promise<Customer[]>;
  salesForCustomer?(customer: Customer): Promise<Sale[]>;
}

/** Outcome of fetching one provider. Errors are kept as plain objects so cached results survive serialization. */
export type ProviderResult<T> =
  | { provider: ProviderId; ok: true; data: T }
  | { provider: ProviderId; ok: false; error: { kind: string; message: string } };

/** Statuses that count as revenue: the money was collected, even if later refunded or disputed. */
export function isCollected(status: SaleStatus): boolean {
  return status !== "pending";
}
