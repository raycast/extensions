import { daysOverdue, type DocumentSummary, type Thirdparty } from "../api/types";
import { documentUrl, thirdpartyUrl } from "../api/urls";

export type OpenItem = {
  ref: string;
  companyId: number;
  companyName: string | null;
  companyUrl: string;
  totalTtc: number;
  currency: string;
  date: string | null;
  url: string;
  daysOverdue?: number;
  validUntil?: string | null;
};

export type OpenItems = {
  summary: {
    overdueInvoiceCount: number;
    overdueInvoiceTotal: number;
    expiredProposalCount: number;
    expiredProposalTotal: number;
    unbilledOrderCount: number;
    unbilledOrderTotal: number;
    /** null when more than one currency is involved — a single total would be meaningless. */
    currency: string | null;
  };
  overdueInvoices: OpenItem[];
  expiredProposals: OpenItem[];
  unbilledOrders: OpenItem[];
};

function isoDate(value: Date | null): string | null {
  return value === null ? null : value.toISOString().slice(0, 10);
}

function sum(items: OpenItem[]): number {
  return items.reduce((running, item) => running + item.totalTtc, 0);
}

export function buildOpenItems(input: {
  invoices: DocumentSummary[];
  proposals: DocumentSummary[];
  orders: DocumentSummary[];
  companies: Thirdparty[];
  web: string;
  today?: Date;
}): OpenItems {
  const today = input.today ?? new Date();
  const companyById = new Map(input.companies.map((company) => [company.id, company]));

  /**
   * A document whose company is missing from the index is still reported — hiding an open item
   * because a name is unknown would be the worse failure.
   */
  const toItem = (document: DocumentSummary): OpenItem => ({
    ref: document.ref,
    companyId: document.thirdpartyId,
    companyName: companyById.get(document.thirdpartyId)?.name ?? null,
    companyUrl: thirdpartyUrl(input.web, document.thirdpartyId),
    totalTtc: document.totalTtc,
    currency: document.currency,
    date: isoDate(document.date),
    url: documentUrl(input.web, document.kind, document.id),
  });

  // Filtering goes through the flags the converters already derived, not through fresh date
  // arithmetic — two places computing the same rule would eventually disagree.
  const overdueInvoices = input.invoices
    .filter((invoice) => invoice.isOverdue)
    .map((invoice) => ({ ...toItem(invoice), daysOverdue: daysOverdue(invoice.dueDate, today) }))
    .sort((a, b) => (b.daysOverdue as number) - (a.daysOverdue as number));

  const expiredProposals = input.proposals
    .filter((proposal) => proposal.isExpired)
    .map((proposal) => ({ ...toItem(proposal), validUntil: isoDate(proposal.validUntil) }))
    // Oldest first: the longer a proposal has been dead, the more overdue the follow-up.
    .sort((a, b) => (a.validUntil ?? "").localeCompare(b.validUntil ?? ""));

  const unbilledOrders = input.orders
    .filter((order) => order.isUnbilled)
    .map(toItem)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  const currencies = new Set([...overdueInvoices, ...expiredProposals, ...unbilledOrders].map((i) => i.currency));

  return {
    summary: {
      overdueInvoiceCount: overdueInvoices.length,
      overdueInvoiceTotal: sum(overdueInvoices),
      expiredProposalCount: expiredProposals.length,
      expiredProposalTotal: sum(expiredProposals),
      unbilledOrderCount: unbilledOrders.length,
      unbilledOrderTotal: sum(unbilledOrders),
      currency: currencies.size === 1 ? [...currencies][0] : null,
    },
    overdueInvoices,
    expiredProposals,
    unbilledOrders,
  };
}
