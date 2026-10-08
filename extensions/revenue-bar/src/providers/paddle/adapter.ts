import { summarizeSales } from "../../core/aggregate";
import { Http } from "../../core/http";
import { Money, fromProviderMinor, isoExponent, normalizeCurrency, parseIntegerString } from "../../core/money";
import { Discount, applyDiscounts, intervalLabel, parseInterval, toMonthly } from "../../core/mrr";
import { DateRange, isWithin } from "../../core/ranges";
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
import { PaddleClient, PaddleEnvironment, paddleEnvironment } from "./client";
import {
  Adjustment,
  AdjustmentList,
  CustomerList,
  DiscountList,
  EventTypes,
  PaddleDiscount,
  PaddleSubscription,
  SubscriptionList,
  Transaction,
  TransactionList,
} from "./schemas";

const MAX_TRANSACTION_PAGES = 34; // 30 per page → about 1,000 transactions
const MAX_ADJUSTMENT_PAGES = 10;
const MAX_SUBSCRIPTION_PAGES = 10;
const MAX_CANCELED_PAGES = 3;
const TRANSACTION_INCLUDE = "customer,adjustments_totals";

/** Paddle amounts are strings in the lowest denomination, which is the ISO minor unit. */
export function paddleMoney(amount: string, currency: string): Money {
  return fromProviderMinor(parseIntegerString(amount), currency, isoExponent(currency));
}

export function vendorsBase(environment: PaddleEnvironment): string {
  return environment === "sandbox" ? "https://sandbox-vendors.paddle.com" : "https://vendors.paddle.com";
}

export function transactionStatus(txn: Transaction): SaleStatus | undefined {
  if (txn.status !== "completed" && txn.status !== "paid") return undefined;
  const adj = txn.adjustments_totals;
  if (adj) {
    const total = parseIntegerString(txn.details.totals.total);
    const refund = parseIntegerString(adj.breakdown.refund);
    if (parseIntegerString(adj.breakdown.chargeback) > 0) return "disputed";
    if (refund > 0 && refund >= total) return "refunded";
    if (refund > 0) return "partially_refunded";
  }
  return "paid";
}

export function transactionToSale(txn: Transaction, environment: PaddleEnvironment): Sale | undefined {
  const status = transactionStatus(txn);
  if (!status) return undefined;
  const totals = txn.details.totals;
  const payout = txn.details.payout_totals;
  const product =
    txn.details.line_items?.find((l) => l.product?.name)?.product?.name ??
    txn.items?.find((i) => i.price?.name)?.price?.name ??
    undefined;
  const refund = txn.adjustments_totals ? parseIntegerString(txn.adjustments_totals.breakdown.refund) : 0;
  return {
    id: txn.id,
    provider: "paddle",
    createdAt: new Date(txn.billed_at ?? txn.created_at),
    gross: paddleMoney(totals.total, totals.currency_code),
    // Payout totals are final (after Paddle's fee, in the payout currency) once the transaction is completed.
    fee: payout
      ? paddleMoney(payout.fee, payout.currency_code)
      : totals.fee
        ? paddleMoney(totals.fee, totals.currency_code)
        : undefined,
    net: payout
      ? paddleMoney(payout.earnings, payout.currency_code)
      : totals.earnings
        ? paddleMoney(totals.earnings, totals.currency_code)
        : undefined,
    refunded:
      refund > 0
        ? paddleMoney(String(refund), txn.adjustments_totals?.currency_code ?? totals.currency_code)
        : undefined,
    customerEmail: txn.customer?.email ?? undefined,
    customerName: txn.customer?.name ?? undefined,
    productName: product ?? undefined,
    status,
    url: `${vendorsBase(environment)}/transactions-v2/${txn.id}`,
    isSubscriptionPayment: Boolean(txn.subscription_id),
  };
}

export function adjustmentKind(action: string): Refund["kind"] | undefined {
  switch (action) {
    case "refund":
      return "refund";
    case "chargeback":
      return "chargeback";
    case "chargeback_warning":
      return "dispute";
    // Credits and reversals are not money leaving the business.
    default:
      return undefined;
  }
}

export function adjustmentToRefund(adj: Adjustment, environment: PaddleEnvironment): Refund | undefined {
  const kind = adjustmentKind(adj.action);
  // Refunds only count once approved; chargebacks are approved by Paddle when they happen.
  if (!kind || adj.status !== "approved") return undefined;
  return {
    id: adj.id,
    provider: "paddle",
    createdAt: new Date(adj.created_at),
    amount: paddleMoney(adj.totals.total, adj.totals.currency_code),
    reason: adj.reason ?? undefined,
    status: adj.type ?? undefined,
    saleId: adj.transaction_id,
    url: `${vendorsBase(environment)}/transactions-v2/${adj.transaction_id}`,
    kind,
  };
}

