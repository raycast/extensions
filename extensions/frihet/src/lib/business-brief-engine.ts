/**
 * Native Raycast Business Brief Engine (`BRIEF-01`).
 *
 * Synced with the canonical Monetary & Temporal Brief Contract from
 * `Frihet-io/frihet-mcp#257` (`daily-operational-brief.ts`).
 *
 * Enforces:
 * 1. Absent != 0: `resolveDocumentAmount({})` (when `total`, `amount`, and valid `items`
 *    are absent) returns `amount: null, provenance: "unavailable", unavailableCount: 1`
 *    (never `0 EUR`). Summing a bucket with any `unavailable` document marks the aggregate
 *    `amount: null, provenance: "unavailable"`.
 * 2. Multi-currency separation: `sumProvenancedAmounts` keeps currencies separate in
 *    `totalsByCurrency` and returns `amount: null, currency: "MIXED", provenance: "mixed_currency_unconverted"`
 *    when `>1` currency is present (never summing `100 EUR + 100 USD` into `200 EUR`).
 * 3. Canonical discounts & taxes: `resolveDocumentAmount` applies per-line `discount`,
 *    document-level `discountRate`, `taxRate`, `equivalenceSurchargeRate`, and `irpfRate`
 *    over the discounted tax-exclusive base, and fails closed to `unavailable` on
 *    unsupported modifiers (`pricesIncludeTax: true`, `compoundTaxes`, `prepayment`).
 * 4. Honest unpaid nominal wording: sets `realOutstandingBalanceDeterminable: false`,
 *    `unpaidNominalSemantics: "nominal_unpaid_invoice_totals_without_partial_payments"`,
 *    `unpaidNominalTotal`, `unpaidNominalTotalsByCurrency`, and labels unpaid invoices in
 *    Markdown as `Importe nominal de facturas no marcadas como pagadas (saldo pendiente real no determinable sin cobros parciales)`.
 * 5. Explicit temporal scope: sets `coverage.temporalScope = "unfiltered_operational_sample_as_of_date"`
 *    and includes `currentMonthActivity` (`referenceMonth: periodMonth`), explicitly separating
 *    the operational sample as of `asOfDate` from the current-month subset in both structure
 *    and Markdown.
 */

import {
  buildFrihetDeepLink,
  formatCurrencyAmount,
  formatProvenancedAmount,
  resolveDocumentAmount,
  sumProvenancedAmounts,
} from "./frihet-client.js";
import type {
  BusinessContext,
  ClientActivityRecord,
  ClientRecord,
  CurrencyBucketAmount,
  ExpenseRecord,
  InvoiceRecord,
  PaginatedResponse,
  ProvenancedAmount,
  QuoteRecord,
} from "./types.js";

export {
  formatProvenancedAmount,
  resolveDocumentAmount,
  sumProvenancedAmounts,
};

export interface BriefClientPort {
  getBusinessContext(options?: {
    bypassCache?: boolean;
    signal?: AbortSignal;
  }): Promise<BusinessContext>;
  listInvoices(params?: {
    limit?: number;
    bypassCache?: boolean;
    signal?: AbortSignal;
  }): Promise<PaginatedResponse<InvoiceRecord>>;
  listQuotes(params?: {
    limit?: number;
    bypassCache?: boolean;
    signal?: AbortSignal;
  }): Promise<PaginatedResponse<QuoteRecord>>;
  listExpenses(params?: {
    limit?: number;
    bypassCache?: boolean;
    signal?: AbortSignal;
  }): Promise<PaginatedResponse<ExpenseRecord>>;
  listClients(params?: {
    limit?: number;
    bypassCache?: boolean;
    signal?: AbortSignal;
  }): Promise<PaginatedResponse<ClientRecord>>;
  listClientActivities(
    clientId: string,
    params?: { limit?: number; bypassCache?: boolean; signal?: AbortSignal },
  ): Promise<PaginatedResponse<ClientActivityRecord>>;
}

export interface ResourceCoverageItem {
  resource:
    "invoices" | "quotes" | "expenses" | "clients" | "client_activities";
  collection:
    "invoices" | "quotes" | "expenses" | "clients" | "client_activities";
  sourceTool: string;
  inspected: number;
  total: number;
  complete: boolean;
  nextCursor?: string;
}

export interface BriefCoverage {
  asOfDate: string;
  periodMonth: string;
  referenceMonth: string;
  temporalScope: "unfiltered_operational_sample_as_of_date";
  temporalScopeNote: string;
  isPartial: boolean;
  badgeLabel: string;
  resources: Record<ResourceCoverageItem["resource"], ResourceCoverageItem>;
}

export type AggregateAmount = ProvenancedAmount;

export interface BriefDocumentSummary {
  id: string;
  documentNumber: string | null;
  status: string;
  counterpartyName: string;
  issueDate: string | null;
  dueDate: string | null;
  amount: ProvenancedAmount;
}

export interface CurrentMonthActivitySummary {
  referenceMonth: string;
  note: string;
  issuedInvoicesInMonthCount: number;
  issuedInvoicesInMonthTotal: ProvenancedAmount;
  invoiceDraftsInMonthCount: number;
  invoiceDraftsInMonthTotal: ProvenancedAmount;
  expensesInMonthCount: number;
  expensesInMonthTotal: ProvenancedAmount;
}

