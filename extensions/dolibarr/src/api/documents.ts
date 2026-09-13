import type { Client } from "./client";
import {
  MODULE_PART,
  toInvoice,
  toOrder,
  toProposal,
  type DocumentKind,
  type DocumentSummary,
  type RawDocument,
} from "./types";

const SUMMARY_PROPERTIES =
  "id,ref,socid,status,total_ht,total_ttc,date,date_lim_reglement,fin_validite,billed," +
  "fk_multicurrency,multicurrency_code,multicurrency_total_ht,multicurrency_total_ttc";

const ENDPOINT: Record<DocumentKind, string> = {
  proposal: "/proposals",
  invoice: "/invoices",
  order: "/orders",
};

export type DocumentLine = {
  label: string;
  qty: number;
  unitPrice: number;
  total: number;
  vatRate: number;
};

export type DocumentDetailData = {
  ref: string;
  refClient: string | null;
  date: Date | null;
  totalHt: number;
  totalTva: number;
  totalTtc: number;
  currency: string;
  lines: DocumentLine[];
};

function assertId(id: number): number {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid Dolibarr ID: ${id}`);
  }
  return id;
}

function byDateDesc(a: DocumentSummary, b: DocumentSummary): number {
  return (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0);
}

async function fetchSummaries(client: Client, kind: DocumentKind, thirdpartyId: number): Promise<RawDocument[]> {
  assertId(thirdpartyId);
  return client.list<RawDocument>(ENDPOINT[kind], {
    thirdparty_ids: thirdpartyId,
    properties: SUMMARY_PROPERTIES,
    limit: 200,
  });
}

export async function fetchProposals(client: Client, thirdpartyId: number): Promise<DocumentSummary[]> {
  const rows = await fetchSummaries(client, "proposal", thirdpartyId);
  return rows.map((row) => toProposal(row)).sort(byDateDesc);
}

export async function fetchInvoices(client: Client, thirdpartyId: number): Promise<DocumentSummary[]> {
  const rows = await fetchSummaries(client, "invoice", thirdpartyId);
  return rows.map((row) => toInvoice(row)).sort(byDateDesc);
}

export async function fetchOrders(client: Client, thirdpartyId: number): Promise<DocumentSummary[]> {
  const rows = await fetchSummaries(client, "order", thirdpartyId);
  return rows.map((row) => toOrder(row)).sort(byDateDesc);
}

/** Verified against the instance: each kind sorts by its own date column. */
const SORT_FIELD: Record<DocumentKind, string> = {
  proposal: "t.datep",
  order: "t.date_commande",
  invoice: "t.datef",
};

const CONVERTER: Record<DocumentKind, (raw: RawDocument) => DocumentSummary> = {
  proposal: (raw) => toProposal(raw),
  order: (raw) => toOrder(raw),
  invoice: (raw) => toInvoice(raw),
};

const BULK_LIMIT = 500;

export async function fetchRecentDocuments(
  client: Client,
  kind: DocumentKind,
  limit: number,
): Promise<DocumentSummary[]> {
  const rows = await client.list<RawDocument>(ENDPOINT[kind], {
    properties: SUMMARY_PROPERTIES,
    sortfield: SORT_FIELD[kind],
    sortorder: "DESC",
    limit,
  });
  return rows.map(CONVERTER[kind]);
}

/** Full set, because expiry has no server-side filter — 70 records at the time of writing. */
export async function fetchAllProposals(client: Client): Promise<DocumentSummary[]> {
  const rows = await client.list<RawDocument>("/proposals", { properties: SUMMARY_PROPERTIES, limit: BULK_LIMIT });
  return rows.map((row) => toProposal(row));
}

/** Full set, because the billed flag has no server-side filter — 19 records at the time of writing. */
export async function fetchAllOrders(client: Client): Promise<DocumentSummary[]> {
  const rows = await client.list<RawDocument>("/orders", { properties: SUMMARY_PROPERTIES, limit: BULK_LIMIT });
  return rows.map((row) => toOrder(row));
}

/**
 * All invoices Dolibarr considers unpaid, in one request. The endpoint's own status filter avoids
 * pulling the full invoice history and needs no sqlfilters.
 */
export async function fetchUnpaidInvoices(client: Client): Promise<DocumentSummary[]> {
  const rows = await client.list<RawDocument>("/invoices", {
    status: "unpaid",
    properties: SUMMARY_PROPERTIES,
    limit: 500,
  });
  return rows.map((row) => toInvoice(row)).sort(byDateDesc);
}

type RawDownload = {
  content?: unknown;
  encoding?: unknown;
  filename?: unknown;
};

/**
 * Fetches the generated PDF through the API rather than document.php: the latter needs a browser
 * session, while this endpoint accepts the API key. Dolibarr returns the file base64-encoded.
 *
 * Throws when no PDF has been generated yet — common for drafts.
 */
export async function downloadDocumentPdf(client: Client, kind: DocumentKind, ref: string): Promise<Buffer> {
  const raw = await client.one<RawDownload>("/documents/download", {
    modulepart: MODULE_PART[kind],
    original_file: `${ref}/${ref}.pdf`,
  });

  if (typeof raw.content !== "string" || raw.content.length === 0) {
    throw new Error(`No PDF available for ${ref}.`);
  }
  if (raw.encoding !== "base64") {
    throw new Error(`Unexpected encoding for ${ref}: ${String(raw.encoding)}`);
  }
  return Buffer.from(raw.content, "base64");
}

function num(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function fetchDocumentLines(client: Client, kind: DocumentKind, id: number): Promise<DocumentDetailData> {
  assertId(id);
  const raw = await client.one<RawDocument>(`${ENDPOINT[kind]}/${id}`);
  const rawLines = Array.isArray(raw.lines) ? (raw.lines as Record<string, unknown>[]) : [];
  const dateSeconds = num(raw.date);
  return {
    ref: text(raw.ref) ?? "(no reference)",
    refClient: text(raw.ref_client),
    date: dateSeconds > 0 ? new Date(dateSeconds * 1000) : null,
    totalHt: num(raw.total_ht),
    totalTva: num(raw.total_tva),
    totalTtc: num(raw.total_ttc),
    currency: text(raw.multicurrency_code) ?? "EUR",
    lines: rawLines.map((line) => ({
      label: text(line.product_label) ?? text(line.desc) ?? text(line.libelle) ?? "(no description)",
      qty: num(line.qty),
      unitPrice: num(line.subprice),
      total: num(line.total_ht),
      vatRate: num(line.tva_tx),
    })),
  };
}
