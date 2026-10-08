import { z } from "zod";

const pageMeta = z.object({
  page: z.object({
    currentPage: z.number(),
    lastPage: z.number(),
    perPage: z.number().optional(),
    total: z.number().optional(),
  }),
});

const links = z
  .object({
    next: z.string().nullish(),
  })
  .partial()
  .nullish();

function resource<A extends z.ZodTypeAny>(attributes: A) {
  return z.object({ id: z.string(), type: z.string(), attributes });
}

export function listOf<A extends z.ZodTypeAny>(attributes: A) {
  return z.object({ data: z.array(resource(attributes)), meta: pageMeta, links });
}

export function singleOf<A extends z.ZodTypeAny>(attributes: A) {
  return z.object({ data: resource(attributes) });
}

export const OrderAttributes = z.object({
  store_id: z.number(),
  customer_id: z.number().nullish(),
  identifier: z.string().nullish(),
  order_number: z.number().nullish(),
  user_name: z.string().nullish(),
  user_email: z.string().nullish(),
  currency: z.string(),
  subtotal: z.number().int(),
  discount_total: z.number().int().nullish(),
  tax: z.number().int().nullish(),
  total: z.number().int(),
  total_usd: z.number().int().nullish(),
  refunded_amount: z.number().int().nullish(),
  status: z.enum(["pending", "failed", "paid", "refunded", "partial_refund", "fraudulent"]),
  refunded: z.boolean(),
  refunded_at: z.string().nullish(),
  first_order_item: z
    .object({
      product_name: z.string().nullish(),
      variant_name: z.string().nullish(),
    })
    .nullish(),
  created_at: z.string(),
  updated_at: z.string().nullish(),
  test_mode: z.boolean().nullish(),
});
export type OrderAttributes = z.infer<typeof OrderAttributes>;

export const SubscriptionInvoiceAttributes = z.object({
  store_id: z.number(),
  subscription_id: z.number(),
  customer_id: z.number().nullish(),
  user_name: z.string().nullish(),
  user_email: z.string().nullish(),
  billing_reason: z.enum(["initial", "renewal", "updated"]),
  currency: z.string(),
  status: z.enum(["pending", "paid", "void", "refunded", "partial_refund"]),
  refunded: z.boolean(),
  refunded_at: z.string().nullish(),
  subtotal: z.number().int(),
  discount_total: z.number().int().nullish(),
  tax: z.number().int().nullish(),
  total: z.number().int(),
  refunded_amount: z.number().int().nullish(),
  created_at: z.string(),
  updated_at: z.string().nullish(),
});
export type SubscriptionInvoiceAttributes = z.infer<typeof SubscriptionInvoiceAttributes>;

export const SubscriptionAttributes = z.object({
  store_id: z.number(),
  customer_id: z.number().nullish(),
  product_name: z.string().nullish(),
  variant_name: z.string().nullish(),
  user_name: z.string().nullish(),
  user_email: z.string().nullish(),
  status: z.enum(["on_trial", "active", "paused", "past_due", "unpaid", "cancelled", "expired"]),
  cancelled: z.boolean().nullish(),
  first_subscription_item: z
    .object({
      price_id: z.number(),
      quantity: z.number(),
    })
    .nullish(),
  renews_at: z.string().nullish(),
  ends_at: z.string().nullish(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type SubscriptionAttributes = z.infer<typeof SubscriptionAttributes>;

const Tier = z.object({
  last_unit: z.union([z.number(), z.literal("inf")]),
  unit_price: z.number().nullish(),
  unit_price_decimal: z.string().nullish(),
  fixed_fee: z.number().nullish(),
});

export const PriceAttributes = z.object({
  variant_id: z.number().nullish(),
  category: z.string().nullish(),
  scheme: z.enum(["standard", "package", "graduated", "volume"]),
  usage_aggregation: z.string().nullish(),
  unit_price: z.number().nullish(),
  unit_price_decimal: z.string().nullish(),
  package_size: z.number().nullish(),
  tiers: z.array(Tier).nullish(),
  renewal_interval_unit: z.string().nullish(),
  renewal_interval_quantity: z.number().nullish(),
});
export type PriceAttributes = z.infer<typeof PriceAttributes>;

export const StoreAttributes = z.object({
  name: z.string(),
  slug: z.string().nullish(),
  currency: z.string(),
});

export const CustomerAttributes = z.object({
  store_id: z.number(),
  name: z.string().nullish(),
  email: z.string(),
  status: z.string().nullish(),
  total_revenue_currency: z.number().int().nullish(),
  mrr: z.number().int().nullish(),
  created_at: z.string().nullish(),
});

export const OrdersResponse = listOf(OrderAttributes);
export const SubscriptionInvoicesResponse = listOf(SubscriptionInvoiceAttributes);
export const SubscriptionsResponse = listOf(SubscriptionAttributes);
export const PriceResponse = singleOf(PriceAttributes);
export const StoresResponse = listOf(StoreAttributes);
export const StoreResponse = singleOf(StoreAttributes);
export const CustomersResponse = listOf(CustomerAttributes);

/** JSON:API error body: { errors: [{ detail, title, status }] } */
export function lemonSqueezyErrorMessage(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null || !("errors" in body)) return undefined;
  const errors = (body as { errors?: Array<{ detail?: string; title?: string }> }).errors;
  const first = Array.isArray(errors) ? errors[0] : undefined;
  return first?.detail ?? first?.title;
}
