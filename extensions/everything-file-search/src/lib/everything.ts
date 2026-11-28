/**
 * Everything HTTP JSON client.
 *
 * Field-tested notes (Everything 1.4.1):
 * - Column flags: path_column / size_column / date_modified_column / date_created_column
 * - Sorting: sort=<name|path|size|date_modified|date_created>&ascending=<1|0>
 *   (directional strings like "sort=size-descending" are silently ignored)
 * - Never pass s= for sorting: s is the abbreviation of search and overrides the query
 * - Time columns are Windows FILETIME strings (1601 epoch, 100ns units, use BigInt)
 */

export interface EverythingResultItem {
  type: "file" | "folder";
  name: string;
  path: string;
  size?: string;
  date_modified?: string;
  date_created?: string;
}

export interface EverythingResponse {
  totalResults: number;
  results: EverythingResultItem[];
}

export type SortField =
  "name" | "path" | "size" | "date_modified" | "date_created";

export const SORT_FIELDS: { field: SortField; label: string }[] = [
  { field: "name", label: "Name" },
  { field: "path", label: "Path" },
  { field: "size", label: "Size" },
  { field: "date_modified", label: "Modified" },
];

export interface SearchOptions {
  host?: string;
  port?: number;
  /** Raw keywords; Everything syntax (ext:, path:, regex:…) is passed through */
  query?: string;
  /** Extension filter (no dots), becomes ext:a;b;c */
  extensions?: string[];
  onlyFiles?: boolean;
  onlyFolders?: boolean;
  sort?: { field: SortField; ascending: boolean };
  count?: number;
  offset?: number;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export class EverythingUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EverythingUnavailableError";
  }
}

export function buildSearchExpression(o: SearchOptions): string {
  const parts: string[] = [];
  const q = (o.query ?? "").trim();
  if (q) parts.push(q);
  if (o.onlyFolders) parts.push("folder:");
  else if (o.onlyFiles) parts.push("file:");
  if (o.extensions && o.extensions.length > 0)
    parts.push(`ext:${o.extensions.join(";")}`);
  // Exclude files in $RECYCLE.BIN on every drive
  parts.push("!path:$recycle.bin");
  return parts.join(" ");
}

export function buildSearchUrl(o: SearchOptions): string {
  const host = o.host ?? "127.0.0.1";
  const port = o.port ?? 8085;
  const p = new URLSearchParams();
  p.set("search", buildSearchExpression(o));
  p.set("json", "1");
  p.set("count", String(Math.min(Math.max(o.count ?? 300, 1), 1000)));
  p.set("offset", String(o.offset ?? 0));
  p.set("path_column", "1");
  p.set("size_column", "1");
  p.set("date_modified_column", "1");
  p.set("date_created_column", "1");
  if (o.sort) {
    p.set("sort", o.sort.field);
    p.set("ascending", o.sort.ascending ? "1" : "0");
  }
  return `http://${host}:${port}/?${p.toString()}`;
}

export async function searchEverything(
  o: SearchOptions,
): Promise<EverythingResponse> {
  const url = buildSearchUrl(o);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), o.timeoutMs ?? 5000);
  const onOuterAbort = () => ctrl.abort();
  o.signal?.addEventListener("abort", onOuterAbort, { once: true });
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok)
      throw new EverythingUnavailableError(
        `Everything HTTP server returned ${res.status}`,
      );
    const text = await res.text();
    try {
      const data = JSON.parse(text) as EverythingResponse;
      if (
        typeof data.totalResults !== "number" ||
        !Array.isArray(data.results)
      ) {
        throw new Error("bad shape");
      }
      return data;
    } catch {
      throw new EverythingUnavailableError(
        "Response is not valid JSON — make sure the port points to the Everything HTTP server",
      );
    }
  } catch (e) {
    if (e instanceof EverythingUnavailableError) throw e;
    throw new EverythingUnavailableError(
      "Cannot reach the Everything HTTP server (not enabled, or wrong port)",
    );
  } finally {
    clearTimeout(timer);
    o.signal?.removeEventListener("abort", onOuterAbort);
  }
}

export async function pingEverything(
  host: string,
  port: number,
): Promise<boolean> {
  try {
    await searchEverything({
      host,
      port,
      query: "",
      count: 1,
      timeoutMs: 1500,
    });
    return true;
  } catch {
    return false;
  }
}