export interface FinancialSeparation {
  currency: string;
  drafts: {
    invoiceDraftsCount: number;
    invoiceDraftsTotal: ProvenancedAmount;
    quoteDraftsCount: number;
    quoteDraftsTotal: ProvenancedAmount;
    note: string;
  };
  issuedRevenue: {
    count: number;
    total: ProvenancedAmount;
    byStatus: Record<string, number>;
    note: string;
  };
  recordedPaid: {
    count: number;
    total: ProvenancedAmount;
  };
  outstandingBalance: {
    realOutstandingBalanceDeterminable: false;
    unpaidNominalSemantics: "nominal_unpaid_invoice_totals_without_partial_payments";
    unpaidNominalInvoicesCount: number;
    unpaidNominalTotal: ProvenancedAmount;
    unpaidNominalTotalsByCurrency: Record<string, CurrencyBucketAmount>;
    overdueNominalInvoicesCount: number;
    overdueNominalTotal: ProvenancedAmount;
    onTimeNominalPendingCount: number;
    onTimeNominalPendingTotal: ProvenancedAmount;
    totalCount: number;
    totalAmount: ProvenancedAmount;
    overdueCount: number;
    overdueAmount: ProvenancedAmount;
    onTimeCount: number;
    onTimeAmount: ProvenancedAmount;
  };
  expensesSummary: {
    count: number;
    total: ProvenancedAmount;
    deductibleCount: number;
    deductibleTotal: ProvenancedAmount;
    nonDeductibleCount: number;
    nonDeductibleTotal: ProvenancedAmount;
    incompleteMetadataCount: number;
  };
  currentMonthActivity: CurrentMonthActivitySummary;
}

export type ReviewPriorityLevel = "HIGH" | "MEDIUM" | "LOW";

export interface BriefReviewItem {
  id: string;
  priority: ReviewPriorityLevel;
  category:
    | "overdue_invoice"
    | "draft_invoice"
    | "tax_discrepancy"
    | "incomplete_expense"
    | "crm_followup"
    | "plan_quota";
  title: string;
  subtitle: string;
  why: string;
  recordIds: string[];
  recordLabels: string[];
  amount?: ProvenancedAmount;
  deepLink: string;
  suggestedAction: string;
}

export interface OperationalBusinessBrief {
  question: string;
  workspaceName: string;
  currency: string;
  defaultTaxRate?: number;
  fiscalZone?: string;
  planTier: string;
  coverage: BriefCoverage;
  financials: FinancialSeparation;
  activitySeparation: {
    draftActivity: {
      note: string;
      invoiceDraftsCount: number;
      invoiceDraftsTotal: ProvenancedAmount;
      invoiceDrafts: BriefDocumentSummary[];
      quoteDraftsCount: number;
      quoteDraftsTotal: ProvenancedAmount;
      quoteDrafts: BriefDocumentSummary[];
    };
    issuedActivity: {
      note: string;
      realOutstandingBalanceDeterminable: false;
      unpaidNominalSemantics: "nominal_unpaid_invoice_totals_without_partial_payments";
      issuedInvoicesCount: number;
      issuedInvoicesByStatus: Record<string, number>;
      issuedInvoicesTotal: ProvenancedAmount;
      issuedInvoices: BriefDocumentSummary[];
      paidInvoicesCount: number;
      paidInvoicesTotal: ProvenancedAmount;
      paidInvoices: BriefDocumentSummary[];
      unpaidNominalInvoicesCount: number;
      unpaidNominalTotal: ProvenancedAmount;
      unpaidNominalTotalsByCurrency: Record<string, CurrencyBucketAmount>;
      overdueNominalInvoicesCount: number;
      overdueNominalTotal: ProvenancedAmount;
      onTimeNominalPendingCount: number;
      onTimeNominalPendingTotal: ProvenancedAmount;
      outstandingInvoicesCount: number;
      outstandingInvoicesTotal: ProvenancedAmount;
      overdueInvoicesCount: number;
      overdueInvoicesTotal: ProvenancedAmount;
      onTimePendingCount: number;
      onTimePendingTotal: ProvenancedAmount;
      outstandingInvoices: BriefDocumentSummary[];
    };
    recordedExpenses: {
      note: string;
      expensesCount: number;
      expensesTotal: ProvenancedAmount;
      deductibleCount: number;
      deductibleTotal: ProvenancedAmount;
      nonDeductibleCount: number;
      nonDeductibleTotal: ProvenancedAmount;
      pendingReviewCount: number;
    };
    currentMonthActivity: CurrentMonthActivitySummary;
  };
  reviewItems: BriefReviewItem[];
  blindSpots: string[];
  knownUnknowns: string[];
  mutationsExecuted: 0;
  markdown: string;
}

export interface GenerateBriefOptions {
  asOfDate?: string;
  pageLimit?: number;
  maxCrmClientsToInspect?: number;
  bypassCache?: boolean;
  signal?: AbortSignal;
}

function getDocumentNumber(doc: {
  invoiceNumber?: string;
  quoteNumber?: string;
  documentNumber?: string;
  id: string;
}): string {
  return doc.invoiceNumber ?? doc.quoteNumber ?? doc.documentNumber ?? doc.id;
}

function isInvoiceOverdue(inv: InvoiceRecord, asOfDate: string): boolean {
  const status = (inv.status ?? "").toLowerCase();
  if (status === "overdue") return true;
  if (
    status !== "paid" &&
    status !== "draft" &&
    status !== "cancelled" &&
    inv.dueDate &&
    inv.dueDate < asOfDate
  ) {
    return true;
  }
  return false;
}

