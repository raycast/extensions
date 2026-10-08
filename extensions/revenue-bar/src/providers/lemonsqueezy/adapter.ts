import { refundAmounts, summarizeSales } from "../../core/aggregate";
import { Http } from "../../core/http";
import { Money, fromProviderMinor, isoExponent, normalizeCurrency } from "../../core/money";
import { intervalLabel, parseInterval, toMonthly } from "../../core/mrr";
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
import { LemonSqueezyClient } from "./client";
import {
  CustomersResponse,
  OrderAttributes,
  OrdersResponse,
  PriceAttributes,
  PriceResponse,
  StoreResponse,
  StoresResponse,
  SubscriptionAttributes,
  SubscriptionInvoiceAttributes,
  SubscriptionInvoicesResponse,
  SubscriptionsResponse,
} from "./schemas";

export const LS_DASHBOARD = "https://app.lemonsqueezy.com";
const MAX_SALES_PAGES = 20;
const MAX_SUBSCRIPTION_PAGES = 20;
const MAX_PRICE_LOOKUPS = 50;

/** Lemon Squeezy amounts are "cents" of the object's currency, i.e. ISO minor units. */
function lsMoney(amount: number, currency: string): Money {
  return fromProviderMinor(amount, currency, isoExponent(currency));
}

export function mapOrderStatus(status: OrderAttributes["status"]): SaleStatus | undefined {
  switch (status) {
    case "paid":
      return "paid";
    case "refunded":
      return "refunded";
    case "partial_refund":
      return "partially_refunded";
    case "pending":
      return "pending";
    // Failed and fraudulent orders never collected money.
    case "failed":
    case "fraudulent":
      return undefined;
  }
}

export function mapInvoiceStatus(status: SubscriptionInvoiceAttributes["status"]): SaleStatus | undefined {
  switch (status) {
    case "paid":
      return "paid";
    case "refunded":
      return "refunded";
    case "partial_refund":
      return "partially_refunded";
    case "pending":
      return "pending";
    case "void":
      return undefined;
  }
}

export function mapSubscriptionStatus(status: SubscriptionAttributes["status"]): SubscriptionStatus {
  switch (status) {
    case "active":
      return "active";
    case "on_trial":
      return "trialing";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "paused":
      return "paused";
    case "cancelled":
    case "expired":
      return "cancelled";
  }
}

export function orderToSale(id: string, order: OrderAttributes): Sale | undefined {
  const status = mapOrderStatus(order.status);
  if (!status) return undefined;
  const product = order.first_order_item?.product_name ?? undefined;
  const refunded = order.refunded_amount ? lsMoney(order.refunded_amount, order.currency) : undefined;
  return {
    id,
    provider: "lemonsqueezy",
    createdAt: new Date(order.created_at),
    gross: lsMoney(order.total, order.currency),
    refunded: refunded && refunded.amountMinor > 0 ? refunded : undefined,
    customerEmail: order.user_email ?? undefined,
    customerName: order.user_name ?? undefined,
    productName: product,
    status,
    url: `${LS_DASHBOARD}/orders/${id}`,
    isSubscriptionPayment: false,
  };
}

/**
 * Renewal and plan-change invoices are revenue that never shows up as an order. The `initial` invoice is skipped
 * because the checkout that created the subscription already produced an order for the same payment.
 */
export function invoiceToSale(id: string, invoice: SubscriptionInvoiceAttributes): Sale | undefined {
  if (invoice.billing_reason === "initial") return undefined;
  const status = mapInvoiceStatus(invoice.status);
  if (!status) return undefined;
  const refunded = invoice.refunded_amount ? lsMoney(invoice.refunded_amount, invoice.currency) : undefined;
  return {
    id: `invoice-${id}`,
    provider: "lemonsqueezy",
    createdAt: new Date(invoice.created_at),
    gross: lsMoney(invoice.total, invoice.currency),
    refunded: refunded && refunded.amountMinor > 0 ? refunded : undefined,
    customerEmail: invoice.user_email ?? undefined,
    customerName: invoice.user_name ?? undefined,
    productName: invoice.billing_reason === "renewal" ? "Subscription renewal" : "Subscription update",
    status,
    url: `${LS_DASHBOARD}/subscriptions/${invoice.subscription_id}`,
    isSubscriptionPayment: true,
  };
}

/** Refund attributed to the order/invoice it belongs to. Full refunds carry `refunded_at`, partial ones do not. */
function refundFromSale(
  sale: Sale,
  refundedAt: string | null | undefined,
  updatedAt: string | null | undefined,
): Refund {
  return {
    id: `refund-${sale.id}`,
    provider: "lemonsqueezy",
    createdAt: new Date(refundedAt ?? updatedAt ?? sale.createdAt.toISOString()),
    amount: sale.refunded ?? sale.gross,
    saleId: sale.id,
    customerEmail: sale.customerEmail,
    status: sale.status === "refunded" ? "full" : "partial",
    url: sale.url,
    kind: "refund",
  };
}

