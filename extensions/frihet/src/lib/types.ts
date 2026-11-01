/**
 * Canonical types for the Frihet ERP Raycast Extension.
 *
 * All monetary figures, tax rates, and statuses come directly from the
 * authoritative Frihet REST API (`https://api.frihet.io/v1`).
 */

export interface FrihetPreferences {
  apiKey: string;
  apiBaseUrl?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  nextCursor?: string;
  truncated?: boolean;
}

export type AmountProvenance =
  | "stored_field"
  | "derived_from_items"
  | "business_context_summary"
  | "unavailable"
  | "mixed_currency_unconverted"
  | "stored"
  | "derived_from_lines";

export interface CurrencyBucketAmount {
  amount: number;
  currency: string;
  provenance: "stored_field" | "derived_from_items";
  documentCount: number;
}

export interface ProvenancedAmount {
  amount: number | null;
  currency: string;
  provenance: AmountProvenance;
  formula: string;
  fieldOrFormula: string;
  totalsByCurrency?: Record<string, CurrencyBucketAmount>;
  unavailableCount?: number;
}

export interface InvoiceLineItem {
  description?: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discount?: number;
  discountRate?: number;
  discountAmount?: number;
}

export type InvoiceStatus =
  "draft" | "sent" | "overdue" | "paid" | "cancelled" | string;

export interface InvoiceRecord {
  id: string;
  invoiceNumber?: string;
  documentNumber?: string;
  clientId?: string;
  clientName: string;
  status?: InvoiceStatus;
  issueDate?: string;
  dueDate?: string;
  paidDate?: string;
  items?: InvoiceLineItem[];
  taxRate?: number;
  irpfRate?: number;
  equivalenceSurchargeRate?: number;
  discountRate?: number;
  pricesIncludeTax?: boolean;
  deductLineDiscountAmounts?: boolean;
  compoundTaxes?: unknown[];
  prepayment?: number;
  subtotal?: number;
  taxAmount?: number;
  total?: number;
  amount?: number;
  currency?: string;
  notes?: string;
  seriesId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClientAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface ClientRecord {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  taxId?: string;
  stage?: string;
  address?: ClientAddress | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClientActivityRecord {
  id: string;
  type?: string;
  title?: string;
  description?: string;
  notes?: string;
  date?: string;
  createdAt?: string;
}

export type ProductActiveFilter = "all" | "active" | "inactive";

export interface ProductRecord {
  id: string;
  name: string;
  sku?: string;
  unitPrice: number;
  taxRate?: number;
  description?: string;
  isActive?: boolean;
  currency?: string;
  unit?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductSearchResult extends PaginatedResponse<ProductRecord> {
  usedClientFallback: boolean;
  usedClientSideFallback: boolean;
  fallbackCoveragePartial: boolean;
  fallbackReason?: string;
}

export interface QuoteRecord {
  id: string;
  quoteNumber?: string;
  documentNumber?: string;
  clientId?: string;
  clientName: string;
  status?: string;
  issueDate?: string;
  dueDate?: string;
  validUntil?: string;
  items?: InvoiceLineItem[];
  taxRate?: number;
  irpfRate?: number;
  equivalenceSurchargeRate?: number;
  discountRate?: number;
  total?: number;
  amount?: number;
  currency?: string;
  notes?: string;
}

export interface ExpenseRecord {
  id: string;
  description: string;
  amount?: number;
  total?: number;
  category?: string;
  date?: string;
  vendor?: string;
  vendorId?: string;
  taxDeductible?: boolean;
  currency?: string;
  paidDate?: string;
}

export interface BusinessContext {
  business?: {
    name?: string;
    taxId?: string;
    fiscalZone?: string;
    currency?: string;
    language?: string;
    country?: string;
  };
  company?: {
    name?: string;
    currency?: string;
    taxRegime?: string;
    country?: string;
  };
  defaults?: {
    taxRate?: number;
    irpfRate?: number;
    dueDays?: number;
    currency?: string;
  };
  plan?: {
    name?: string;
    tier?: string;
    invoices?: { used?: number; limit?: number | "unlimited" };
    expenses?: { used?: number; limit?: number | "unlimited" };
    aiMessages?: { used?: number; limit?: number | "unlimited" };
    usage?: {
      invoices?: { used?: number; limit?: number | "unlimited" };
      expenses?: { used?: number; limit?: number | "unlimited" };
    };
  };
  recentActivity?: {
    lastInvoice?: { number?: string; date?: string; client?: string };
    lastExpense?: { date?: string; vendor?: string; amount?: number };
    overdueCount?: number;
    overdueAmount?: number;
    unpaidCount?: number;
  };
  currentMonth?: {
    revenue?: number;
    expenses?: number;
    profit?: number;
    invoiceCount?: number;
    expenseCount?: number;
  };
  monthlySummary?: {
    invoiced?: number;
    expenses?: number;
  };
  topClients?: Array<{
    name: string;
    totalRevenue?: number;
    invoiceCount?: number;
  }>;
}

export type DeepLinkSection =
  "invoices" | "clients" | "products" | "quotes" | "expenses" | "dashboard";
