import { summarizeSales } from "../../core/aggregate";
import { Http } from "../../core/http";
import { Money, fromProviderMinor, normalizeCurrency, stripeExponent } from "../../core/money";
import { Discount, applyDiscounts, intervalLabel, parseInterval, toMonthly } from "../../core/mrr";
import { DateRange, toUnixSeconds } from "../../core/ranges";
import {
  Customer,
  Provider,
  Refund,
  Sale,
  SaleStatus,
  SalesOptions,
  Subscription,
  SubscriptionStatus,
  SubscriptionsOptions,
  Summary,
} from "../types";
import { StripeClient } from "./client";
import {
  Charge,
  ChargeList,
  Coupon,
  CustomerList,
  Dispute,
  DisputeList,
  Refund as StripeRefund,
  RefundList,
  Subscription as StripeSubscription,
  SubscriptionList,
} from "./schemas";

const MAX_CHARGE_PAGES = 20;
const MAX_LIST_PAGES = 10;
const MAX_CANCELED_PAGES = 5;

export function stripeMoney(amount: number, currency: string): Money {
  return fromProviderMinor(amount, currency, stripeExponent(currency));
}

export function dashboardBase(livemode: boolean): string {
  return livemode ? "https://dashboard.stripe.com" : "https://dashboard.stripe.com/test";
}

function idOf(value: string | { id: string } | null | undefined): string | undefined {
  if (!value) return undefined;
  return typeof value === "string" ? value : value.id;
}

function customerFields(customer: Charge["customer"]): { email?: string; name?: string } {
  if (!customer || typeof customer === "string" || customer.deleted) return {};
  return { email: customer.email ?? undefined, name: customer.name ?? undefined };
}

export function chargeStatus(charge: Charge): SaleStatus | undefined {
  if (charge.status === "failed" || !charge.paid) return undefined;
  if (charge.status === "pending" || !charge.captured) return "pending";
  if (charge.disputed) return "disputed";
  if (charge.refunded) return "refunded";
  if (charge.amount_refunded > 0) return "partially_refunded";
  return "paid";
}

/** Stripe sets these descriptions on charges created by invoices of a subscription. */
const SUBSCRIPTION_DESCRIPTIONS = ["Subscription creation", "Subscription update", "Subscription cycle"];

export function chargeToSale(charge: Charge): Sale | undefined {
  const status = chargeStatus(charge);
  if (!status) return undefined;
  const bt =
    charge.balance_transaction && typeof charge.balance_transaction === "object"
      ? charge.balance_transaction
      : undefined;
  const customer = customerFields(charge.customer);
  const target = idOf(charge.payment_intent) ?? charge.id;
  return {
    id: charge.id,
    provider: "stripe",
    createdAt: new Date(charge.created * 1000),
    gross: stripeMoney(charge.captured ? charge.amount_captured : charge.amount, charge.currency),
    fee: bt ? stripeMoney(bt.fee, bt.currency) : undefined,
    net: bt ? stripeMoney(bt.net, bt.currency) : undefined,
    refunded: charge.amount_refunded > 0 ? stripeMoney(charge.amount_refunded, charge.currency) : undefined,
    customerEmail: charge.billing_details?.email ?? charge.receipt_email ?? customer.email,
    customerName: charge.billing_details?.name ?? customer.name,
    productName: charge.description ?? undefined,
    status,
    url: `${dashboardBase(charge.livemode)}/payments/${target}`,
    isSubscriptionPayment: SUBSCRIPTION_DESCRIPTIONS.includes(charge.description ?? ""),
  };
}

export function refundToRefund(refund: StripeRefund, livemode: boolean): Refund {
  const charge = refund.charge && typeof refund.charge === "object" ? refund.charge : undefined;
  const target = idOf(refund.payment_intent) ?? idOf(refund.charge);
  return {
    id: refund.id,
    provider: "stripe",
    createdAt: new Date(refund.created * 1000),
    amount: stripeMoney(refund.amount, refund.currency),
    reason: refund.reason ?? undefined,
    status: refund.status ?? undefined,
    saleId: idOf(refund.charge),
    customerEmail: charge?.billing_details?.email ?? charge?.receipt_email ?? undefined,
    url: target
      ? `${dashboardBase(charge?.livemode ?? livemode)}/payments/${target}`
      : `${dashboardBase(livemode)}/payments`,
    kind: "refund",
  };
}