/**
 * Amount billed per interval for one subscription item, following the price scheme:
 * standard = unit × qty; package = unit × ceil(qty / size); volume = the tier containing qty applies to all units;
 * graduated = each tier applies to the units inside it. Tier fixed fees are added once per tier used.
 */
export function priceAmountMinor(price: PriceAttributes, quantity: number): number | undefined {
  const qty = Math.max(1, quantity);
  const unit = (value: number | null | undefined, decimal: string | null | undefined) =>
    value ?? (decimal !== null && decimal !== undefined ? Number(decimal) : undefined);

  switch (price.scheme) {
    case "standard": {
      const u = unit(price.unit_price, price.unit_price_decimal);
      return u === undefined ? undefined : Math.round(u * qty);
    }
    case "package": {
      const u = unit(price.unit_price, price.unit_price_decimal);
      const size = price.package_size && price.package_size > 0 ? price.package_size : 1;
      return u === undefined ? undefined : Math.round(u * Math.ceil(qty / size));
    }
    case "volume": {
      const tier = (price.tiers ?? []).find((t) => t.last_unit === "inf" || qty <= t.last_unit);
      if (!tier) return undefined;
      const u = unit(tier.unit_price, tier.unit_price_decimal) ?? 0;
      return Math.round(u * qty + (tier.fixed_fee ?? 0));
    }
    case "graduated": {
      let total = 0;
      let previous = 0;
      for (const tier of price.tiers ?? []) {
        if (previous >= qty) break;
        const upper = tier.last_unit === "inf" ? qty : Math.min(qty, tier.last_unit);
        const units = upper - previous;
        if (units > 0) {
          total += (unit(tier.unit_price, tier.unit_price_decimal) ?? 0) * units + (tier.fixed_fee ?? 0);
        }
        previous = upper;
      }
      return Math.round(total);
    }
  }
}

export class LemonSqueezyProvider implements Provider {
  readonly id = "lemonsqueezy" as const;
  readonly label = "Lemon Squeezy";
  readonly dashboardUrl = `${LS_DASHBOARD}/dashboard`;
  private readonly client: LemonSqueezyClient;
  private readonly storeCurrency = new Map<number, Promise<string>>();

  constructor(
    apiKey: string,
    http: Http,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.client = new LemonSqueezyClient(apiKey, http);
  }

  async verify(): Promise<void> {
    await this.client.get("/stores", { "page[size]": 1 }, StoresResponse);
  }

  /** Orders plus renewal invoices created inside the range, newest first. */
  private async collect(
    range: DateRange,
    limit?: number,
  ): Promise<{ sales: Sale[]; refunds: Refund[]; partial: boolean }> {
    const stopAtRangeStart = (items: Array<{ attributes: { created_at: string } }>) => {
      const last = items[items.length - 1];
      return last !== undefined && new Date(last.attributes.created_at) < range.start;
    };
    const pageSize = limit !== undefined ? Math.min(100, Math.max(10, limit)) : 100;
    const maxPages = limit !== undefined ? Math.ceil(limit / pageSize) + 1 : MAX_SALES_PAGES;

    const [orders, invoices] = await Promise.all([
      this.client.paginate("/orders", {}, OrdersResponse, { maxPages, pageSize, stop: stopAtRangeStart }),
      this.client.paginate("/subscription-invoices", {}, SubscriptionInvoicesResponse, {
        maxPages,
        pageSize,
        stop: stopAtRangeStart,
      }),
    ]);

    const sales: Sale[] = [];
    const refunds: Refund[] = [];
    for (const order of orders.items) {
      const sale = orderToSale(order.id, order.attributes);
      if (!sale || !isWithin(sale.createdAt, range)) continue;
      sales.push(sale);
      if (sale.refunded) refunds.push(refundFromSale(sale, order.attributes.refunded_at, order.attributes.updated_at));
    }
    for (const invoice of invoices.items) {
      const sale = invoiceToSale(invoice.id, invoice.attributes);
      if (!sale || !isWithin(sale.createdAt, range)) continue;
      sales.push(sale);
      if (sale.refunded) {
        refunds.push(refundFromSale(sale, invoice.attributes.refunded_at, invoice.attributes.updated_at));
      }
    }
    sales.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    // With a limit, reaching maxPages is expected and not "partial".
    const partial = limit === undefined && (orders.truncated || invoices.truncated);
    return { sales, refunds, partial };
  }

