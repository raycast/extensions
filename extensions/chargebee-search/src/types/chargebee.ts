export type SiteName = string;

export interface Preferences {
  primary_site: string;
  primary_site_name: string;
  primary_api_key: string;
  secondary_site?: string;
  secondary_site_name?: string;
  secondary_api_key?: string;
}

export interface SiteConfig {
  name: SiteName;
  site: string;
  apiKey: string;
}

export interface ChargebeeCustomer {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  company?: string;
  created_at: number;
  updated_at: number;
}

export interface ChargebeeSubscription {
  id: string;
  customer_id: string;
  status: "future" | "in_trial" | "active" | "non_renewing" | "paused" | "cancelled";
  current_term_end?: number;
  next_billing_at?: number;
}

export interface ChargebeeInvoice {
  id: string;
  customer_id: string;
  status: "paid" | "posted" | "payment_due" | "not_paid" | "voided" | "pending";
  total: number;
  currency_code: string;
  date: number;
  billing_address?: {
    first_name?: string;
    last_name?: string;
    company?: string;
  };
}

export interface ChargebeeCreditNote {
  id: string;
  customer_id: string;
  status: "adjusted" | "refunded" | "refund_due" | "voided";
  total: number;
  currency_code: string;
  date: number;
}

export interface CustomerWithMeta extends ChargebeeCustomer {
  site: SiteName;
  siteId: string;
  subscription?: ChargebeeSubscription;
  lastInvoiceId?: string;
}

export interface InvoiceWithMeta extends ChargebeeInvoice {
  site: SiteName;
  siteId: string;
  customerName?: string;
}

export interface CreditNoteWithMeta extends ChargebeeCreditNote {
  site: SiteName;
  siteId: string;
  customerName?: string;
}

export type SearchType = "customer" | "invoice" | "credit_note";

export type SearchResult = CustomerWithMeta | InvoiceWithMeta | CreditNoteWithMeta;
