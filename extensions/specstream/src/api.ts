export const DEFAULT_ORIGIN = "https://specstream.ai";

export type ParseResult = {
  status: string;
  ast_hash: string | null;
  canonical_sentence: string | null;
  chips?: Array<{ label?: string; chip_id?: string }>;
};

export type Quote = {
  pack_id: string;
  unit_cents: number;
  cap_cents: number;
  max_rows: number;
  min_rows: number;
};

export type FindCreate = { find_id: string; status: string };
export type FindSnap = { find_id: string; status: string };
export type RowCell = {
  column_id: string;
  label?: string;
  display?: string | null;
  provenance?: { source_url?: string | null } | null;
};
export type AcceptedRow = { entity_id: string; cells: RowCell[] };
export type RowsPage = { find_id: string; accepted_count: number; rows: AcceptedRow[]; next_cursor?: string | null };
export type PaidRun = { find_id: string; status: string; funding_url?: string | null };

export async function specstreamRequest<T>(
  apiOrigin: string | undefined,
  apiKey: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const origin = (apiOrigin || DEFAULT_ORIGIN).replace(/\/+$/, "") || DEFAULT_ORIGIN;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(`${origin}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = (await response.json()) as { data?: T; error?: { message?: string; code?: string } };
  if (!response.ok) {
    throw Object.assign(new Error(payload.error?.message || response.statusText || "request failed"), {
      status: response.status,
    });
  }
  return (payload.data ?? payload) as T;
}

export function centsToUsd(cents: number): number {
  return Number(cents || 0) / 100;
}
