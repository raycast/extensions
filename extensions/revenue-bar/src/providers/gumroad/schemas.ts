import { z } from "zod";

export const GumroadSale = z.object({
  id: z.string(),
  email: z.string().nullish(),
  purchase_email: z.string().nullish(),
  full_name: z.string().nullish(),
  created_at: z.string(),
  product_name: z.string().nullish(),
  product_id: z.string().nullish(),
  /** USD cents (canonical accounting currency), see client.ts. */
  price: z.number().int(),
  gumroad_fee: z.number().int().nullish(),
  currency: z.string().nullish(),
  amount_refundable_in_currency: z.string().nullish(),
  refunded: z.boolean().nullish(),
  partially_refunded: z.boolean().nullish(),
  chargedback: z.boolean().nullish(),
  disputed: z.boolean().nullish(),
  dispute_won: z.boolean().nullish(),
  is_recurring_billing: z.boolean().nullish(),
  subscription_id: z.string().nullish(),
  recurring_charge: z.boolean().nullish(),
  order_id: z.number().nullish(),
});
export type GumroadSale = z.infer<typeof GumroadSale>;

export const SalesResponse = z.object({
  success: z.literal(true),
  sales: z.array(GumroadSale),
  next_page_key: z.string().nullish(),
  next_page_url: z.string().nullish(),
});

export const UserResponse = z.object({
  success: z.literal(true),
  user: z.object({ name: z.string().nullish(), user_id: z.string().nullish() }),
});

/** Errors: { success: false, message: "..." } */
export function gumroadErrorMessage(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null || !("message" in body)) return undefined;
  const message = (body as { message?: unknown }).message;
  return typeof message === "string" ? message : undefined;
}
