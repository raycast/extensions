import { z } from "zod";

/** Paddle amounts are integer strings in the currency's lowest denomination. */
const Amount = z.string().regex(/^-?\d+$/, "expected an integer string");

export const Pagination = z.object({
  per_page: z.number(),
  next: z.string().nullish(),
  has_more: z.boolean(),
  estimated_total: z.number().nullish(),
});

export function listOf<T extends z.ZodTypeAny>(item: T) {
  return z.object({ data: z.array(item), meta: z.object({ pagination: Pagination }) });
}

const PaddleCustomer = z.object({
  id: z.string(),
  name: z.string().nullish(),
  email: z.string(),
  status: z.string().nullish(),
  created_at: z.string().nullish(),
});

export const Transaction = z.object({
  id: z.string(),
  status: z.string(),
  customer_id: z.string().nullish(),
  subscription_id: z.string().nullish(),
  origin: z.string().nullish(),
  currency_code: z.string(),
  billed_at: z.string().nullish(),
  created_at: z.string(),
  details: z.object({
    totals: z.object({
      subtotal: Amount,
      tax: Amount,
      total: Amount,
      fee: Amount.nullish(),
      earnings: Amount.nullish(),
      currency_code: z.string(),
    }),
    payout_totals: z
      .object({
        fee: Amount,
        earnings: Amount,
        currency_code: z.string(),
      })
      .nullish(),
    line_items: z
      .array(
        z.object({
          quantity: z.number().nullish(),
          product: z.object({ name: z.string().nullish() }).nullish(),
        }),
      )
      .nullish(),
  }),
  items: z
    .array(
      z.object({
        price: z.object({ name: z.string().nullish(), description: z.string().nullish() }).nullish(),
      }),
    )
    .nullish(),
  customer: PaddleCustomer.nullish(),
  adjustments_totals: z
    .object({
      total: Amount,
      breakdown: z.object({ credit: Amount, refund: Amount, chargeback: Amount }),
      currency_code: z.string(),
    })
    .nullish(),
});
export type Transaction = z.infer<typeof Transaction>;

export const Adjustment = z.object({
  id: z.string(),
  action: z.string(),
  type: z.string().nullish(),
  transaction_id: z.string(),
  subscription_id: z.string().nullish(),
  customer_id: z.string().nullish(),
  reason: z.string().nullish(),
  status: z.string(),
  currency_code: z.string(),
  totals: z.object({ total: Amount, currency_code: z.string() }),
  created_at: z.string(),
});
export type Adjustment = z.infer<typeof Adjustment>;

const UnitPrice = z.object({ amount: Amount, currency_code: z.string() });

export const PaddleSubscription = z.object({
  id: z.string(),
  status: z.string(),
  customer_id: z.string(),
  currency_code: z.string(),
  created_at: z.string(),
  started_at: z.string().nullish(),
  canceled_at: z.string().nullish(),
  billing_cycle: z.object({ interval: z.string(), frequency: z.number() }),
  discount: z.object({ id: z.string(), ends_at: z.string().nullish(), type: z.string().nullish() }).nullish(),
  items: z.array(
    z.object({
      status: z.string(),
      quantity: z.number(),
      recurring: z.boolean(),
      price: z.object({
        id: z.string(),
        name: z.string().nullish(),
        unit_price: UnitPrice,
        unit_price_overrides: z.array(z.object({ unit_price: UnitPrice })).nullish(),
      }),
      product: z.object({ name: z.string().nullish() }).nullish(),
    }),
  ),
});
export type PaddleSubscription = z.infer<typeof PaddleSubscription>;

export const PaddleDiscount = z.object({
  id: z.string(),
  type: z.enum(["flat", "flat_per_seat", "percentage"]),
  amount: z.string(),
  currency_code: z.string().nullish(),
  recur: z.boolean().nullish(),
  maximum_recurring_intervals: z.number().nullish(),
});
export type PaddleDiscount = z.infer<typeof PaddleDiscount>;

export const TransactionList = listOf(Transaction);
export const AdjustmentList = listOf(Adjustment);
export const SubscriptionList = listOf(PaddleSubscription);
export const DiscountList = listOf(PaddleDiscount);
export const CustomerList = listOf(PaddleCustomer);
export const EventTypes = z.object({ data: z.array(z.unknown()) });

/** { error: { type, code, detail, documentation_url } } */
export function paddleErrorMessage(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null || !("error" in body)) return undefined;
  const error = (body as { error?: { detail?: string; code?: string } }).error;
  return error?.detail ?? error?.code;
}
