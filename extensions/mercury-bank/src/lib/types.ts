// ─── Feature Capabilities ────────────────────────────────────────────────────

export interface FeatureCapabilities {
  detected: Record<string, boolean>;
  overrides: Record<string, boolean>;
  probedAt: string;
}

// ─── Stored Account (LocalStorage) ───────────────────────────────────────────

export interface StoredAccount {
  id: string;
  name: string;
  apiKey: string;
  createdAt: string;
  capabilities?: FeatureCapabilities;
}

// ─── Mercury API Types ──────────────────────────────────────────────────────

export interface MercuryAccount {
  id: string;
  accountNumber: string;
  routingNumber: string;
  name: string;
  status: "active" | "deleted" | "pending" | "archived" | string;
  type: "mercury" | "external" | "recipient" | string;
  kind: string;
  createdAt: string;
  availableBalance: number;
  currentBalance: number;
  legalBusinessName: string;
  dashboardLink: string;
  nickname?: string | null;
  canReceiveTransactions?: boolean | null;
}

export interface Address {
  address1: string | null;
  address2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
}

export interface ElectronicRoutingInfo {
  accountNumber: string;
  routingNumber: string;
  bankName: string | null;
  electronicAccountType:
    | "businessChecking"
    | "businessSavings"
    | "personalChecking"
    | "personalSavings"
    | string;
  address: Address | null;
}

export interface DomesticWireRoutingInfo {
  accountNumber: string;
  routingNumber: string;
  bankName: string | null;
  address: Address | null;
  defaultForBenefitOf?: string | null;
}

export interface InternationalWireRoutingInfo {
  iban: string | null;
  swiftCode: string | null;
  correspondentInfo: {
    routingNumber: string | null;
    swiftCode: string | null;
    bankName: string | null;
  } | null;
}

export interface Transaction {
  id: string;
  accountId?: string;
  amount: number;
  direction?: "debit" | "credit";
  currencyCode?: string;
  bankDescription: string | null;
  counterpartyId?: string;
  counterpartyName: string;
  counterpartyNickname?: string | null;
  createdAt: string;
  postedAt?: string | null;
  dashboardLink?: string | null;
  estimatedDeliveryDate?: string | null;
  externalMemo: string | null;
  failedAt?: string | null;
  reasonForFailure?: string | null;
  feeId?: string | null;
  feeAmount?: number | null;
  kind: string;
  paymentMethod?: string;
  mercuryCategory?: string | null;
  categoryId?: string | null;
  categoryData?: { id: string; name: string } | null;
  customCategory?: { id: string; name: string } | null;
  note: string | null;
  status: string;
  receiptId?: string | null;
  compliantWithReceiptPolicy?: boolean;
  hasGeneratedStatement?: boolean;
  attachments?: Array<{ id: string; fileName: string; url: string }>;
  details?: Record<string, unknown> | null;
}

export interface Card {
  cardId: string;
  nameOnCard: string;
  lastFourDigits: string;
  network: "visa" | "mastercard" | string;
  status:
    | "active"
    | "frozen"
    | "cancelled"
    | "inactive"
    | "expired"
    | "suspended"
    | string;
  createdAt: string;
  physicalCardStatus?: "inactive" | "active" | "paused" | null;
}

export interface Recipient {
  id: string;
  name: string;
  nickname: string | null;
  status: "active" | "deleted";
  emails: string[];
  contactEmail?: string | null;
  dateLastPaid: string | null;
  defaultPaymentMethod: "ach" | "check" | "domesticWire" | "internationalWire";
  createdAt?: string;
  electronicRoutingInfo: ElectronicRoutingInfo | null;
  domesticWireRoutingInfo: DomesticWireRoutingInfo | null;
  internationalWireRoutingInfo: InternationalWireRoutingInfo | null;
  checkInfo?: { address: Address } | null;
  address: Address | null;
  paymentTiming?: string | null;
}

export interface InvoiceLineItem {
  name: string;
  unitPrice: number;
  quantity: number;
  salesTaxRate?: number | null;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  slug: string;
  status: "Unpaid" | "Paid" | "Cancelled" | "Processing" | string;
  amount: number;
  customerId: string;
  destinationAccountId: string;
  invoiceDate: string;
  dueDate: string;
  lineItems: InvoiceLineItem[];
  creditCardEnabled: boolean;
  achDebitEnabled: boolean;
  useRealAccountNumber: boolean;
  ccEmails: string[];
  createdAt: string;
  updatedAt: string;
  poNumber?: string | null;
  payerMemo?: string | null;
  internalNote?: string | null;
  canceledAt?: string | null;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  address?: {
    address1: string;
    address2?: string | null;
    city: string;
    region: string;
    postalCode: string;
    country: string;
  } | null;
  deletedAt?: string | null;
}

