import { fetchInvoices, fetchOrders, fetchProposals } from "../api/documents";
import { STATUS_OPEN, type DocumentSummary, type Relation, type Thirdparty } from "../api/types";
import { documentUrl, thirdpartyUrl } from "../api/urls";
import { resolveCompany } from "./resolveCompany";
import { getToolContext } from "./toolContext";

const MAX_DOCUMENTS = 15;

type Input = {
  /** Company name, alias, customer code or email address. */
  query: string;
};

type DocumentEntry = {
  ref: string;
  kind: string;
  date: string | null;
  validUntil?: string | null;
  expired?: boolean;
  overdue?: boolean;
  unbilled?: boolean;
  totalHt: number;
  totalTtc: number;
  currency: string;
  status: string;
  overdue?: boolean;
  url: string;
};

type Candidate = { id: number; name: string; relation: Relation; url: string };

function isoDate(value: Date | null): string | null {
  return value === null ? null : value.toISOString().slice(0, 10);
}

function toEntry(document: DocumentSummary, web: string): DocumentEntry {
  return {
    ref: document.ref,
    date: isoDate(document.date),
    totalHt: document.totalHt,
    totalTtc: document.totalTtc,
    currency: document.currency,
    status: document.status.label,
    kind: document.kind,
    ...(document.kind === "invoice" ? { overdue: document.isOverdue } : {}),
    ...(document.kind === "proposal" ? { validUntil: isoDate(document.validUntil), expired: document.isExpired } : {}),
    ...(document.kind === "order" ? { unbilled: document.isUnbilled } : {}),
    url: documentUrl(web, document.kind, document.id),
  };
}

function sum(documents: DocumentSummary[]): number {
  return documents.reduce((total, document) => total + document.totalTtc, 0);
}

/**
 * The single currency all given documents share, or null when they differ. Summing across
 * currencies would produce a meaningless figure, and the model must be able to tell.
 */
function commonCurrency(documents: DocumentSummary[]): string | null {
  const currencies = new Set(documents.map((document) => document.currency));
  return currencies.size === 1 ? [...currencies][0] : null;
}

function toCandidate(company: Thirdparty, web: string): Candidate {
  return { id: company.id, name: company.name, relation: company.relation, url: thirdpartyUrl(web, company.id) };
}

export default async function tool(input: Input) {
  const { client, index, web } = await getToolContext();
  const resolution = resolveCompany(index.thirdparties, input.query);

  if (resolution.kind === "none") {
    return { found: false as const, query: input.query };
  }
  if (resolution.kind === "many") {
    return {
      found: false as const,
      query: input.query,
      ambiguous: resolution.candidates.map((candidate) => toCandidate(candidate, web)),
    };
  }

  const company = resolution.company;
  const [proposals, orders, invoices] = await Promise.all([
    fetchProposals(client, company.id),
    fetchOrders(client, company.id),
    fetchInvoices(client, company.id),
  ]);

  const openInvoices = invoices.filter((invoice) => invoice.statusCode === STATUS_OPEN);
  const overdueInvoices = invoices.filter((invoice) => invoice.isOverdue);
  const openProposals = proposals.filter((proposal) => proposal.statusCode === STATUS_OPEN);
  const expiredProposals = proposals.filter((proposal) => proposal.isExpired);
  const openOrders = orders.filter((order) => order.statusCode === STATUS_OPEN || order.statusCode === 2);
  const unbilledOrders = orders.filter((order) => order.isUnbilled);

  // Unbilled orders are always listed in full: showing only the newest would contradict the totals.
  const otherOrders = orders.filter((order) => !order.isUnbilled);
  const shownOrders = [...unbilledOrders, ...otherOrders.slice(0, MAX_DOCUMENTS)];

  // Open invoices are always listed in full: showing only the newest ones would contradict the
  // totals below and invite the model to claim a smaller debt than there is.
  const settledInvoices = invoices.filter((invoice) => invoice.statusCode !== STATUS_OPEN);
  const shownInvoices = [...openInvoices, ...settledInvoices.slice(0, MAX_DOCUMENTS)];

  return {
    found: true as const,
    company: {
      id: company.id,
      name: company.name,
      nameAlias: company.nameAlias,
      email: company.email,
      phone: company.phone,
      customerCode: company.customerCode,
      relation: company.relation,
      url: thirdpartyUrl(web, company.id),
    },
    summary: {
      currency: commonCurrency([...invoices, ...proposals, ...orders]),
      openInvoiceCount: openInvoices.length,
      openInvoiceTotal: sum(openInvoices),
      overdueInvoiceCount: overdueInvoices.length,
      overdueInvoiceTotal: sum(overdueInvoices),
      openProposalCount: openProposals.length,
      openProposalTotal: sum(openProposals),
      expiredProposalCount: expiredProposals.length,
      expiredProposalTotal: sum(expiredProposals),
      openOrderCount: openOrders.length,
      openOrderTotal: sum(openOrders),
      unbilledOrderCount: unbilledOrders.length,
      unbilledOrderTotal: sum(unbilledOrders),
    },
    proposals: proposals.slice(0, MAX_DOCUMENTS).map((proposal) => toEntry(proposal, web)),
    orders: shownOrders.map((order) => toEntry(order, web)),
    invoices: shownInvoices.map((invoice) => toEntry(invoice, web)),
    truncated:
      proposals.length > MAX_DOCUMENTS || settledInvoices.length > MAX_DOCUMENTS || otherOrders.length > MAX_DOCUMENTS,
  };
}
