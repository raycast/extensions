export interface FigaApiSuccess<T> {
  success: true;
  message?: string;
  data: T;
}

export interface FigaApiFailure {
  success: false;
  message?: string;
  error?: {
    code?: string;
    details?: unknown;
  };
}

export type FigaApiResponse<T> = FigaApiSuccess<T> | FigaApiFailure;

export type FigaPlanTier = "free" | "pro" | "enterprise";

export type FigaFriendlyErrorKind =
  | "missing-api-key"
  | "invalid-api-key"
  | "paid-plan-required"
  | "insufficient-permissions"
  | "forbidden"
  | "rate-limited"
  | "validation-error"
  | "network-failure"
  | "unexpected-response"
  | "request-failed"
  | "unexpected-error";

export interface FigaWorkspaceContextV1 {
  schemaVersion: 1;
  generatedAt: number;
  workspace: {
    id: string;
    name: string;
    baseCurrency: string;
  };
  plan: {
    tier: FigaPlanTier;
    criticalLimits: {
      apiKeysPerWorkspace: number | null;
      maxExpensesPerMonth: number | null;
      maxAiChatRequests: number | null;
      maxAiVisionRequests: number | null;
    };
  };
}

export interface FigaWorkspaceContextCapabilities {
  expenses: {
    read: boolean;
    write: boolean;
    delete: boolean;
    payments: boolean;
  };
  categories: {
    read: boolean;
    write: boolean;
    delete: boolean;
  };
  recipients: {
    read: boolean;
    write: boolean;
    delete: boolean;
  };
  workspaces: {
    read: boolean;
  };
}

export interface FigaWorkspaceContextV2 extends Omit<FigaWorkspaceContextV1, "schemaVersion"> {
  schemaVersion: 2;
  defaults: {
    baseCurrency: string;
  };
  capabilities: FigaWorkspaceContextCapabilities;
}

export interface FigaWorkspaceContextV3 extends Omit<FigaWorkspaceContextV2, "schemaVersion" | "plan"> {
  schemaVersion: 3;
  plan: {
    tier: FigaPlanTier;
    criticalLimits: { apiKeysPerWorkspace: number | null; maxExpensesPerMonth: number | null };
  };
  capabilities: FigaWorkspaceContextCapabilities & {
    tags: { read: boolean; write: boolean; delete: boolean };
  };
}

export type FigaWorkspaceContext = FigaWorkspaceContextV1 | FigaWorkspaceContextV2 | FigaWorkspaceContextV3;

export interface FigaPaginationMeta {
  limit: number;
  offset: number;
  total: number;
}

export interface FigaReferenceItem {
  id: string;
  name: string;
  description: string | null;
  isGlobal: boolean;
  userId: string;
  workspaceId: string | null;
  expenseCount?: number;
}

export interface FigaCategory extends FigaReferenceItem {
  color: string | null;
}

export type FigaRecipient = FigaReferenceItem;

export interface FigaCategoryListResponse {
  categories: FigaCategory[];
  pagination: FigaPaginationMeta;
}

export interface FigaRecipientListResponse {
  recipients: FigaRecipient[];
  pagination: FigaPaginationMeta;
}

export type FigaExpenseInstanceType = "template" | "virtual" | "materialized";

export interface FigaTag {
  id: string;
  name: string;
}

export interface FigaTagListResponse {
  tags: FigaTag[];
}

export interface FigaExpense {
  tagIds?: string[];
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  amount: number | null;
  categoryId: string | null;
  recipientId: string | null;
  expenseDate: number | null;
  isPaid: boolean;
  paidAt?: number | null;
  paymentStatusRevision?: number;
  editContext?: string;
  bill?: { state: "unknown" | "estimated" | "confirmed"; revision: number };
  dueBy?: number;
  scheduledDate?: number;
  money?: { amountState: "unknown" | "estimated" | "confirmed"; fxIsEstimated: boolean };
  isRecurring: boolean;
  schedule: unknown | null;
  instanceType: FigaExpenseInstanceType;
  templateId?: string | null;
  context: {
    categoryName: string;
    categoryColor: string | null;
    recipientName: string | null;
  };
  commitment?: {
    totalOccurrences: number;
    completedOccurrences: number;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    progress: number;
  };
  currency?: string;
  isSkipped?: boolean;
  skippedAt?: number;
  createdAt?: number;
  updatedAt?: number;
}

export interface FigaExpenseListQuery {
  year: number;
  month: number;
  includeTemplates?: boolean;
  showPaidOnly?: boolean;
  showUnpaidOnly?: boolean;
  categoryId?: string;
  recipientId?: string;
  excludeExpenseId?: string;
  limit?: number;
}

export interface FigaExpenseListResponse {
  expenses: FigaExpense[];
  metadata: {
    year: number;
    month: number;
    totalCount: number;
    paidCount: number;
    unpaidCount: number;
    recurringCount: number;
    totalAmount: number;
    paidAmount: number;
    unpaidAmount: number;
    planLimit?: FigaPlanLimit;
  };
}

export interface FigaExpenseCreatePayload {
  tagIds?: string[];
  name: string;
  amount: number;
  categoryInput: string;
  recipientInput?: string | null;
  description?: string;
  expenseDate?: number;
  currency?: string;
}

export interface FigaExpenseCreateResponse {
  expense: FigaExpense;
}

export interface FigaExpensePayment {
  id: string;
  expenseInstanceId: string;
  userId: string;
  amount: number;
  currency: string;
  baseAmountMinor: number | null;
  baseCurrency: string;
  currencySemantics: "explicit" | "legacy_same_currency" | "legacy_base" | "legacy_original" | "legacy_ambiguous";
  paymentDate: number;
  paymentMethod: string | null;
  notes: string | null;
}

export interface FigaExpensePaymentListResponse {
  payments: FigaExpensePayment[];
  metadata: {
    totalPaid: number;
    remainingAmount: number;
    currency: string;
    baseTotalPaid: number | null;
    baseRemainingAmount: number | null;
    baseCurrency: string;
    currencySemantics: FigaExpensePayment["currencySemantics"];
    paymentCount: number;
  };
}

export interface FigaExpensePaymentPayload {
  amount?: number;
  paymentDate?: number;
  paymentMethod?: string;
  notes?: string;
}

export interface FigaExpensePaymentResponse {
  expense: FigaExpense;
  payment: FigaExpensePayment;
}

export interface FigaMonthlyTotalsQuery {
  startYear: number;
  startMonth: number;
  months?: number;
}

export interface FigaPlanLimit {
  current: number;
  limit: number | null;
  restricted?: boolean;
  blocked?: number;
}

export interface FigaMonthlyTotalItem {
  confirmedAmount?: number;
  estimatedAmount?: number;
  unknownCount?: number;
  isComplete?: boolean;
  planLimit?: FigaPlanLimit;
  monetary?: {
    baseCurrency: string;
    estimatedFxCount: number;
    paidUnknownCount: number;
  };
  year: number;
  month: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
}

export interface FigaMonthlyTotalsResponse {
  currency: string;
  totals: FigaMonthlyTotalItem[];
}

export interface FigaFriendlyError {
  kind: FigaFriendlyErrorKind;
  title: string;
  message: string;
  action?: string;
  status?: number | null;
  code?: string | null;
}

export interface FigaExpensePaymentStatusPayload {
  isPaid: boolean;
  expectedEditContext: string;
  expectedPaymentStatusRevision: number;
  expectedBillRevision?: number;
  paymentDate?: number;
}
