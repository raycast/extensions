/**
 * Result shapes of the folnaro-mcp tools this extension uses, taken from the output schemas in
 * docs/mcp/*.md (generated from mac/Packages/FolnaroKit/Sources/FolnaroMCP). Only the members the
 * extension reads are typed; output objects are open, so new members never break parsing.
 * Money is a decimal string in euros plus the same amount in cents (`<name>_cents`).
 */

export type DocumentKind =
  | "quote"
  | "orderConfirmation"
  | "invoice"
  | "partialInvoice"
  | "finalInvoice"
  | "creditNote"
  | "cancellation"
  | "deliveryNote"
  | "selfBilling";

export type DocumentStatus =
  | "draft"
  | "ready_to_finalize"
  | "open"
  | "sent"
  | "partiallyPaid"
  | "paid"
  | "writtenOff"
  | "cancelled"
  | "accepted"
  | "declined";

/** documents_list, `documents[]`. */
export interface DocumentSummary {
  id: string;
  kind: DocumentKind;
  status: DocumentStatus;
  number: string | null;
  title?: string;
  customer_id?: string | null;
  customer_name?: string;
  project_id?: string | null;
  issue_date: string;
  due_date?: string | null;
  is_draft: boolean;
  is_overdue?: boolean;
  days_overdue?: number;
  is_queued_for_number?: boolean;
  gross_total: string;
  gross_total_cents: number;
  net_total?: string;
  net_total_cents?: number;
  tax_total?: string;
  tax_total_cents?: number;
  open_amount?: string;
  open_amount_cents?: number;
  paid_total?: string;
  paid_total_cents?: number;
}

export interface DocumentsListResult {
  count: number;
  total_count?: number;
  documents: DocumentSummary[];
}

/** documents_create_draft, `document` (same shape as documents_get; only the header is read). */
export interface DocumentDetail extends DocumentSummary {
  lines: unknown[];
}

/** documents_pdf. The bytes come as an embedded resource block next to this metadata. */
export interface DocumentPdfResult {
  document_id: string;
  number?: string | null;
  file_name: string;
  mime_type?: string;
  size_bytes: number;
  sha256: string;
  is_draft?: boolean;
  is_archived: boolean;
  archive_path?: string | null;
  resource_uri: string;
}

export interface Address {
  street: string;
  addition?: string;
  postal_code: string;
  city: string;
  country_code: string;
}

/** customers_search, `customers[]`. */
export interface Customer {
  id: string;
  number: string;
  display_name: string;
  company?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  vat_id?: string;
  kind: "business" | "person" | "publicAuthority";
  language: "de" | "en";
  is_archived: boolean;
  hourly_rate?: string | null;
  payment_term_days?: number | null;
  address: Address;
}

export interface CustomersResult {
  count: number;
  customers: Customer[];
}

export type ProjectStatus = "planned" | "active" | "paused" | "done";

/** projects_list, `projects[]`. */
export interface Project {
  id: string;
  name: string;
  number?: string;
  customer_id?: string | null;
  status?: ProjectStatus;
  is_archived?: boolean;
  hourly_rate?: string | null;
  budget_amount?: string | null;
  budget_hours?: string | null;
  activities?: string[];
  color?: string;
  notes?: string;
}

export interface ProjectsResult {
  count: number;
  projects: Project[];
}

export type ExpenseStatus = "inbox" | "booked" | "voided";

/** expenses_list, `expenses[]`, and the `expense` of expenses_create. */
export interface Expense {
  id: string;
  vendor: string;
  date: string;
  status: ExpenseStatus;
  category: string;
  category_title?: string;
  gross_amount: string;
  gross_amount_cents: number;
  net_amount?: string;
  tax_amount?: string;
  tax_rate?: string;
  vat_mode: string;
  invoice_number?: string;
  note?: string;
  has_receipt?: boolean;
  receipt_original_name?: string | null;
  project_id?: string | null;
  currency_code?: string;
}

export interface ExpensesResult {
  count: number;
  expenses: Expense[];
}

export interface ExpenseResult {
  expense: Expense;
}

export interface ReceiptFileResult {
  expense: Expense;
  file: { id: string; original_name?: string; content_type?: string; page_order: number; sha256?: string };
}

/** Time entry as returned by time_start_timer, time_stop_timer, time_running and time_list. */
export interface TimeEntry {
  id: string;
  date: string;
  duration_seconds: number;
  duration_minutes?: number;
  hours?: string;
  is_running: boolean;
  is_billable: boolean;
  started_at?: string | null;
  ended_at?: string | null;
  customer_id?: string | null;
  project_id?: string | null;
  activity?: string;
  note?: string;
  hourly_rate?: string | null;
  status?: "proposed" | "approved";
  billed_document_id?: string | null;
}

export interface TimeEntryResult {
  entry: TimeEntry;
}

export interface RunningTimerResult {
  entry: TimeEntry | null;
}

export interface TimeListResult {
  count: number;
  entries: TimeEntry[];
  total_hours?: string;
}

/** One line of documents_create_draft `lines`. */
export interface DraftLineInput {
  kind?: "item" | "text" | "heading";
  title: string;
  details?: string;
  quantity?: string;
  unit?: string;
  unit_price?: string;
  tax_rate?: string;
  project_id?: string;
}

export interface CreateDraftInput {
  kind: DocumentKind;
  customer_id?: string;
  project_id?: string;
  title?: string;
  service_date_start?: string;
  service_date_end?: string;
  lines?: DraftLineInput[];
}

export interface CreateExpenseInput {
  vendor: string;
  gross_amount: string;
  date?: string;
  category?: string;
  note?: string;
  invoice_number?: string;
  tax_rate?: string;
  project_id?: string;
}

export interface StartTimerInput {
  customer_id?: string;
  project_id?: string;
  activity?: string;
  note?: string;
  status?: "proposed" | "approved";
}