export async function generateOperationalBusinessBrief(
  client: BriefClientPort,
  options?: GenerateBriefOptions,
): Promise<OperationalBusinessBrief> {
  const asOfDate = options?.asOfDate ?? new Date().toISOString().slice(0, 10);
  const periodMonth = asOfDate.slice(0, 7);
  const pageLimit = options?.pageLimit ?? 25;
  const maxCrmClients = options?.maxCrmClientsToInspect ?? 5;
  const reqOpts = {
    bypassCache: options?.bypassCache,
    signal: options?.signal,
  };

  const [context, invoicesPage, quotesPage, expensesPage, clientsPage] =
    await Promise.all([
      client.getBusinessContext(reqOpts),
      client.listInvoices({ limit: pageLimit, ...reqOpts }),
      client.listQuotes({ limit: pageLimit, ...reqOpts }),
      client.listExpenses({ limit: pageLimit, ...reqOpts }),
      client.listClients({ limit: pageLimit, ...reqOpts }),
    ]);

  const workspaceName =
    context.business?.name ?? context.company?.name ?? "Frihet Workspace";
  const currency = (
    context.business?.currency ??
    context.company?.currency ??
    context.defaults?.currency ??
    "EUR"
  ).toUpperCase();
  const defaultTaxRate = context.defaults?.taxRate;
  const fiscalZone = context.business?.fiscalZone ?? context.company?.taxRegime;
  const planTier = context.plan?.name ?? context.plan?.tier ?? "free";

  const clientsToInspect = clientsPage.data.slice(0, maxCrmClients);
  const activitiesPerClient = await Promise.all(
    clientsToInspect.map(async (cli) => {
      const page = await client.listClientActivities(cli.id, {
        limit: 5,
        ...reqOpts,
      });
      return { client: cli, activities: page.data, total: page.total };
    }),
  );

  // 1. Coverage calculation with explicit temporal scope
  const makeCoverage = (
    resource: ResourceCoverageItem["resource"],
    sourceTool: string,
    page: PaginatedResponse<unknown>,
  ): ResourceCoverageItem => {
    const inspected = page.data.length;
    const total = Math.max(page.total ?? inspected, inspected);
    const complete = !page.nextCursor && !page.truncated && inspected >= total;
    return {
      resource,
      collection: resource,
      sourceTool,
      inspected,
      total,
      complete,
      ...(page.nextCursor ? { nextCursor: page.nextCursor } : {}),
    };
  };

  const invoicesCov = makeCoverage("invoices", "list_invoices", invoicesPage);
  const quotesCov = makeCoverage("quotes", "list_quotes", quotesPage);
  const expensesCov = makeCoverage("expenses", "list_expenses", expensesPage);
  const clientsCov = makeCoverage("clients", "list_clients", clientsPage);
  const crmTotalClients = Math.max(
    clientsPage.total ?? clientsPage.data.length,
    clientsPage.data.length,
  );
  const crmCov: ResourceCoverageItem = {
    resource: "client_activities",
    collection: "client_activities",
    sourceTool: "list_client_activities",
    inspected: clientsToInspect.length,
    total: crmTotalClients,
    complete:
      clientsCov.complete &&
      clientsToInspect.length >= crmTotalClients &&
      activitiesPerClient.every(
        (entry) =>
          entry.activities.length >= (entry.total ?? entry.activities.length),
      ),
  };

  const isPartial =
    !invoicesCov.complete ||
    !quotesCov.complete ||
    !expensesCov.complete ||
    !clientsCov.complete ||
    !crmCov.complete;

  const badgeLabel = isPartial
    ? `Partial Sample: ${invoicesCov.inspected}/${invoicesCov.total} inv · ${expensesCov.inspected}/${expensesCov.total} exp`
    : `Complete Coverage (${invoicesCov.total} inv · ${expensesCov.total} exp · ${clientsCov.total} clients)`;

  const coverage: BriefCoverage = {
    asOfDate,
    periodMonth,
    referenceMonth: periodMonth,
    temporalScope: "unfiltered_operational_sample_as_of_date",
    temporalScopeNote: `Las consultas list_invoices, list_quotes y list_expenses leen los registros recientes/abiertos a fecha de corte (${asOfDate}) sin filtro mensual para no ocultar impagos vencidos ni borradores de meses anteriores. La actividad específica del mes de referencia (${periodMonth}) se desglosa por separado en currentMonthActivity.`,
    isPartial,
    badgeLabel,
    resources: {
      invoices: invoicesCov,
      quotes: quotesCov,
      expenses: expensesCov,
      clients: clientsCov,
      client_activities: crmCov,
    },
  };

  // 2. Strict Financial Separation & Canonical Amount Resolution
  const draftInvoices: Array<{
    record: InvoiceRecord;
    summary: BriefDocumentSummary;
    amount: ProvenancedAmount;
  }> = [];
  const issuedInvoices: Array<{
    record: InvoiceRecord;
    summary: BriefDocumentSummary;
    amount: ProvenancedAmount;
  }> = [];
  const paidInvoices: Array<{
    record: InvoiceRecord;
    summary: BriefDocumentSummary;
    amount: ProvenancedAmount;
  }> = [];
  const overdueInvoices: Array<{
    record: InvoiceRecord;
    summary: BriefDocumentSummary;
    amount: ProvenancedAmount;
  }> = [];
  const onTimeOpenInvoices: Array<{
    record: InvoiceRecord;
    summary: BriefDocumentSummary;
    amount: ProvenancedAmount;
  }> = [];
  const issuedByStatus: Record<string, number> = {};

  for (const inv of invoicesPage.data) {
    const status = (inv.status ?? "draft").toLowerCase();
    const resolved = resolveDocumentAmount(inv, currency);
    const docNum = inv.invoiceNumber ?? inv.documentNumber ?? null;
    const summary: BriefDocumentSummary = {
      id: String(inv.id ?? ""),
      documentNumber: docNum,
      status,
      counterpartyName: inv.clientName || "Cliente sin nombre",
      issueDate: typeof inv.issueDate === "string" ? inv.issueDate : null,
      dueDate: typeof inv.dueDate === "string" ? inv.dueDate : null,
      amount: resolved,
    };

    if (status === "draft") {
      draftInvoices.push({ record: inv, summary, amount: resolved });
      continue;
    }
    if (status === "cancelled") {
      continue;
    }
    issuedInvoices.push({ record: inv, summary, amount: resolved });
    issuedByStatus[status] = (issuedByStatus[status] ?? 0) + 1;

    if (status === "paid") {
      paidInvoices.push({ record: inv, summary, amount: resolved });
    } else if (isInvoiceOverdue(inv, asOfDate)) {
      overdueInvoices.push({ record: inv, summary, amount: resolved });
    } else {
      onTimeOpenInvoices.push({ record: inv, summary, amount: resolved });
    }
  }

  const outstandingEntries = [...overdueInvoices, ...onTimeOpenInvoices];

  const quoteDrafts = quotesPage.data
    .filter((q) => {
      const st = (q.status ?? "draft").toLowerCase();
      return st === "draft" || st === "sent";
    })
    .map((q) => {
      const resolved = resolveDocumentAmount(q, currency);
      const summary: BriefDocumentSummary = {
        id: String(q.id ?? ""),
        documentNumber: q.quoteNumber ?? q.documentNumber ?? null,
        status: (q.status ?? "draft").toLowerCase(),
        counterpartyName: q.clientName || "Cliente sin nombre",
        issueDate: typeof q.issueDate === "string" ? q.issueDate : null,
        dueDate:
          typeof q.validUntil === "string"
            ? q.validUntil
            : typeof q.dueDate === "string"
              ? q.dueDate
              : null,
        amount: resolved,
      };
      return { record: q, summary, amount: resolved };
    });

  const expenseAmounts = expensesPage.data.map((e) =>
    resolveDocumentAmount(e, currency),
  );
  const deductibleExpenses = expensesPage.data.filter(
    (e) => e.taxDeductible === true,
  );
  const nonDeductibleExpenses = expensesPage.data.filter(
    (e) => e.taxDeductible === false,
  );
  const incompleteExpenses = expensesPage.data.filter((e) => {
    const missingVendor = typeof e.vendor !== "string" || !e.vendor.trim();
    const missingCategory =
      typeof e.category !== "string" || !e.category.trim();
    const resolvedAmt = resolveDocumentAmount(e, currency);
    const invalidAmount =
      resolvedAmt.amount === null || resolvedAmt.amount <= 0;
    return missingVendor || missingCategory || invalidAmount;
  });

  // Current month (`periodMonth`) subset explicitly filtered by document date prefix
  const issuedInvoicesInMonth = issuedInvoices.filter(
    (entry) =>
      typeof entry.record.issueDate === "string" &&
      entry.record.issueDate.startsWith(periodMonth),
  );
  const invoiceDraftsInMonth = draftInvoices.filter(
    (entry) =>
      typeof entry.record.issueDate === "string" &&
      entry.record.issueDate.startsWith(periodMonth),
  );
  const expensesInMonth = expensesPage.data.filter(
    (exp) => typeof exp.date === "string" && exp.date.startsWith(periodMonth),
  );

  const invoiceDraftsTotal = sumProvenancedAmounts(
    draftInvoices.map((d) => d.amount),
    currency,
  );
  const quoteDraftsTotal = sumProvenancedAmounts(
    quoteDrafts.map((q) => q.amount),
    currency,
  );
  const issuedInvoicesTotal = sumProvenancedAmounts(
    issuedInvoices.map((i) => i.amount),
    currency,
  );
  const paidInvoicesTotal = sumProvenancedAmounts(
    paidInvoices.map((p) => p.amount),
    currency,
  );
  const unpaidNominalTotal = sumProvenancedAmounts(
    outstandingEntries.map((x) => x.amount),
    currency,
  );
  const overdueNominalTotal = sumProvenancedAmounts(
    overdueInvoices.map((o) => o.amount),
    currency,
  );
  const onTimeNominalPendingTotal = sumProvenancedAmounts(
    onTimeOpenInvoices.map((o) => o.amount),
    currency,
  );

  const expensesTotal = sumProvenancedAmounts(expenseAmounts, currency);
  const deductibleTotal = sumProvenancedAmounts(
    deductibleExpenses.map((e) => resolveDocumentAmount(e, currency)),
    currency,
  );
  const nonDeductibleTotal = sumProvenancedAmounts(
    nonDeductibleExpenses.map((e) => resolveDocumentAmount(e, currency)),
    currency,
  );

  const issuedInvoicesInMonthTotal = sumProvenancedAmounts(
    issuedInvoicesInMonth.map((d) => d.amount),
    currency,
  );
  const invoiceDraftsInMonthTotal = sumProvenancedAmounts(
    invoiceDraftsInMonth.map((d) => d.amount),
    currency,
  );
  const expensesInMonthTotal = sumProvenancedAmounts(
    expensesInMonth.map((e) => resolveDocumentAmount(e, currency)),
    currency,
  );

  const currentMonthActivity: CurrentMonthActivitySummary = {
    referenceMonth: periodMonth,
    note: `Subconjunto de documentos cuya fecha de emisión (issueDate) o fecha de gasto (date) pertenece explícitamente al mes ${periodMonth}, separado de los registros de meses previos presentes en la muestra operativa.`,
    issuedInvoicesInMonthCount: issuedInvoicesInMonth.length,
    issuedInvoicesInMonthTotal,
    invoiceDraftsInMonthCount: invoiceDraftsInMonth.length,
    invoiceDraftsInMonthTotal,
    expensesInMonthCount: expensesInMonth.length,
    expensesInMonthTotal,
  };

  const financials: FinancialSeparation = {
    currency,
    drafts: {
      invoiceDraftsCount: draftInvoices.length,
      invoiceDraftsTotal,
      quoteDraftsCount: quoteDrafts.length,
      quoteDraftsTotal,
      note: "Drafts reserve a document number but have NOT been issued or sent; they never count as accrued or collected revenue.",
    },
    issuedRevenue: {
      count: issuedInvoices.length,
      total: issuedInvoicesTotal,
      byStatus: issuedByStatus,
      note: "Includes only non-draft, non-cancelled invoices (sent, overdue, paid).",
    },
    recordedPaid: {
      count: paidInvoices.length,
      total: paidInvoicesTotal,
    },
    outstandingBalance: {
      realOutstandingBalanceDeterminable: false,
      unpaidNominalSemantics:
        "nominal_unpaid_invoice_totals_without_partial_payments",
      unpaidNominalInvoicesCount: outstandingEntries.length,
      unpaidNominalTotal,
      unpaidNominalTotalsByCurrency: unpaidNominalTotal.totalsByCurrency ?? {},
      overdueNominalInvoicesCount: overdueInvoices.length,
      overdueNominalTotal,
      onTimeNominalPendingCount: onTimeOpenInvoices.length,
      onTimeNominalPendingTotal,
      totalCount: outstandingEntries.length,
      totalAmount: unpaidNominalTotal,
      overdueCount: overdueInvoices.length,
      overdueAmount: overdueNominalTotal,
      onTimeCount: onTimeOpenInvoices.length,
      onTimeAmount: onTimeNominalPendingTotal,
    },
    expensesSummary: {
      count: expensesPage.data.length,
      total: expensesTotal,
      deductibleCount: deductibleExpenses.length,
      deductibleTotal,
      nonDeductibleCount: nonDeductibleExpenses.length,
      nonDeductibleTotal,
      incompleteMetadataCount: incompleteExpenses.length,
    },
    currentMonthActivity,
  };

  // 3. Prioritized Review Items
  const reviewItems: BriefReviewItem[] = [];

  if (overdueInvoices.length > 0) {
    const overdueSum = financials.outstandingBalance.overdueAmount;
    const labels = overdueInvoices.map(
      ({ record }) => `${getDocumentNumber(record)} (${record.clientName})`,
    );
    reviewItems.push({
      id: "review-overdue-invoices",
      priority: "HIGH",
      category: "overdue_invoice",
      title: `${overdueInvoices.length} Overdue Issued Invoice${overdueInvoices.length === 1 ? "" : "s"}`,
      subtitle: `${formatCurrencyAmount(overdueSum.amount, overdueSum.currency)} (${overdueSum.provenance})`,
      why: `Issued invoice(s) ${labels.join(", ")} are marked overdue or have a dueDate earlier than ${asOfDate} (importe nominal de facturas no marcadas como pagadas; saldo pendiente real no determinable sin cobros parciales).`,
      recordIds: overdueInvoices.map(({ record }) => record.id),
      recordLabels: labels,
      amount: overdueSum,
      deepLink: buildFrihetDeepLink("invoices"),
      suggestedAction:
        "Inspect invoice details in Search Invoices or open in Frihet to record collection or follow up with the client.",
    });
  }

  if (draftInvoices.length > 0) {
    const draftSum = financials.drafts.invoiceDraftsTotal;
    const labels = draftInvoices.map(
      ({ record }) => `${getDocumentNumber(record)} (${record.clientName})`,
    );
    reviewItems.push({
      id: "review-draft-invoices",
      priority: "MEDIUM",
      category: "draft_invoice",
      title: `${draftInvoices.length} Unissued Invoice Draft${draftInvoices.length === 1 ? "" : "s"}`,
      subtitle: `${formatCurrencyAmount(draftSum.amount, draftSum.currency)} (${draftSum.provenance})`,
      why: `Drafts (${labels.join(", ")}) reserve numbering but are not issued or counted in revenue until finalized in Frihet.`,
      recordIds: draftInvoices.map(({ record }) => record.id),
      recordLabels: labels,
      amount: draftSum,
      deepLink: buildFrihetDeepLink("invoices"),
      suggestedAction:
        "Verify line items, tax treatment, and due dates in Frihet before issuing or deleting duplicate drafts.",
    });
  }

  // Check tax rate discrepancy against workspace defaults
  if (typeof defaultTaxRate === "number") {
    const mismatched = invoicesPage.data.filter(
      (inv) =>
        typeof inv.taxRate === "number" &&
        inv.taxRate !== defaultTaxRate &&
        (inv.status ?? "draft").toLowerCase() !== "cancelled",
    );
    if (mismatched.length > 0) {
      const labels = mismatched.map(
        (inv) =>
          `${getDocumentNumber(inv)} (${inv.taxRate}% vs default ${defaultTaxRate}%)`,
      );
      reviewItems.push({
        id: "review-tax-rate-mismatch",
        priority: "MEDIUM",
        category: "tax_discrepancy",
        title: `${mismatched.length} Invoice${mismatched.length === 1 ? "" : "s"} Differ from Workspace Default Tax (${defaultTaxRate}%)`,
        subtitle: labels[0] ?? "",
        why: `Workspace default taxRate is ${defaultTaxRate}%${fiscalZone ? ` (${fiscalZone})` : ""}, while ${labels.join(", ")} use a different rate. Verify whether the client operation is mainland/export or requires adjustment.`,
        recordIds: mismatched.map((inv) => inv.id),
        recordLabels: labels,
        deepLink: buildFrihetDeepLink("invoices"),
        suggestedAction:
          "Confirm the applicable fiscal regime in Frihet before issuing.",
      });
    }
  }

  // Incomplete expenses (missing vendor or category ONLY; taxDeductible=false is NEVER flagged as an error)
  if (incompleteExpenses.length > 0) {
    const incAmounts = incompleteExpenses.map((e) =>
      resolveDocumentAmount(e, currency),
    );
    const incSum = sumProvenancedAmounts(incAmounts, currency);
    const labels = incompleteExpenses.map(
      (e) =>
        `${e.description || e.id} (missing ${!(e.vendor ?? "").trim() ? "vendor" : "category"})`,
    );
    reviewItems.push({
      id: "review-incomplete-expenses",
      priority: "MEDIUM",
      category: "incomplete_expense",
      title: `${incompleteExpenses.length} Expense${incompleteExpenses.length === 1 ? "" : "s"} Missing Vendor or Category`,
      subtitle: `${formatCurrencyAmount(incSum.amount, incSum.currency)} (${incSum.provenance})`,
      why: `Expense record(s) ${labels.join(", ")} lack a linked vendor or category for quarterly bookkeeping. (Note: ${nonDeductibleExpenses.length} non-deductible expense(s) are treated as valid fiscal classifications, not errors.)`,
      recordIds: incompleteExpenses.map((e) => e.id),
      recordLabels: labels,
      amount: incSum,
      deepLink: buildFrihetDeepLink("expenses"),
      suggestedAction:
        "Complete the missing supplier or category metadata in Frihet Expenses.",
    });
  }

  // CRM follow-ups
  const actionableActivities: Array<{
    client: ClientRecord;
    activity: ClientActivityRecord;
  }> = [];
  for (const entry of activitiesPerClient) {
    for (const act of entry.activities) {
      actionableActivities.push({ client: entry.client, activity: act });
    }
  }
  if (actionableActivities.length > 0) {
    const labels = actionableActivities.map(
      ({ client: cli, activity }) =>
        `${cli.name}: ${activity.title ?? activity.description ?? activity.type ?? activity.id}`,
    );
    reviewItems.push({
      id: "review-crm-followup",
      priority: "LOW",
      category: "crm_followup",
      title: `${actionableActivities.length} Recent Client CRM Activit${actionableActivities.length === 1 ? "y" : "ies"}`,
      subtitle: actionableActivities[0]?.client.name ?? "",
      why: `Recent CRM timeline entries recorded: ${labels.join("; ")}.`,
      recordIds: actionableActivities.map(({ activity }) => activity.id),
      recordLabels: labels,
      deepLink: buildFrihetDeepLink("clients"),
      suggestedAction:
        "Inspect client history in Search Clients or open Frihet CRM.",
    });
  }

  // Plan quota usage check (>= 80%)
  const invUsage = context.plan?.invoices ?? context.plan?.usage?.invoices;
  const expUsage = context.plan?.expenses ?? context.plan?.usage?.expenses;
  const quotaWarnings: string[] = [];
  if (
    invUsage &&
    typeof invUsage.used === "number" &&
    typeof invUsage.limit === "number" &&
    invUsage.limit > 0 &&
    invUsage.used / invUsage.limit >= 0.8
  ) {
    quotaWarnings.push(
      `Invoices ${invUsage.used}/${invUsage.limit} (${Math.round((invUsage.used / invUsage.limit) * 100)}%)`,
    );
  }
  if (
    expUsage &&
    typeof expUsage.used === "number" &&
    typeof expUsage.limit === "number" &&
    expUsage.limit > 0 &&
    expUsage.used / expUsage.limit >= 0.8
  ) {
    quotaWarnings.push(
      `Expenses ${expUsage.used}/${expUsage.limit} (${Math.round((expUsage.used / expUsage.limit) * 100)}%)`,
    );
  }
  if (quotaWarnings.length > 0) {
    reviewItems.push({
      id: "review-plan-quota",
      priority: "LOW",
      category: "plan_quota",
      title: `Plan Quota Reaching Monthly Limit (${planTier})`,
      subtitle: quotaWarnings.join(" · "),
      why: `Monthly plan usage is at or above 80%: ${quotaWarnings.join(", ")}.`,
      recordIds: [`plan:${planTier}`],
      recordLabels: quotaWarnings,
      deepLink: buildFrihetDeepLink("dashboard"),
      suggestedAction: "Review monthly usage in Frihet Settings.",
    });
  }

  // 4. Blind Spots / Known Unknowns (Honest disclosure)
  const blindSpots: string[] = [];
  const knownUnknowns: string[] = [
    "Saldo bancario real y posición de tesorería: las herramientas de banca y conciliación bancaria no forman parte de esta consulta y la existencia de facturas no implica cobro efectivo en banco.",
    "Saldos pendientes reales o cobros parciales: solo se observan los importes nominales íntegros y los estados de cada documento (p. ej. 'draft', 'sent', 'overdue', 'paid'), por lo que el importe de facturas no pagadas es un nominal bruto y no un saldo vivo conciliado.",
  ];
  if (isPartial) {
    const partialLabels = Object.values(coverage.resources)
      .filter((r) => !r.complete)
      .map(
        (r) =>
          `${r.collection} (${r.inspected}/${r.total} vía ${r.sourceTool})`,
      );
    knownUnknowns.unshift(
      `Cobertura parcial del espacio de trabajo: solo se ha inspeccionado una página en ${partialLabels.join(", ")}. Los importes agregados reflejan únicamente los registros leídos en esta muestra y no el total histórico del negocio.`,
    );
    blindSpots.push(
      `Partial workspace sample: inspected ${invoicesCov.inspected}/${invoicesCov.total} invoices, ${quotesCov.inspected}/${quotesCov.total} quotes, ${expensesCov.inspected}/${expensesCov.total} expenses, and ${crmCov.inspected}/${crmCov.total} client activity timelines. Figures reflect the inspected sample, not the full historical ledger.`,
    );
  }
  blindSpots.push(
    "Real bank account balances and reconciled treasury cashflow are not inferred from invoice/expense summaries.",
  );
  blindSpots.push(
    "Importe nominal de facturas no marcadas como pagadas (saldo pendiente real no determinable sin cobros parciales): only full nominal document totals and statuses ('draft', 'sent', 'overdue', 'paid') are observed.",
  );
  blindSpots.push(
    "Internal invoice status ('draft', 'sent', 'paid') reflects workspace records only and does not attest external AEAT VeriFactu, TicketBAI, or Peppol transmission receipts.",
  );

  const markdownLines: string[] = [
    `# Brief Operativo Diario — ${workspaceName} (Corte operativo a ${asOfDate} · Muestra abierta/reciente sin filtro mensual)`,
    "",
    `## 1. Cobertura y Alcance Temporal (${isPartial ? "COBERTURA PARCIAL" : "COBERTURA COMPLETA"})`,
    `- **Alcance temporal de la consulta**: muestra operativa a fecha \`${asOfDate}\` sobre los registros abiertos/recientes devueltos por \`list_invoices\`, \`list_quotes\` y \`list_expenses\` (incluye documentos de meses previos, como vencimientos pendientes, para no ocultar riesgos operativos). El subconjunto emitido/registrado en el mes \`${periodMonth}\` se desglosa aparte.`,
    `- **Facturas** (\`list_invoices\`): ${invoicesCov.inspected}/${invoicesCov.total} (${invoicesCov.complete ? "completo" : "parcial"})`,
    `- **Presupuestos** (\`list_quotes\`): ${quotesCov.inspected}/${quotesCov.total} (${quotesCov.complete ? "completo" : "parcial"})`,
    `- **Gastos** (\`list_expenses\`): ${expensesCov.inspected}/${expensesCov.total} (${expensesCov.complete ? "completo" : "parcial"})`,
    `- **Clientes** (\`list_clients\`): ${clientsCov.inspected}/${clientsCov.total} (${clientsCov.complete ? "completo" : "parcial"})`,
    `- **Actividades CRM** (\`list_client_activities\`): ${crmCov.inspected}/${crmCov.total} clientes inspeccionados (${crmCov.complete ? "completo" : "parcial"})`,
    "",
    "## 2. Separación entre Borrador, Facturación Emitida, Cobro Registrado e Importe Nominal No Pagado",
    `- **Borradores de factura (NO emitidos / NO computan como ingreso ni saldo por cobrar)**: ${draftInvoices.length} documento(s) por **${formatProvenancedAmount(invoiceDraftsTotal)}** (procedencia: \`${invoiceDraftsTotal.provenance}\` — ${invoiceDraftsTotal.fieldOrFormula}).`,
    `- **Presupuestos en borrador/enviados**: ${quoteDrafts.length} documento(s) por **${formatProvenancedAmount(quoteDraftsTotal)}** (procedencia: \`${quoteDraftsTotal.provenance}\`).`,
    `- **Facturación emitida en la muestra operativa (no borrador, incluye meses previos si siguen en la muestra)**: ${issuedInvoices.length} documento(s) por **${formatProvenancedAmount(issuedInvoicesTotal)}** (procedencia: \`${issuedInvoicesTotal.provenance}\` — ${issuedInvoicesTotal.fieldOrFormula}):`,
    `  - **Cobro registrado en ERP (\`paid\`)**: ${paidInvoices.length} documento(s) por **${formatProvenancedAmount(paidInvoicesTotal)}**.`,
    `  - **Importe nominal de facturas no marcadas como pagadas (saldo pendiente real no determinable sin cobros parciales)**: ${outstandingEntries.length} documento(s) por **${formatProvenancedAmount(unpaidNominalTotal)}** (${overdueInvoices.length} vencida(s) por **${formatProvenancedAmount(overdueNominalTotal)}**; ${onTimeOpenInvoices.length} en plazo por **${formatProvenancedAmount(onTimeNominalPendingTotal)}**).`,
    `- **Gastos registrados en la muestra operativa**: ${expensesPage.data.length} registro(s) por **${formatProvenancedAmount(expensesTotal)}** (${deductibleExpenses.length} deducible(s) por ${formatProvenancedAmount(deductibleTotal)}; ${nonDeductibleExpenses.length} no deducible(s) por ${formatProvenancedAmount(nonDeductibleTotal)}; ${incompleteExpenses.length} con datos incompletos pendientes de revisión).`,
    `- **Subconjunto acotado al mes ${periodMonth} (filtrado por fecha del documento)**: ${issuedInvoicesInMonth.length} factura(s) emitida(s) por **${formatProvenancedAmount(issuedInvoicesInMonthTotal)}**, ${invoiceDraftsInMonth.length} borrador(es) de factura por **${formatProvenancedAmount(invoiceDraftsInMonthTotal)}** y ${expensesInMonth.length} gasto(s) por **${formatProvenancedAmount(expensesInMonthTotal)}**.`,
    "",
    "## 3. Qué Deberías Revisar Hoy y Por Qué (Priorizado)",
    ...(reviewItems.length > 0
      ? reviewItems.map(
          (item, idx) =>
            `${idx + 1}. **[${item.priority}] ${item.title}** — ${item.why}`,
        )
      : [
          "- No se han detectado incidencias prioritarias en los registros inspeccionados.",
        ]),
    "",
    "## 4. Lo Que No Puedo Determinar con Estos Datos",
    ...knownUnknowns.map((u) => `- ${u}`),
  ];

  return {
    question: "¿Qué debería revisar hoy en mi negocio y por qué?",
    workspaceName,
    currency,
    defaultTaxRate,
    fiscalZone,
    planTier,
    coverage,
    financials,
    activitySeparation: {
      draftActivity: {
        note: "Los borradores reservan numeración pero no han sido emitidos ni enviados al cliente; no representan ingresos devengados ni cobrados.",
        invoiceDraftsCount: draftInvoices.length,
        invoiceDraftsTotal,
        invoiceDrafts: draftInvoices.map((d) => d.summary),
        quoteDraftsCount: quoteDrafts.length,
        quoteDraftsTotal,
        quoteDrafts: quoteDrafts.map((q) => q.summary),
      },
      issuedActivity: {
        note: "Incluye únicamente facturas emitidas (estado distinto de 'draft' y 'cancelled'), separando cobro registrado ('paid') del importe nominal de facturas no marcadas como pagadas ('overdue' vs en plazo). El saldo pendiente real no es determinable sin desglose de cobros parciales ni conciliación bancaria.",
        realOutstandingBalanceDeterminable: false,
        unpaidNominalSemantics:
          "nominal_unpaid_invoice_totals_without_partial_payments",
        issuedInvoicesCount: issuedInvoices.length,
        issuedInvoicesByStatus: issuedByStatus,
        issuedInvoicesTotal,
        issuedInvoices: issuedInvoices.map((i) => i.summary),
        paidInvoicesCount: paidInvoices.length,
        paidInvoicesTotal,
        paidInvoices: paidInvoices.map((p) => p.summary),
        unpaidNominalInvoicesCount: outstandingEntries.length,
        unpaidNominalTotal,
        unpaidNominalTotalsByCurrency:
          unpaidNominalTotal.totalsByCurrency ?? {},
        overdueNominalInvoicesCount: overdueInvoices.length,
        overdueNominalTotal,
        onTimeNominalPendingCount: onTimeOpenInvoices.length,
        onTimeNominalPendingTotal,
        outstandingInvoicesCount: outstandingEntries.length,
        outstandingInvoicesTotal: unpaidNominalTotal,
        overdueInvoicesCount: overdueInvoices.length,
        overdueInvoicesTotal: overdueNominalTotal,
        onTimePendingCount: onTimeOpenInvoices.length,
        onTimePendingTotal: onTimeNominalPendingTotal,
        outstandingInvoices: outstandingEntries.map((x) => x.summary),
      },
      recordedExpenses: {
        note: "Los gastos con taxDeductible=false y proveedor/categoría completos se desglosan como no deducibles sin tratarse como error; solo se marcan para revisión los registros con proveedor, categoría o importe inválido.",
        expensesCount: expensesPage.data.length,
        expensesTotal,
        deductibleCount: deductibleExpenses.length,
        deductibleTotal,
        nonDeductibleCount: nonDeductibleExpenses.length,
        nonDeductibleTotal,
        pendingReviewCount: incompleteExpenses.length,
      },
      currentMonthActivity,
    },
    reviewItems,
    blindSpots,
    knownUnknowns,
    mutationsExecuted: 0,
    markdown: markdownLines.join("\n"),
  };
}

export { generateOperationalBusinessBrief as generateBusinessBrief };