export interface TreasuryAccount {
  id: string;
  accountNumber: string;
  routingNumber: string;
  name: string;
  status: "active" | "deleted" | "pending" | "archived" | string;
  type: string;
  kind: string;
  createdAt: string;
  availableBalance: number;
  currentBalance: number;
  legalBusinessName: string;
  dashboardLink: string;
  nickname?: string | null;
  canReceiveTransactions?: boolean | null;
}

export interface CreditAccount {
  id: string;
  creditLimit: number;
  currentBalance: number;
  availableCredit: number;
  apr: number;
  status: string;
  dueDate: string | null;
  minimumPayment: number | null;
}

export interface Organization {
  id: string;
  kind: "personal" | "business" | string;
  legalBusinessName: string;
  createdAt: string;
  ein?: string | null;
  dbas?: string[];
  status?: string;
}

export interface TeamMember {
  id: string;
  role:
    | "administrator"
    | "bookkeeper"
    | "customUser"
    | "cardOnlyUser"
    | "employee"
    | string;
  email: string;
  status?: string;
  createdAt: string;
}

export interface Statement {
  id: string;
  startDate: string;
  endDate: string;
  companyLegalName: string;
  companyLegalAddress?: Address | null;
  endingBalance: number;
  downloadUrl?: string;
  ein?: string | null;
}

export interface Category {
  id: string;
  name: string;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  status: "active" | "paused" | "disabled" | string;
  createdAt: string;
  updatedAt: string;
  secret?: string | null;
  eventTypes?: string[] | null;
  filterPaths?: string[] | null;
}

export interface MercuryEvent {
  id: string;
  resourceType:
    | "transaction"
    | "checkingAccount"
    | "savingsAccount"
    | "treasuryAccount"
    | "investmentAccount"
    | "creditAccount"
    | string;
  resourceId: string;
  operationType: "create" | "update" | "delete" | string;
  resourceVersion: number;
  occurredAt: string;
  changedPaths: string[];
  mergePatch: Record<string, unknown>;
  previousValues?: Record<string, unknown> | null;
}

// ─── API Response Wrappers ──────────────────────────────────────────────────

export interface Page {
  nextPage: string | null;
  previousPage: string | null;
}

export interface AccountsResponse {
  accounts: MercuryAccount[];
  page?: Page;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  page?: Page;
}

export interface CardsResponse {
  cards: Card[];
}

export interface RecipientsResponse {
  recipients: Recipient[];
  page?: Page;
}

export interface InvoicesResponse {
  invoices: Invoice[];
}

export interface CustomersResponse {
  customers: Customer[];
}

export interface TreasuryResponse {
  accounts: TreasuryAccount[];
  page?: Page;
}

export interface TeamResponse {
  users: TeamMember[];
  page?: Page;
}

export interface StatementsResponse {
  statements: Statement[];
}

export interface CategoriesResponse {
  categories: Category[];
  page?: Page;
}

export interface WebhooksResponse {
  webhooks: WebhookEndpoint[];
  page?: Page;
}

export interface EventsResponse {
  events: MercuryEvent[];
  page?: Page;
}

// ─── Request Types ──────────────────────────────────────────────────────────

export interface TransactionFilters {
  limit?: number;
  offset?: number;
  status?: string;
  search?: string;
  start?: string;
  end?: string;
}

export interface CreateRecipientRequest {
  name: string;
  emails: string[];
  defaultPaymentMethod: "ach" | "check" | "domesticWire" | "internationalWire";
  nickname?: string;
  contactEmail?: string;
  electronicRoutingInfo?: {
    accountNumber: string;
    routingNumber: string;
    electronicAccountType: string;
  };
  domesticWireRoutingInfo?: {
    accountNumber: string;
    routingNumber: string;
  };
  checkInfo?: {
    address: Partial<Address>;
  };
  address?: Partial<Address>;
}

export interface SendPaymentRequest {
  recipientId: string;
  amount: number;
  paymentMethod: "ach" | "check" | "domesticWire" | "internationalWire";
  idempotencyKey: string;
  memo?: string;
}

export interface CreateTransferRequest {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  idempotencyKey: string;
  memo?: string;
}

export interface UpdateTransactionRequest {
  note?: string;
  categoryId?: string;
}

export interface CreateInvoiceRequest {
  customerId: string;
  destinationAccountId: string;
  dueDate: string;
  invoiceDate: string;
  lineItems: Array<{
    name: string;
    unitPrice: number;
    quantity: number;
    salesTaxRate?: number;
  }>;
  creditCardEnabled: boolean;
  achDebitEnabled: boolean;
  useRealAccountNumber: boolean;
  ccEmails: string[];
  invoiceNumber?: string;
  poNumber?: string;
  payerMemo?: string;
  internalNote?: string;
  sendEmailOption?: "DontSend" | "SendNow";
}

export interface CreateCustomerRequest {
  name: string;
  email: string;
  address?: {
    name: string;
    address1: string;
    address2?: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
  };
}

export interface CreateWebhookRequest {
  url: string;
  eventTypes?: string[] | null;
  filterPaths?: string[] | null;
}