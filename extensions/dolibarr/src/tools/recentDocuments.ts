import { type DocumentSummary, type Thirdparty } from "../api/types";
import { documentUrl, thirdpartyUrl } from "../api/urls";

export type RecentDocument = {
  kind: string;
  ref: string;
  /** Dolibarr status 0. Drafts carry provisional references like "(PROV22)". */
  isDraft: boolean;
  date: string | null;
  status: string;
  companyId: number;
  companyName: string | null;
  companyUrl: string;
  totalTtc: number;
  currency: string;
  url: string;
};

const DRAFT_STATUS = 0;

export function buildRecentDocuments(
  documents: DocumentSummary[],
  companies: Thirdparty[],
  web: string,
  limit: number,
): { count: number; documents: RecentDocument[] } {
  const companyById = new Map(companies.map((company) => [company.id, company]));

  const merged = documents
    .map((document) => ({
      kind: document.kind,
      ref: document.ref,
      isDraft: document.statusCode === DRAFT_STATUS,
      date: document.date === null ? null : document.date.toISOString().slice(0, 10),
      status: document.status.label,
      companyId: document.thirdpartyId,
      companyName: companyById.get(document.thirdpartyId)?.name ?? null,
      companyUrl: thirdpartyUrl(web, document.thirdpartyId),
      totalTtc: document.totalTtc,
      currency: document.currency,
      url: documentUrl(web, document.kind, document.id),
    }))
    // Undated documents sort to the end rather than to 1970, which would look like the oldest.
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    // The limit applies after merging: capping per kind would show an old order next to newer
    // invoices just because it is the only one of its type.
    .slice(0, limit);

  return { count: merged.length, documents: merged };
}