/** Inquiries (warning_*) are early-stage disputes; everything else is a formal chargeback. */
export function disputeToRefund(dispute: Dispute, livemode: boolean): Refund {
  const charge = dispute.charge && typeof dispute.charge === "object" ? dispute.charge : undefined;
  return {
    id: dispute.id,
    provider: "stripe",
    createdAt: new Date(dispute.created * 1000),
    amount: stripeMoney(dispute.amount, dispute.currency),
    reason: dispute.reason ?? undefined,
    status: dispute.status,
    saleId: idOf(dispute.charge),
    customerEmail: charge?.billing_details?.email ?? charge?.receipt_email ?? undefined,
    url: `${dashboardBase(dispute.livemode ?? livemode)}/disputes/${dispute.id}`,
    kind: dispute.status.startsWith("warning_") ? "dispute" : "chargeback",
  };
}

export function subscriptionStatus(status: StripeSubscription["status"]): SubscriptionStatus | undefined {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "paused":
      return "paused";
    case "canceled":
    case "incomplete_expired":
      return "cancelled";
    // Never paid: not a subscriber yet.
    case "incomplete":
      return undefined;
  }
}

function couponOf(discount: NonNullable<StripeSubscription["discounts"]>[number]): string | Coupon | undefined {
  if (typeof discount === "string") return undefined;
  return discount.source?.coupon ?? discount.coupon ?? undefined;
}

/** Only `duration: forever` coupons are permanent, so only they reduce MRR. */
export function couponToDiscount(coupon: Coupon): Discount | undefined {
  if (coupon.duration !== "forever") return undefined;
  if (coupon.percent_off) return { type: "percent", percent: coupon.percent_off };
  if (coupon.amount_off && coupon.currency) {
    const money = stripeMoney(coupon.amount_off, coupon.currency);
    return { type: "amount", amountMinor: money.amountMinor, currency: money.currency };
  }
  return undefined;
}

export function subscriptionToDomain(sub: StripeSubscription, coupons: Map<string, Coupon>): Subscription | undefined {
  const status = subscriptionStatus(sub.status);
  if (!status) return undefined;
  const currency = normalizeCurrency(sub.currency);
  const first = sub.items.data[0];
  const interval = parseInterval(first?.price.recurring?.interval);
  const count = first?.price.recurring?.interval_count ?? 1;

  // Licensed per-unit items only: metered usage has no fixed amount.
  let perInterval = 0;
  let quantity = 0;
  for (const item of sub.items.data) {
    if (item.price.recurring?.usage_type === "metered") continue;
    const unit =
      item.price.unit_amount ?? (item.price.unit_amount_decimal ? Number(item.price.unit_amount_decimal) : 0);
    const qty = item.quantity ?? 1;
    perInterval += stripeMoney(Math.round(unit * qty), item.price.currency).amountMinor;
    quantity += qty;
  }

  const discounts = (sub.discounts ?? []).flatMap((d) => {
    const c = couponOf(d);
    const coupon = typeof c === "string" ? coupons.get(c) : c;
    const ended = typeof d !== "string" && d.end !== null && d.end !== undefined;
    const discount = coupon && !ended ? couponToDiscount(coupon) : undefined;
    return discount ? [discount] : [];
  });

  const amount = applyDiscounts({ amountMinor: perInterval, currency }, quantity, discounts);
  const counts = status === "active" || status === "past_due";
  const customer = customerFields(sub.customer);
  const product =
    first?.price.product && typeof first.price.product === "object" ? first.price.product.name : undefined;
  const ended = sub.ended_at ?? sub.canceled_at;
  return {
    id: sub.id,
    provider: "stripe",
    status,
    mrr: counts && interval ? toMonthly(amount, interval, count) : { amountMinor: 0, currency },
    amount,
    interval: interval ? intervalLabel(interval, count) : undefined,
    customerEmail: customer.email,
    productName: product ?? first?.price.nickname ?? undefined,
    startedAt: new Date(sub.start_date * 1000),
    cancelledAt: status === "cancelled" && ended ? new Date(ended * 1000) : undefined,
    url: `${dashboardBase(sub.livemode)}/subscriptions/${sub.id}`,
  };
}

export class StripeProvider implements Provider {
  readonly id = "stripe" as const;
  readonly label = "Stripe";
  readonly dashboardUrl = "https://dashboard.stripe.com";
  private readonly client: StripeClient;
  /** Restricted keys start with rk_live_ / rk_test_, secret keys with sk_. Test keys link to the test dashboard. */
  private readonly livemode: boolean;

  constructor(
    apiKey: string,
    http: Http,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.client = new StripeClient(apiKey, http);
    this.livemode = !/_test_/.test(apiKey);
  }

  async verify(): Promise<void> {
    await this.client.get("/charges", { limit: 1 }, ChargeList);
  }

  private created(range: DateRange) {
    return { "created[gte]": toUnixSeconds(range.start), "created[lt]": toUnixSeconds(range.end) + 1 };
  }

