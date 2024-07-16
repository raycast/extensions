// General types used throughout the app
export type ApiResponse<T> = {
  pagination: Pagination;
  data: T[];
};

export type CampaignApiResponse = ApiResponse<Campaign>;
export type AffiliateApiResponse = ApiResponse<Affiliate>;
export type ReferralApiResponse = ApiResponse<Referral>;
export type CommissionApiResponse = ApiResponse<Commission>;

export type ErrorResponse = {
  error: string;
  details: string[];
};

export type PaginationResult<T> = {
  data: T[];
  hasMore: boolean;
  pageSize?: number;
};

export type Pagination = {
  previous_page: null | number;
  current_page: number;
  next_page: null | number;
  count: number;
  limit: number;
  total_pages: number;
  total_count: number;
};

// Types for main objects
export type Affiliate = {
  id: string;
  created_at: string;
  updated_at: string;
  first_name: string;
  last_name: string;
  email: string;
  state: string;
  paypal_email: string;
  confirmed_at: string;
  paypal_email_confirmed_at: string;
  wise_email: string;
  receive_new_commission_notifications: boolean;
  sign_in_count: number;
  unconfirmed_email: string | null;
  stripe_customer_id: string | null;
  stripe_account_id: string | null;
  visitors: number;
  leads: number;
  conversions: number;
  campaign: Campaign;
  links: Link[];
};

export type AffiliateFormProps = {
  affiliate: Affiliate;
  encodedApiKey: string;
  revalidate: () => void;
};

export type CreateAffiliateFormValues = {
  first_name: string;
  last_name: string;
  email: string;
  campaign_id: string;
  token: string;
  paypal_email: string;
  wise_email: string;
};

export type Campaign = {
  id: string;
  name: string;
  url: string;
  created_at: string;
  updated_at: string;
  private: boolean;
  private_tokens: boolean;
  commission_amount_cents: number | null;
  commission_amount_currency: string | null;
  minimum_payout_cents: number;
  max_commission_period_months: number | null;
  max_commissions: number | null;
  days_before_referrals_expire: number;
  days_until_commissions_are_due: number;
  affiliate_dashboard_text: string;
  custom_reward_description: string;
  welcome_text: string;
  customers_visible_to_affiliates: boolean;
  sale_description_visible_to_affiliates: boolean;
  parameter_type: string;
  stripe_coupon_id: string;
  default: boolean;
  reward_type: string;
  commission_percent: number;
  minimum_payout_currency: string;
  visitors: number;
  leads: number;
  conversions: number;
  affiliates: number;
};

export type Commission = {
  id: string;
  created_at: string;
  updated_at: string;
  amount: number;
  currency: string;
  due_at: string;
  paid_at: string | null;
  campaign: Campaign;
  sale: Sale;
};

export type Referral = {
  id: string;
  link: Link;
  customer: Customer;
  affiliate: Affiliate;
  visits: number;
  created_at: string;
  became_lead_at: string;
  became_conversion_at: string;
  expires_at: string;
  updated_at: string;
  deactivated_at: string | null;
  conversion_state: string;
  stripe_account_id: string;
  stripe_customer_id: string;
};

// Types related to the main objects
type Customer = {
  platform: string;
  id: string;
  name: string;
  email: string;
};

type Link = {
  id: string;
  url: string;
  token: string;
  visitors: number;
  leads: number;
  conversions: number;
};

type Sale = {
  id: string;
  currency: string;
  charged_at: string;
  stripe_account_id: string;
  stripe_charge_id: string;
  invoiced_at: string;
  created_at: string;
  updated_at: string;
  charge_amount_cents: number;
  refund_amount_cents: number;
  tax_amount_cents: number;
  sale_amount_cents: number;
  referral: Referral;
  affiliate: Affiliate;
};