export function subscriptionStatus(status: string): SubscriptionStatus | undefined {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "paused":
      return "paused";
    case "canceled":
      return "cancelled";
    default:
      return undefined;
  }
}

export function discountToRule(discount: PaddleDiscount): Discount | undefined {
  // Only discounts that recur forever lower MRR permanently.
  if (!discount.recur || discount.maximum_recurring_intervals) return undefined;
  if (discount.type === "percentage") return { type: "percent", percent: Number(discount.amount) };
  if (!discount.currency_code) return undefined;
  const money = paddleMoney(discount.amount, discount.currency_code);
  return {
    type: "amount",
    amountMinor: money.amountMinor,
    currency: money.currency,
    perUnit: discount.type === "flat_per_seat",
  };
}

/** Unit price in the subscription's currency: the base price, or the country override in that currency. */
function unitPriceFor(item: PaddleSubscription["items"][number], currency: string): Money | undefined {
  const candidates = [item.price.unit_price, ...(item.price.unit_price_overrides ?? []).map((o) => o.unit_price)];
  const match = candidates.find((p) => normalizeCurrency(p.currency_code) === currency);
  return match ? paddleMoney(match.amount, match.currency_code) : undefined;
}

export function subscriptionToDomain(
  sub: PaddleSubscription,
  environment: PaddleEnvironment,
  extras: { discounts: Map<string, PaddleDiscount>; emails: Map<string, string> },
): Subscription | undefined {
  const status = subscriptionStatus(sub.status);
  if (!status) return undefined;
  const currency = normalizeCurrency(sub.currency_code);
  let perInterval = 0;
  let quantity = 0;
  for (const item of sub.items) {
    if (!item.recurring || item.status === "inactive") continue;
    const unit = unitPriceFor(item, currency);
    if (!unit) continue;
    perInterval += unit.amountMinor * item.quantity;
    quantity += item.quantity;
  }
  const rule = sub.discount && !sub.discount.ends_at ? extras.discounts.get(sub.discount.id) : undefined;
  const discounts = rule ? [discountToRule(rule)].filter((d): d is Discount => d !== undefined) : [];
  const amount = applyDiscounts({ amountMinor: perInterval, currency }, quantity, discounts);
  const interval = parseInterval(sub.billing_cycle.interval);
  const counts = status === "active" || status === "past_due";
  return {
    id: sub.id,
    provider: "paddle",
    status,
    mrr: counts && interval ? toMonthly(amount, interval, sub.billing_cycle.frequency) : { amountMinor: 0, currency },
    amount,
    interval: interval ? intervalLabel(interval, sub.billing_cycle.frequency) : undefined,
    customerEmail: extras.emails.get(sub.customer_id),
    productName: sub.items.find((i) => i.product?.name)?.product?.name ?? sub.items[0]?.price.name ?? undefined,
    startedAt: new Date(sub.started_at ?? sub.created_at),
    cancelledAt: status === "cancelled" && sub.canceled_at ? new Date(sub.canceled_at) : undefined,
    url: `${vendorsBase(environment)}/subscriptions-v2/${sub.id}`,
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export class PaddleProvider implements Provider {
  readonly id = "paddle" as const;
  readonly label = "Paddle";
  readonly dashboardUrl: string;
  readonly environment: PaddleEnvironment;
  private readonly client: PaddleClient;

  constructor(
    apiKey: string,
    http: Http,
    environmentPreference?: string,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.environment = paddleEnvironment(apiKey, environmentPreference);
    this.client = new PaddleClient(apiKey, http, this.environment);
    this.dashboardUrl = `${vendorsBase(this.environment)}/transactions-v2`;
  }

  /** /event-types needs no permissions, so it checks the key and environment only. */
  async verify(): Promise<void> {
    await this.client.get("/event-types", {}, EventTypes);
  }

  private async transactions(range: DateRange, limit?: number) {
    return this.client.list(
      "/transactions",
      {
        status: "completed,paid",
        "billed_at[GTE]": range.start.toISOString(),
        "billed_at[LT]": range.end.toISOString(),
        include: TRANSACTION_INCLUDE,
        order_by: "billed_at[DESC]",
        per_page: 30,
      },
      TransactionList,
      { maxPages: MAX_TRANSACTION_PAGES, limit },
    );
  }

  /** Adjustments cannot be filtered by date. They are read newest first (by ID) until older than the range. */
  private async adjustments(range: DateRange) {
    return this.client.list("/adjustments", { order_by: "id[DESC]", per_page: 50 }, AdjustmentList, {
      maxPages: MAX_ADJUSTMENT_PAGES,
      stop: (page) => {
        const last = page[page.length - 1];
        return last !== undefined && new Date(last.created_at) < range.start;
      },
    });
  }

  private toRefunds(adjustments: Adjustment[], range: DateRange): Refund[] {
    return adjustments.flatMap((a) => {
      const refund = adjustmentToRefund(a, this.environment);
      return refund && isWithin(refund.createdAt, range) ? [refund] : [];
    });
  }

  async summary(range: DateRange): Promise<Summary> {
    const [txns, adjustments] = await Promise.all([this.transactions(range), this.adjustments(range)]);
    const sales = txns.items.flatMap((t) => {
      const sale = transactionToSale(t, this.environment);
      return sale ? [sale] : [];
    });
    const refunds = this.toRefunds(adjustments.items, range)
      .filter((r) => r.kind === "refund")
      .map((r) => r.amount);
    return summarizeSales({
      provider: this.id,
      range,
      sales,
      refunds,
      partial: txns.truncated || adjustments.truncated,
      now: this.now(),
    });
  }

  async sales(range: DateRange, opts: SalesOptions): Promise<Sale[]> {
    const { items } = await this.transactions(range, opts.limit);
    return items
      .flatMap((t) => {
        const sale = transactionToSale(t, this.environment);
        return sale ? [sale] : [];
      })
      .slice(0, opts.limit);
  }

  async refunds(range: DateRange): Promise<Refund[]> {
    const { items } = await this.adjustments(range);
    return this.toRefunds(items, range).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async subscriptions(opts: SubscriptionsOptions): Promise<Subscription[]> {
    const [current, canceled] = await Promise.all([
      this.client.list(
        "/subscriptions",
        { status: "active,trialing,past_due,paused", per_page: 200 },
        SubscriptionList,
        { maxPages: MAX_SUBSCRIPTION_PAGES },
      ),
      this.client.list("/subscriptions", { status: "canceled", per_page: 200 }, SubscriptionList, {
        maxPages: MAX_CANCELED_PAGES,
      }),
    ]);
    const recentlyCanceled = canceled.items.filter(
      (s) => s.canceled_at && new Date(s.canceled_at) >= opts.cancelledSince,
    );
    const all = [...current.items, ...recentlyCanceled];

    // Emails and discount rules live on other entities. Both are best-effort: a key without customer.read or
    // discount.read still gets subscriptions and MRR.
    const emails = new Map<string, string>();
    const discounts = new Map<string, PaddleDiscount>();
    const customerIds = [...new Set(all.map((s) => s.customer_id))];
    const discountIds = [...new Set(all.flatMap((s) => (s.discount ? [s.discount.id] : [])))];
    await Promise.allSettled([
      ...chunk(customerIds, 100).map(async (ids) => {
        const response = await this.client.get("/customers", { id: ids.join(","), per_page: 200 }, CustomerList);
        for (const c of response.data) emails.set(c.id, c.email);
      }),
      ...chunk(discountIds, 100).map(async (ids) => {
        const response = await this.client.get("/discounts", { id: ids.join(","), per_page: 200 }, DiscountList);
        for (const d of response.data) discounts.set(d.id, d);
      }),
    ]);

    return all.flatMap((s) => {
      const sub = subscriptionToDomain(s, this.environment, { discounts, emails });
      return sub ? [sub] : [];
    });
  }

  async searchCustomers(email: string): Promise<Customer[]> {
    const response = await this.client.get("/customers", { email: email.trim() }, CustomerList);
    return response.data.map((c) => ({
      id: c.id,
      provider: this.id,
      email: c.email,
      name: c.name ?? undefined,
      createdAt: c.created_at ? new Date(c.created_at) : undefined,
      url: `${vendorsBase(this.environment)}/customers-v2/${c.id}`,
    }));
  }

  async salesForCustomer(customer: Customer): Promise<Sale[]> {
    const { items } = await this.client.list(
      "/transactions",
      {
        customer_id: customer.id,
        status: "completed,paid",
        include: TRANSACTION_INCLUDE,
        order_by: "billed_at[DESC]",
        per_page: 30,
      },
      TransactionList,
      { maxPages: 2 },
    );
    return items.flatMap((t) => {
      const sale = transactionToSale(t, this.environment);
      return sale ? [sale] : [];
    });
  }
}
