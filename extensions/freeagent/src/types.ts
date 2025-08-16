export interface Invoice {
  id: number;
  reference: string;
  contact: string;
  contact_name: string;
  dated_on: string;
  due_on: string;
  net_value: string;
  status: string;
  long_status: string;
  currency: string;
  exchange_rate: string;
  total_value: string;
  paid_value: string;
  due_value: string;
  url: string;
  involves_sales_tax: boolean;
  is_interim_uk_vat: boolean;
  omit_header: boolean;
  always_show_bic_and_iban: boolean;
  payment_terms_in_days: number;
  paid_on?: string;
  created_at: string;
  updated_at: string;
  send_new_invoice_emails: boolean;
  send_reminder_emails: boolean;
  send_thank_you_emails: boolean;
  bank_account: string;
  payment_methods: Record<string, boolean>;
  sales_tax_value?: string;
  discount_value?: string;
  discount_percent?: string;
  comments?: string;
  po_reference?: string;
  project?: string;
  show_project_name?: boolean;
  include_timeslips?: string;
}

export interface Contact {
  url: string;
  first_name?: string;
  last_name?: string;
  organisation_name?: string;
  email?: string;
  phone_number?: string;
  contact_name_on_invoices: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TimelineItem {
  description: string;
  nature: string;
  dated_on: string;
  amount_due: string;
  is_personal: boolean;
}

export interface BankAccount {
  url: string;
  type: string;
  name: string;
  bank_name?: string;
  opening_balance: string;
  current_balance: string;
  currency: string;
  is_personal: boolean;
  status: string;
}

export interface BankTransaction {
  url: string;
  amount: string;
  dated_on: string;
  description: string;
  full_description: string;
  is_manual: boolean;
  transaction_id: string;
  bank_account: string;
  unexplained_amount?: string;
  bank_transaction_explanations?: string[];
  status?: string;
  marked_for_review?: boolean;
}

export interface Timeslip {
  url: string;
  task: string | Task;
  user: string | User;
  project: string | Project;
  dated_on: string;
  hours: string;
  comment?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  url: string;
  name: string;
  description?: string;
  contact: string;
  contact_name: string;
  status: string;
  is_billable: boolean;
  budget?: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  url: string;
  project: string;
  name: string;
  currency: string;
  is_billable: boolean;
  billing_rate: string;
  billing_period: string;
  status: string;
  created_at: string;
  updated_at: string;
  is_deletable: boolean;
}

export interface User {
  url: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  permission_level: number;
  created_at: string;
  updated_at: string;
}

export interface CompanyInfo {
  subdomain: string;
  currency: string;
  name?: string;
  address?: string;
  phone_number?: string;
  email?: string;
  website?: string;
}

export interface Preferences {
  default_payment_terms_in_days: string;
}

export interface InvoiceFormValues {
  contact: string;
  dated_on: Date;
  payment_terms_in_days: string;
  reference?: string;
  send_new_invoice_emails: boolean;
}

export interface InvoiceCreateData {
  contact: string;
  dated_on: string;
  payment_terms_in_days: number;
  send_new_invoice_emails: boolean;
  reference?: string;
}

export interface TimeslipFormValues {
  project: string;
  task: string;
  comment?: string;
  dated_on: Date;
  hours: string;
}

export interface TimeslipCreateData {
  task: string;
  user: string;
  project: string;
  dated_on: string;
  hours: number;
  comment?: string;
}

export interface InvoicesResponse {
  invoices: Invoice[];
}

export interface ContactsResponse {
  contacts: Contact[];
}

export interface TimelineResponse {
  timeline_items: TimelineItem[];
}

export interface BankAccountsResponse {
  bank_accounts: BankAccount[];
}

export interface BankTransactionsResponse {
  bank_transactions: BankTransaction[];
}

export interface TimeslipsResponse {
  timeslips: Timeslip[];
}

export interface UserResponse {
  user: User;
}

export interface CompanyResponse {
  company: CompanyInfo;
}

export interface InvoiceResponse {
  invoice: Invoice;
}

export interface ProjectsResponse {
  projects: Project[];
}

export interface TasksResponse {
  tasks: Task[];
}

export interface TimeslipResponse {
  timeslip: Timeslip;
}

export interface Category {
  url: string;
  description: string;
  nominal_code: string;
  allowable_for_tax?: boolean;
  tax_reporting_name?: string;
  auto_sales_tax_rate?: string;
  group_description?: string;
}

export interface CategoriesResponse {
  admin_expenses_categories?: Category[];
  cost_of_sales_categories?: Category[];
  income_categories?: Category[];
  general_categories?: Category[];
}

export interface BankTransactionExplanation {
  url?: string;
  bank_transaction: string;
  bank_account: string;
  dated_on: string;
  description: string;
  category?: string;
  gross_value: string;
  project?: string;
  rebill_type?: string;
  rebill_factor?: string;
  sales_tax_status?: string;
  sales_tax_rate?: string;
  sales_tax_value?: string;
  is_deletable?: boolean;
  updated_at?: string;
}

export interface BankTransactionExplanationResponse {
  bank_transaction_explanation: BankTransactionExplanation;
}

export interface BankTransactionExplanationCreateData {
  bank_transaction: string;
  bank_account: string;
  dated_on: string;
  description: string;
  category?: string;
  gross_value: string;
  project?: string;
  sales_tax_status?: string;
  sales_tax_rate?: string;
}

export interface BankTransactionExplanationUpdateData {
  description?: string;
  category?: string;
  gross_value?: string;
  project?: string;
  sales_tax_status?: string;
  sales_tax_rate?: string;
  attachment?: string; // URL of uploaded attachment
}

export interface AttachmentUploadData {
  file_name: string;
  content_type: string;
  data: string; // base64 encoded file data
  description?: string;
}

export interface Attachment {
  url: string;
  content_src: string;
  content_src_medium?: string;
  content_src_small?: string;
  expires_at?: string;
  content_type: string;
  file_name: string;
  file_size: number;
  description?: string;
}

export interface AttachmentResponse {
  attachment: Attachment;
}

export interface BankTransactionUpdateData {
  marked_for_review?: boolean;
  description?: string;
}

export interface BankTransactionResponse {
  bank_transaction: BankTransaction;
}
