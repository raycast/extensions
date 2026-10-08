import { z } from "zod";

export function listOf<T extends z.ZodTypeAny>(item: T) {
  return z.object({ object: z.literal("list"), data: z.array(item), has_more: z.boolean() });
}

export const BalanceTransaction = z.object({
  id: z.string(),
  amount: z.number().int(),
  fee: z.number().int(),
  net: z.number().int(),
  currency: z.string(),
});

const ExpandableCustomer = z
  .union([
    z.string(),
    z.object({
      id: z.string(),
      email: z.string().nullish(),
      name: z.string().nullish(),
      deleted: z.boolean().optional(),
    }),
  ])
  .nullish();

export const Charge = z.object({
  id: z.string(),
  object: z.literal("charge"),
  amount: z.number().int(),
  amount_captured: z.number().int(),
  amount_refunded: z.number().int(),
  currency: z.string(),
  created: z.number().int(),
  status: z.enum(["succeeded", "pending", "failed"]),
  paid: z.boolean(),
  captured: z.boolean(),
  refunded: z.boolean(),
  disputed: z.boolean(),
  balance_transaction: z.union([z.string(), BalanceTransaction]).nullish(),
  billing_details: z.object({ email: z.string().nullish(), name: z.string().nullish() }).nullish(),
  receipt_email: z.string().nullish(),
  customer: ExpandableCustomer,
  description: z.string().nullish(),
  payment_intent: z.union([z.string(), z.object({ id: z.string() })]).nullish(),
  livemode: z.boolean(),
});
export type Charge = z.infer<typeof Charge>;

export const Refund = z.object({
  id: z.string(),
  amount: z.number().int(),
  currency: z.string(),
  created: z.number().int(),
  reason: z.string().nullish(),
  status: z.string().nullish(),
  charge: z.union([z.string(), Charge]).nullish(),
  payment_intent: z.union([z.string(), z.object({ id: z.string() })]).nullish(),
});
export type Refund = z.infer<typeof Refund>;

export const Dispute = z.object({
  id: z.string(),
  amount: z.number().int(),
  currency: z.string(),
  created: z.number().int(),
  reason: z.string().nullish(),
  status: z.string(),
  charge: z.union([z.string(), Charge]).nullish(),
  livemode: z.boolean().optional(),
});
export type Dispute = z.infer<typeof Dispute>;

export const Coupon = z.object({
  id: z.string(),
  percent_off: z.number().nullish(),
  amount_off: z.number().int().nullish(),
  currency: z.string().nullish(),
  duration: z.enum(["forever", "once", "repeating"]),
});
export type Coupon = z.infer<typeof Coupon>;

const DiscountObject = z.object({
  id: z.string(),
  end: z.number().nullish(),
  // API 2025-09+ (basil and later): discount.source.coupon. Older versions: discount.coupon.
  source: z.object({ coupon: z.union([z.string(), Coupon]).nullish() }).nullish(),
  coupon: z.union([z.string(), Coupon]).nullish(),
});

const Price = z.object({
  id: z.string(),
  currency: z.string(),
  unit_amount: z.number().int().nullish(),
  unit_amount_decimal: z.string().nullish(),
  recurring: z
    .object({
      interval: z.string(),
      interval_count: z.number().int(),
      usage_type: z.string().nullish(),
    })
    .nullish(),
  nickname: z.string().nullish(),
  product: z.union([z.string(), z.object({ id: z.string(), name: z.string().nullish() })]).nullish(),
});

export const Subscription = z.object({
  id: z.string(),
  status: z.enum([
    "incomplete",
    "incomplete_expired",
    "trialing",
    "active",
    "past_due",
    "canceled",
    "unpaid",
    "paused",
  ]),
  customer: ExpandableCustomer,
  currency: z.string(),
  created: z.number().int(),
  start_date: z.number().int(),
  canceled_at: z.number().int().nullish(),
  ended_at: z.number().int().nullish(),
  discounts: z.array(z.union([z.string(), DiscountObject])).nullish(),
  items: z.object({
    data: z.array(
      z.object({
        id: z.string(),
        quantity: z.number().int().nullish(),
        price: Price,
      }),
    ),
  }),
  livemode: z.boolean(),
});
export type Subscription = z.infer<typeof Subscription>;

export const Customer = z.object({
  id: z.string(),
  email: z.string().nullish(),
  name: z.string().nullish(),
  created: z.number().int(),
  livemode: z.boolean(),
});

export const ChargeList = listOf(Charge);
export const RefundList = listOf(Refund);
export const DisputeList = listOf(Dispute);
export const SubscriptionList = listOf(Subscription);
export const CustomerList = listOf(Customer);

export function stripeErrorMessage(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null || !("error" in body)) return undefined;
  const error = (body as { error?: { message?: string } }).error;
  return error?.message;
}