  private async charges(range: DateRange, limit?: number) {
    return this.client.list(
      "/charges",
      { ...this.created(range), "expand[]": ["data.balance_transaction", "data.customer"] },
      ChargeList,
      { maxPages: MAX_CHARGE_PAGES, limit },
    );
  }

  private async refundList(range: DateRange) {
    return this.client.list("/refunds", { ...this.created(range), "expand[]": ["data.charge"] }, RefundList, {
      maxPages: MAX_LIST_PAGES,
    });
  }

  async summary(range: DateRange): Promise<Summary> {
    const [charges, refunds] = await Promise.all([this.charges(range), this.refundList(range)]);
    const sales = charges.items.flatMap((c) => {
      const sale = chargeToSale(c);
      return sale && sale.createdAt >= range.start && sale.createdAt < range.end ? [sale] : [];
    });
    const refundMoney = refunds.items
      .filter((r) => r.status !== "failed" && r.status !== "canceled")
      .map((r) => stripeMoney(r.amount, r.currency));
    return summarizeSales({
      provider: this.id,
      range,
      sales,
      refunds: refundMoney,
      partial: charges.truncated || refunds.truncated,
      now: this.now(),
    });
  }

  async sales(range: DateRange, opts: SalesOptions): Promise<Sale[]> {
    const { items } = await this.charges(range, opts.limit);
    return items.flatMap((c) => {
      const sale = chargeToSale(c);
      return sale ? [sale] : [];
    });
  }

  async refunds(range: DateRange): Promise<Refund[]> {
    const [refunds, disputes] = await Promise.all([
      this.refundList(range),
      this.client.list("/disputes", { ...this.created(range), "expand[]": ["data.charge"] }, DisputeList, {
        maxPages: MAX_LIST_PAGES,
      }),
    ]);
    return [
      ...refunds.items
        .filter((r) => r.status !== "failed" && r.status !== "canceled")
        .map((r) => refundToRefund(r, this.livemode)),
      ...disputes.items.map((d) => disputeToRefund(d, this.livemode)),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async subscriptions(opts: SubscriptionsOptions): Promise<Subscription[]> {
    const expand = { "expand[]": ["data.discounts", "data.customer"] };
    const [current, canceled] = await Promise.all([
      this.client.list("/subscriptions", expand, SubscriptionList, { maxPages: MAX_LIST_PAGES }),
      this.client.list("/subscriptions", { ...expand, status: "canceled" }, SubscriptionList, {
        maxPages: MAX_CANCELED_PAGES,
      }),
    ]);
    const since = toUnixSeconds(opts.cancelledSince);
    const recentlyCanceled = canceled.items.filter((s) => (s.ended_at ?? s.canceled_at ?? 0) >= since);
    const all = [...current.items, ...recentlyCanceled];

    // discount.source.coupon is an ID unless expanded. Fetch each distinct coupon once; a key without the
    // Coupons permission simply gets MRR without discounts.
    const couponIds = new Set<string>();
    for (const sub of all) {
      for (const d of sub.discounts ?? []) {
        const c = couponOf(d);
        if (typeof c === "string") couponIds.add(c);
      }
    }
    const coupons = new Map<string, Coupon>();
    await Promise.allSettled(
      [...couponIds].map(async (id) => {
        coupons.set(id, await this.client.get(`/coupons/${encodeURIComponent(id)}`, {}, Coupon));
      }),
    );

    return all.flatMap((s) => {
      const sub = subscriptionToDomain(s, coupons);
      return sub ? [sub] : [];
    });
  }

  async searchCustomers(email: string): Promise<Customer[]> {
    // The email filter is exact and case-sensitive, so also try the lower-case form.
    const variants = [...new Set([email.trim(), email.trim().toLowerCase()])];
    const lists = await Promise.all(
      variants.map((e) => this.client.get("/customers", { email: e, limit: 20 }, CustomerList)),
    );
    const seen = new Set<string>();
    return lists
      .flatMap((l) => l.data)
      .filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)))
      .map((c) => ({
        id: c.id,
        provider: this.id,
        email: c.email ?? email,
        name: c.name ?? undefined,
        createdAt: new Date(c.created * 1000),
        url: `${dashboardBase(c.livemode)}/customers/${c.id}`,
      }));
  }

  async salesForCustomer(customer: Customer): Promise<Sale[]> {
    const { items } = await this.client.list(
      "/charges",
      { customer: customer.id, "expand[]": ["data.balance_transaction"] },
      ChargeList,
      { maxPages: 1, limit: 50 },
    );
    return items.flatMap((c) => {
      const sale = chargeToSale(c);
      return sale ? [sale] : [];
    });
  }
}
