import { refundAmounts, summarizeSales } from "../../core/aggregate";
import { Http } from "../../core/http";
import { Money } from "../../core/money";
import { DateRange, isWithin, utcDateWindow } from "../../core/ranges";
import { Customer, Provider, Refund, Sale, SaleStatus, SalesOptions, Summary } from "../types";
import { GumroadClient } from "./client";
import { GumroadSale, SalesResponse, UserResponse } from "./schemas";

/** Gumroad lists 10 sales per page, so the cap is higher than other providers'. */
const MAX_SALES_PAGES = 40;
export const GUMROAD_CUSTOMERS_URL = "https://gumroad.com/customers";

function usd(amountMinor: number): Money {
  return { amountMinor, currency: "USD" };
}

export function gumroadStatus(sale: GumroadSale): SaleStatus {
  if ((sale.chargedback || sale.disputed) && !sale.dispute_won) return "disputed";
  if (sale.refunded) return "refunded";
  if (sale.partially_refunded) return "partially_refunded";
  return "paid";
}

/**
 * Refunded amount in USD cents. Full refunds are the whole price. For partial refunds Gumroad only reports what is
 * still refundable, as a formatted string in the sale's currency, so the refunded part is derivable for USD sales only.
 */
export function refundedCents(sale: GumroadSale): number | undefined {
  if (sale.refunded) return sale.price;
  if (!sale.partially_refunded) return undefined;
  const currency = (sale.currency ?? "usd").toLowerCase();
  if (currency !== "usd" || !sale.amount_refundable_in_currency) return undefined;
  const refundable = Number(sale.amount_refundable_in_currency.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(refundable)) return undefined;
  return Math.max(0, sale.price - Math.round(refundable * 100));
}

/** Free downloads ($0 "sales") are not revenue and are skipped. */
export function gumroadToSale(sale: GumroadSale): Sale | undefined {
  if (sale.price <= 0) return undefined;
  const fee = sale.gumroad_fee ?? undefined;
  const refunded = refundedCents(sale);
  return {
    id: sale.id,
    provider: "gumroad",
    createdAt: new Date(sale.created_at),
    gross: usd(sale.price),
    fee: fee !== undefined ? usd(fee) : undefined,
    net: fee !== undefined ? usd(sale.price - fee) : undefined,
    refunded: refunded ? usd(refunded) : undefined,
    customerEmail: sale.email ?? sale.purchase_email ?? undefined,
    customerName: sale.full_name ?? undefined,
    productName: sale.product_name ?? undefined,
    status: gumroadStatus(sale),
    url: GUMROAD_CUSTOMERS_URL,
    isSubscriptionPayment: Boolean(sale.is_recurring_billing || sale.subscription_id),
  };
}

export function gumroadRefunds(sales: Sale[]): Refund[] {
  return sales.flatMap((sale): Refund[] => {
    if (sale.status === "disputed") {
      return [
        {
          id: `chargeback-${sale.id}`,
          provider: "gumroad",
          createdAt: sale.createdAt,
          amount: sale.gross,
          saleId: sale.id,
          customerEmail: sale.customerEmail,
          url: sale.url,
          kind: "chargeback",
        },
      ];
    }
    if (sale.refunded) {
      return [
        {
          id: `refund-${sale.id}`,
          provider: "gumroad",
          createdAt: sale.createdAt,
          amount: sale.refunded,
          saleId: sale.id,
          customerEmail: sale.customerEmail,
          status: sale.status === "refunded" ? "full" : "partial",
          url: sale.url,
          kind: "refund",
        },
      ];
    }
    return [];
  });
}

export class GumroadProvider implements Provider {
  readonly id = "gumroad" as const;
  readonly label = "Gumroad";
  readonly dashboardUrl = GUMROAD_CUSTOMERS_URL;
  private readonly client: GumroadClient;

  constructor(
    token: string,
    http: Http,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.client = new GumroadClient(token, http);
  }

  async verify(): Promise<void> {
    await this.client.get("/user", {}, UserResponse);
  }

  private async collect(range: DateRange, limit?: number): Promise<{ sales: Sale[]; partial: boolean }> {
    const window = utcDateWindow(range);
    const { items, truncated } = await this.client.paginate(
      "/sales",
      { after: window.after, before: window.before },
      SalesResponse,
      { maxPages: MAX_SALES_PAGES, limit },
    );
    const sales = items.flatMap((s) => {
      const sale = gumroadToSale(s);
      // The API filters by UTC date; trim to the exact local range.
      return sale && isWithin(sale.createdAt, range) ? [sale] : [];
    });
    return { sales, partial: truncated };
  }

  async summary(range: DateRange): Promise<Summary> {
    const { sales, partial } = await this.collect(range);
    return summarizeSales({
      provider: this.id,
      range,
      sales,
      refunds: refundAmounts(gumroadRefunds(sales)),
      partial,
      now: this.now(),
    });
  }

  async sales(range: DateRange, opts: SalesOptions): Promise<Sale[]> {
    const { sales } = await this.collect(range, opts.limit);
    return sales.slice(0, opts.limit);
  }

  /** Gumroad has no refund dates, so refunds and chargebacks are listed on the date of the sale. */
  async refunds(range: DateRange): Promise<Refund[]> {
    const { sales } = await this.collect(range);
    return gumroadRefunds(sales);
  }

  async searchCustomers(email: string): Promise<Customer[]> {
    const sales = await this.customerSales(email.trim());
    if (sales.length === 0) return [];
    const collected = sales.filter((s) => s.status !== "refunded");
    const first = sales[sales.length - 1] as Sale;
    return [
      {
        id: email.trim().toLowerCase(),
        provider: this.id,
        email: first.customerEmail ?? email.trim(),
        name: sales.find((s) => s.customerName)?.customerName,
        totalSpent: usd(collected.reduce((sum, s) => sum + s.gross.amountMinor - (s.refunded?.amountMinor ?? 0), 0)),
        createdAt: first.createdAt,
        url: GUMROAD_CUSTOMERS_URL,
      },
    ];
  }

  private async customerSales(email: string): Promise<Sale[]> {
    const { items } = await this.client.paginate("/sales", { email }, SalesResponse, { maxPages: 5 });
    return items.flatMap((s) => {
      const sale = gumroadToSale(s);
      return sale ? [sale] : [];
    });
  }

  async salesForCustomer(customer: Customer): Promise<Sale[]> {
    return this.customerSales(customer.email);
  }
}
