import { getPreferenceValues } from "@raycast/api";

/**
 * Single, typed gateway to the Onesto API (https://api.onesto.it).
 *
 * Security rules (do not weaken):
 *  - HTTPS only, fixed base URL — never configurable.
 *  - The API key comes exclusively from Raycast's encrypted `password`
 *    preference and is only ever placed in the Authorization header.
 *    It must NEVER be logged, cached, copied or included in error messages.
 *  - No third-party dependencies: plain `fetch` (Node runtime).
 */

const BASE_URL = "https://api.onesto.it";
export const APP_URL = "https://app.onesto.it";
export const INTEGRATIONS_URL = `${APP_URL}/company/integrations`;

interface Preferences {
  apiKey: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Extracts a human message from the three error shapes Onesto can return. */
function parseErrorBody(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  // {success:false, errors:[{message}]}
  if (Array.isArray(b.errors)) {
    const first = b.errors[0] as Record<string, unknown> | undefined;
    if (first && typeof first.message === "string") return first.message;
  }
  // {error:{code,message}} (v1)
  if (b.error && typeof b.error === "object") {
    const msg = (b.error as Record<string, unknown>).message;
    if (typeof msg === "string") return msg;
  }
  // Laravel validation: {message, errors:{field:[...]}}
  if (typeof b.message === "string" && b.message !== "") return b.message;

  return null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { apiKey } = getPreferenceValues<Preferences>();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    signal: AbortSignal.timeout(20_000),
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // non-JSON body (e.g. HTML error page) → handled below via status
  }

  if (res.status === 401) {
    throw new ApiError("Invalid or expired API key. Generate a new one in Onesto → Integrazioni.", 401);
  }
  if (res.status === 403) {
    throw new ApiError(
      parseErrorBody(body) ?? "This API key is not allowed to perform this action (missing scope).",
      403,
    );
  }
  if (res.status === 429) {
    throw new ApiError("Rate limit reached. Please retry in a minute.", 429);
  }
  if (!res.ok) {
    throw new ApiError(parseErrorBody(body) ?? `Onesto API error (HTTP ${res.status}).`, res.status);
  }

