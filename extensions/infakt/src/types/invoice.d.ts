import {
  BusinessActivityKind,
  Currency,
  FlatRateTaxSymbol,
  InvoiceDateKind,
  Locale,
  PaymentMethod,
  PrintType,
  SaleType,
  VatExchangeDateKind,
} from "@/types/utils";

export interface InvoiceObject {
  id: number;
  uuid: string;
  number?: string | null;
  currency?: Currency | null;
  paid_price?: number | null;
  notes?: string | null;
  kind?: "proforma" | "vat" | null;
  payment_method?: PaymentMethod | null;
  split_payment?: boolean | null;
  split_payment_type?: "required" | "optional" | null;
  recipient_signature?: string | null;
  seller_signature?: string | null;
  invoice_date?: string | null;
  sale_date?: string | null;
  status: "draft" | "sent" | "printed" | "paid";
  payment_date?: string | null;
  paid_date?: string | null;
  net_price?: number | null;
  tax_price?: number | null;
  gross_price?: number | null;
  left_to_pay?: number | null;
  client_id?: number | null;
  client_company_name?: string | null;
  client_first_name?: string | null;
  client_last_name?: string | null;
  client_business_activity_kind?: BusinessActivityKind | null;
  client_street?: string | null;
  client_street_number?: string | null;
  client_flat_number?: string | null;
  client_city?: string | null;
  client_post_code?: string | null;
  client_tax_code?: string | null;
  clean_client_nip?: string | null;
  client_country?: string | null;
  check_duplicate_number?: boolean | null;
  bank_name?: string | null;
  bank_account?: string | null;
  swift?: string | null;
  sale_type?: SaleType | null;
  invoice_date_kind?: InvoiceDateKind | null;
  continuous_service_start_on?: string | null;
  continuous_service_end_on?: string | null;
  services: Service[];
  vat_exemption_reason?: number | null;
  extensions: Extensions;
  bdo_code?: string | null;
  transaction_kind_id?: number | null;
  document_markings_ids?: number[] | null;
  receipt_number?: string | null;
  not_income?: boolean | null;
  vat_exchange_date_kind?: VatExchangeDateKind | null;
}

export interface Service {
  id: number;
  name: string;
  tax_symbol?: string | null;
  unit?: string | null;
  quantity?: number | null;
  unit_net_price?: number | null;
  net_price?: number | null;
  gross_price?: number | null;
  tax_price?: number | null;
  symbol?: string | null;
  pkwiu?: string | null;
  cn?: string | null;
  pkob?: string | null;
  flat_rate_tax_symbol?: FlatRateTaxSymbol | null;
  discount?: string | null;
  unit_net_price_before_discount?: number | null;
  gtu_id?: number | null;
}

export interface Extensions {
  payments: Payments;
  shares: Shares;
}

export interface Payments {
  link?: string | null;
  available: boolean;
}

export interface Shares {
  link?: string | null;
  available: boolean;
  valid_until?: string | null;
}

export type CreateInvoiceFormValues = {
  payment_method: string;
  bank_account: string;
  client_id: string;
};

export type CreateInvoicePayload = {
  invoice: Omit<CreateInvoiceFormValues, "services"> & {
    services: Partial<Service>[];
  };
};

export type UpdateInvoiceFormValues = Partial<CreateInvoiceFormValues>;

export type UpdateInvoicePayload = {
  invoice: Partial<CreateInvoicePayload["invoice"]>;
};

export type SetAsPaidInvoicePayload = {
  paid_date: string;
};

export type SendViaMailPayload = {
  print_type: PrintType;
  locale?: Locale;
  recipient?: string;
  send_copy?: boolean;
};
