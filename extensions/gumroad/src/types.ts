export type SalesResponse = {
  success: boolean;
  next_page_url: string;
  next_page_key: string;
  sales: Sale[] | undefined;
};

export type ProductsResponse = {
  success: boolean;
  products: Product[];
};

export type Sale = {
  id: string;
  email: string;
  seller_id: string;
  timestamp: string;
  daystamp: string;
  created_at: string;
  product_name: string;
  product_has_variants: boolean;
  price: number;
  gumroad_fee: number;
  subscription_duration: string;
  formatted_display_price: string;
  formatted_total_price: string;
  currency_symbol: string;
  amount_refundable_in_currency: string;
  product_id: string;
  product_permalink: string;
  partially_refunded: boolean;
  chargedback: boolean;
  purchase_email: string;
  zip_code: string;
  paid: boolean;
  has_variants: boolean;
  variants: Record<string, string>;
  variants_and_quantity: string;
  has_custom_fields: boolean;
  custom_fields: Record<string, string>;
  order_id: number;
  is_product_physical: boolean;
  purchaser_id: string;
  is_recurring_billing: boolean;
  can_contact: boolean;
  is_following: boolean;
  disputed: boolean;
  dispute_won: boolean;
  is_additional_contribution: boolean;
  discover_fee_charged: boolean;
  is_gift_sender_purchase: boolean;
  is_gift_receiver_purchase: boolean;
  referrer: string;
  card: Card;
  product_rating: number | null;
  reviews_count: number;
  average_rating: number;
  subscription_id: string;
  cancelled: boolean;
  ended: boolean;
  recurring_charge: boolean;
  license_key: string;
  license_id: string;
  license_disabled: boolean;
  affiliate: Affiliate;
  quantity: number;
};

type Card = {
  visual: string | null;
  type: string | null;
};

type Affiliate = {
  email: string;
  amount: string;
};

export type Product = {
  custom_permalink: string | null;
  custom_receipt: string | null;
  custom_summary: string;
  custom_fields: never[];
  customizable_price: number | null;
  description: string;
  deleted: boolean;
  max_purchase_count: number | null;
  name: string;
  preview_url: string | null;
  require_shipping: boolean;
  subscription_duration: string | null;
  published: boolean;
  url: string;
  id: string;
  price: number;
  purchasing_power_parity_prices: Record<string, number>;
  currency: string;
  short_url: string;
  thumbnail_url: string;
  tags: string[];
  formatted_price: string;
  file_info: Record<string, never>;
  sales_count: string;
  sales_usd_cents: string;
  is_tiered_membership: boolean;
  recurrences: string[] | null;
  variants: Variant[];
};

type Variant = {
  title: string;
  options: Option[];
};

type Option = {
  name: string;
  price_difference: number;
  purchasing_power_parity_prices: Record<string, number>;
  is_pay_what_you_want: boolean;
  recurrence_prices: Record<string, RecurrencePrice> | null;
};

type RecurrencePrice = {
  price_cents: number;
  suggested_price_cents: number | null;
  purchasing_power_parity_prices: Record<string, number>;
};