  return body as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types (mirror of the documented API — https://docs.onesto.it)
// ─────────────────────────────────────────────────────────────────────────────

export type PaymentStatus = "paid" | "partial" | "unpaid";

export interface V1Invoice {
  id: string;
  account_id: string;
  direction: "outbound" | "inbound";
  number: string | null;
  issue_date: string | null;
  document_type: string | null;
  counterpart: { name: string | null; vat_number: string | null };
  total_amount: number;
  payment_status: PaymentStatus | null;
  amount_paid: number;
  amount_due: number | null;
  due_date: string | null;
  overdue: boolean;
  sdi_status: string;
  native_sdi_status: string | null;
  sdi_error: { code: string | null; message: string | null } | null;
  last_sdi_update: string | null;
  uuid?: string | null;
  pdf_url?: string | null;
  url: string;
}

export interface TaxDeadline {
  id: string;
  account_id: string;
  type: string;
  title: string;
  due_date: string | null;
  amount: number;
  currency: string;
  status: "upcoming" | "due_today" | "overdue" | "done";
  related_resource: { type: string; id: string } | null;
  file_url: string | null;
  url: string;
  updated_at: string | null;
}

export interface ClientRecord {
  id: number;
  name: string;
  piva: string | null;
  codice_fiscale: string | null;
  sdi: string | null;
  pec: string | null;
  address: string | null;
  cap: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  created_at: string | null;
}

export interface Numbering {
  id: number;
  name: string;
  type: string | null;
  default_payment_method: string | null;
}

export interface PaymentMethodRecord {
  id: number;
  name: string;
  type: string | null;
  iban: string | null;
  sdi_code: string | null;
}

interface V1Meta {
  page: number;
  per_page: number;
  total: number;
  next_page: number | null;
}

interface V1ListResponse<T> {
  data: T[];
  meta: V1Meta;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reads
// ─────────────────────────────────────────────────────────────────────────────

/** Fetches up to `maxPages` pages of a /v1 list endpoint (100 items per page). */
async function fetchV1Pages<T>(
  path: string,
  params: URLSearchParams,
  maxPages = 3,
): Promise<{ items: T[]; total: number }> {
  const items: T[] = [];
  let page = 1;
  let total = 0;

  for (let i = 0; i < maxPages; i++) {
    params.set("page", String(page));
    params.set("per_page", "100");
    const res = await request<V1ListResponse<T>>(`${path}?${params.toString()}`);
    items.push(...res.data);
    total = res.meta.total;
    if (!res.meta.next_page) break;
    page = res.meta.next_page;
  }

  return { items, total };
}

export async function getUnpaidInvoices(): Promise<{ items: V1Invoice[]; total: number }> {
  const params = new URLSearchParams({ direction: "outbound", payment_status: "unpaid,partial" });
  return fetchV1Pages<V1Invoice>("/v1/invoices", params);
}

export async function getSdiIssues(): Promise<{ items: V1Invoice[]; total: number }> {
  const params = new URLSearchParams({ direction: "outbound", sdi_status: "rejected,error,failed_delivery" });
  return fetchV1Pages<V1Invoice>("/v1/invoices", params);
}

/** The /v1 status filter accepts a single value → one request per bucket. */
export async function getTaxDeadlines(status: "overdue" | "due_today" | "upcoming", dueDateTo?: string) {
  const params = new URLSearchParams({ status });
  if (dueDateTo) params.set("due_date_to", dueDateTo);
  return fetchV1Pages<TaxDeadline>("/v1/tax-deadlines", params);
}

export async function getClients(query?: string): Promise<ClientRecord[]> {
  const params = new URLSearchParams({ per_page: "100" });
  if (query) params.set("q", query);
  const res = await request<{ success: boolean; data: ClientRecord[] }>(`/clients?${params.toString()}`);
  return res.data;
}

export async function getNumberings(): Promise<Numbering[]> {
  const res = await request<{ success: boolean; data: Numbering[] }>("/fatture/numerazioni");
  return res.data;
}

export async function getPaymentMethods(): Promise<PaymentMethodRecord[]> {
  const res = await request<{ success: boolean; data: PaymentMethodRecord[] }>("/fatture/metodi-pagamento");
  return res.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Writes (every caller MUST confirm with the user before invoking these)
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateInvoicePayload {
  cliente: {
    name: string;
    piva: string;
    address: string;
    cap: string;
    city: string;
    province?: string | null;
    country: string;
    sdi?: string | null;
    pec?: string | null;
  };
  numerazione: string;
  issue_date: string; // YYYY-MM-DD
  metodo_pagamento: string;
  articoli: Array<{
    nome: string;
    quantita: number;
    prezzo: number;
    iva: number;
    natura?: string;
    descrizione?: string;
  }>;
  note?: string;
  invia_sdi: boolean;
  paid?: number;
}

export interface CreatedInvoice {
  uuid: string | null;
  number: string | null;
  total: number | null;
}

export async function createInvoice(payload: CreateInvoicePayload): Promise<CreatedInvoice> {
  // The two creation endpoints historically return slightly different shapes:
  // {success, invoice} (manuale) — be defensive when extracting fields.
  const res = await request<Record<string, unknown>>("/fatture/nuova/manuale", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const invoice = (res.invoice ?? (res.data as Record<string, unknown> | undefined)?.fattura ?? {}) as Record<
    string,
    unknown
  >;

  return {
    uuid: typeof invoice.uuid === "string" ? invoice.uuid : null,
    number: typeof invoice.invoice_number === "string" ? invoice.invoice_number : null,
    total: typeof invoice.total === "number" ? invoice.total : Number(invoice.total) || null,
  };
}

export interface RegisteredPayment {
  amount_due: number;
  payment_status: PaymentStatus;
}

export async function registerPayment(
  uuid: string,
  data: { amount: number; payment_date?: string; metodo_pagamento?: string; note?: string },
): Promise<RegisteredPayment> {
  const res = await request<{ success: boolean; invoice: { amount_due: number; payment_status: PaymentStatus } }>(
    `/fatture/${uuid}/pagamenti`,
    { method: "POST", body: JSON.stringify(data) },
  );
  return { amount_due: res.invoice.amount_due, payment_status: res.invoice.payment_status };
}

export async function markTaxPaid(taxId: string, paidDate: string, paymentReference?: string): Promise<void> {
  await request<unknown>(`/taxes/${taxId}/mark-paid`, {
    method: "POST",
    body: JSON.stringify({ paid_date: paidDate, payment_reference: paymentReference || undefined }),
  });
}

export async function createClientFromVat(piva: string): Promise<{ id: number; name: string }> {
  const res = await request<{ success: boolean; data: { id: number; name: string } }>("/clients/store/automatic", {
    method: "POST",
    body: JSON.stringify({ piva }),
  });
  return res.data;
}

export interface ManualClientPayload {
  name: string;
  piva?: string;
  address?: string;
  cap?: string;
  city?: string;
  province?: string;
  country?: string;
  sdi?: string;
  pec?: string;
  email?: string;
  phone?: string;
}

export async function createClientManual(payload: ManualClientPayload): Promise<{ id: number; name: string }> {
  const res = await request<{ success: boolean; data: { id: number; name: string } }>("/clients/store/manual", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}