  async summary(range: DateRange): Promise<Summary> {
    const { sales, refunds, partial } = await this.collect(range);
    return summarizeSales({
      provider: this.id,
      range,
      sales,
      refunds: refundAmounts(refunds),
      partial,
      now: this.now(),
    });
  }

  async sales(range: DateRange, opts: SalesOptions): Promise<Sale[]> {
    const { sales } = await this.collect(range, opts.limit);
    return sales.slice(0, opts.limit);
  }

  /** Lemon Squeezy has no dispute API. Refunds are those on orders and invoices created in the range. */
  async refunds(range: DateRange): Promise<Refund[]> {
    const { refunds } = await this.collect(range);
    return refunds.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  private currencyForStore(storeId: number): Promise<string> {
    let pending = this.storeCurrency.get(storeId);
    if (!pending) {
      pending = this.client
        .get(`/stores/${storeId}`, {}, StoreResponse)
        .then((r) => normalizeCurrency(r.data.attributes.currency));
      this.storeCurrency.set(storeId, pending);
    }
    return pending;
  }

  async subscriptions(opts: SubscriptionsOptions): Promise<Subscription[]> {
    const { items } = await this.client.paginate("/subscriptions", {}, SubscriptionsResponse, {
      maxPages: MAX_SUBSCRIPTION_PAGES,
    });

    const relevant = items.filter((s) => {
      const status = mapSubscriptionStatus(s.attributes.status);
      return status !== "cancelled" || new Date(s.attributes.updated_at) >= opts.cancelledSince;
    });

    // One price lookup per distinct price, shared by every subscription on it.
    const priceIds = [
      ...new Set(
        relevant.flatMap((s) =>
          s.attributes.first_subscription_item ? [s.attributes.first_subscription_item.price_id] : [],
        ),
      ),
    ].slice(0, MAX_PRICE_LOOKUPS);
    const prices = new Map<number, PriceAttributes>();
    await Promise.all(
      priceIds.map(async (id) => {
        const response = await this.client.get(`/prices/${id}`, {}, PriceResponse);
        prices.set(id, response.data.attributes);
      }),
    );

    return Promise.all(
      relevant.map(async (s) => {
        const a = s.attributes;
        const status = mapSubscriptionStatus(a.status);
        const currency = await this.currencyForStore(a.store_id);
        const item = a.first_subscription_item;
        const price = item ? prices.get(item.price_id) : undefined;
        const interval = parseInterval(price?.renewal_interval_unit);
        const count = price?.renewal_interval_quantity ?? 1;
        const perInterval = price && item ? priceAmountMinor(price, item.quantity) : undefined;
        const amount = perInterval !== undefined ? { amountMinor: perInterval, currency } : undefined;
        const counts = status === "active" || status === "past_due";
        const mrr = counts && amount && interval ? toMonthly(amount, interval, count) : { amountMinor: 0, currency };
        return {
          id: s.id,
          provider: this.id,
          status,
          mrr,
          amount,
          interval: interval ? intervalLabel(interval, count) : undefined,
          customerEmail: a.user_email ?? undefined,
          productName: [a.product_name, a.variant_name].filter((v) => v && v !== "Default").join(" · ") || undefined,
          startedAt: new Date(a.created_at),
          cancelledAt: status === "cancelled" ? new Date(a.updated_at) : undefined,
          url: `${LS_DASHBOARD}/subscriptions/${s.id}`,
        } satisfies Subscription;
      }),
    );
  }

  async searchCustomers(email: string): Promise<Customer[]> {
    const response = await this.client.get("/customers", { "filter[email]": email.trim() }, CustomersResponse);
    return Promise.all(
      response.data.map(async (c) => {
        const currency = await this.currencyForStore(c.attributes.store_id);
        return {
          id: c.id,
          provider: this.id,
          email: c.attributes.email,
          name: c.attributes.name ?? undefined,
          totalSpent:
            c.attributes.total_revenue_currency !== null && c.attributes.total_revenue_currency !== undefined
              ? lsMoney(c.attributes.total_revenue_currency, currency)
              : undefined,
          createdAt: c.attributes.created_at ? new Date(c.attributes.created_at) : undefined,
          url: `${LS_DASHBOARD}/customers/${c.id}`,
        } satisfies Customer;
      }),
    );
  }

  async salesForCustomer(customer: Customer): Promise<Sale[]> {
    const { items } = await this.client.paginate("/orders", { "filter[user_email]": customer.email }, OrdersResponse, {
      maxPages: 3,
    });
    return items.flatMap((o) => {
      const sale = orderToSale(o.id, o.attributes);
      return sale ? [sale] : [];
    });
  }
}
