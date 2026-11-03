// Pulse's symbol catalog and Binance's pair directory, kept on disk and
// refreshed at most once a day. The catalog download is conditional
// (If-None-Match), so a day with no listing changes costs an empty response.
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { CatalogDocument, CryptoPairs } from "./search";

export const CATALOG_URL = "https://www.pulseticker.app/catalog/symbols-v1.json";
export const PAIRS_URL =
  "https://data-api.binance.vision/api/v3/exchangeInfo?permissions=SPOT&symbolStatus=TRADING&showPermissionSets=false";
export const DAY_MS = 24 * 60 * 60 * 1000;

interface Meta {
  etag: string | null;
  checkedAt: number;
}

export interface Stored<T> {
  value: T | null;
  /** When the file was last confirmed current, or 0 when there is none. */
  checkedAt: number;
}

async function readJSON<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return null;
  }
}

/** Write next to the target, then rename, so a crash never leaves half a file. */
async function writeAtomically(path: string, text: string): Promise<void> {
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, text, "utf8");
  await rename(temporary, path);
}

export function validCatalog(value: unknown): value is CatalogDocument {
  const document = value as CatalogDocument | null;
  return (
    document?.schema === 1 &&
    typeof document.generatedAt === "string" &&
    Array.isArray(document.markets) &&
    Array.isArray(document.securities) &&
    document.securities.every(validSecurity) &&
    (document.crypto === undefined || (Array.isArray(document.crypto) && document.crypto.every(validCoin)))
  );
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const optionalNames = (value: unknown) => value === undefined || isObject(value);
const optionalAliases = (value: unknown) => value === undefined || Array.isArray(value);

// Every entry the index reads, so a malformed export never replaces the copy in hand.
function validSecurity(entry: unknown): boolean {
  return (
    isObject(entry) &&
    typeof entry.m === "string" &&
    typeof entry.c === "string" &&
    optionalNames(entry.n) &&
    optionalAliases(entry.a)
  );
}

function validCoin(entry: unknown): boolean {
  return isObject(entry) && typeof entry.b === "string" && optionalNames(entry.n) && optionalAliases(entry.a);
}

export class CatalogStore {
  constructor(
    private readonly directory: string,
    private readonly fetcher: typeof fetch = fetch,
    private readonly now: () => number = Date.now,
  ) {}

  private path(name: string) {
    return join(this.directory, name);
  }

  async loadCatalog(): Promise<Stored<CatalogDocument>> {
    const value = await readJSON<unknown>(this.path("symbols-v1.json"));
    const meta = await readJSON<Meta>(this.path("symbols-v1.meta.json"));
    if (!validCatalog(value)) return { value: null, checkedAt: 0 };
    return { value, checkedAt: meta?.checkedAt ?? 0 };
  }

  async loadPairs(): Promise<Stored<CryptoPairs>> {
    const stored = await readJSON<{ checkedAt: number; pairs: CryptoPairs }>(this.path("binance-pairs.json"));
    if (!stored || !Array.isArray(stored.pairs)) return { value: null, checkedAt: 0 };
    return { value: stored.pairs, checkedAt: stored.checkedAt ?? 0 };
  }

  isStale(stored: Stored<unknown>): boolean {
    return !stored.value || this.now() - stored.checkedAt >= DAY_MS;
  }

  /**
   * The newest catalog, or the one in hand when the server has nothing newer.
   * A file that lists far fewer securities than the copy in hand is refused:
   * a truncated export must not quietly remove half the market from search.
   */
  async refreshCatalog(current: CatalogDocument | null): Promise<CatalogDocument> {
    await mkdir(this.directory, { recursive: true });
    const meta = await readJSON<Meta>(this.path("symbols-v1.meta.json"));
    const headers: Record<string, string> = {};
    if (current && meta?.etag) headers["If-None-Match"] = meta.etag;
    const response = await this.fetcher(CATALOG_URL, { headers, signal: AbortSignal.timeout(60_000) });
    const checked = async (etag: string | null) =>
      writeAtomically(this.path("symbols-v1.meta.json"), JSON.stringify({ etag, checkedAt: this.now() }));

    if (response.status === 304 && current) {
      await checked(meta?.etag ?? null);
      return current;
    }
    if (!response.ok) throw new Error(`Symbol list download failed (HTTP ${response.status}).`);
    const text = await response.text();
    let fresh: unknown;
    try {
      fresh = JSON.parse(text);
    } catch {
      throw new Error("The symbol list could not be read.");
    }
    if (!validCatalog(fresh)) throw new Error("The symbol list has a format this version does not read.");
    if (current) {
      if (fresh.securities.length * 10 < current.securities.length * 7) {
        // Do not download the same truncated file again until tomorrow.
        await checked(meta?.etag ?? null);
        throw new Error(`The new symbol list looks incomplete (${fresh.securities.length} listings).`);
      }
      if (Date.parse(fresh.generatedAt) <= Date.parse(current.generatedAt)) {
        await checked(response.headers.get("etag"));
        return current;
      }
    }
    await writeAtomically(this.path("symbols-v1.json"), text);
    await checked(response.headers.get("etag"));
    return fresh;
  }

  /** Every trading Binance Spot pair; the catalog names coins but not their pairs. */
  async refreshPairs(): Promise<CryptoPairs> {
    await mkdir(this.directory, { recursive: true });
    const response = await this.fetcher(PAIRS_URL, { signal: AbortSignal.timeout(60_000) });
    if (!response.ok) throw new Error(`Binance pair list failed (HTTP ${response.status}).`);
    const body = (await response.json()) as { symbols?: { baseAsset?: unknown; quoteAsset?: unknown }[] };
    const pairs: CryptoPairs = [];
    for (const entry of body.symbols ?? []) {
      if (typeof entry.baseAsset === "string" && typeof entry.quoteAsset === "string") {
        pairs.push([entry.baseAsset, entry.quoteAsset]);
      }
    }
    if (pairs.length < 100) throw new Error("Binance returned too few pairs.");
    await writeAtomically(this.path("binance-pairs.json"), JSON.stringify({ checkedAt: this.now(), pairs }));
    return pairs;
  }
}
