import { LocalStorage } from "@raycast/api";
import { CACHE, TIMEOUTS } from "./config";
import { getLogger } from "./logger";
import { WELL_KNOWN_CATALOG, WellKnownEntry, WellKnownStatus } from "./wellKnownCatalog";

const log = getLogger("wellknown-registry");

/**
 * Keeps the well-known catalog current without making every dig wait on IANA.
 *
 * The shipped snapshot in `wellKnownCatalog.ts` is always the fallback, so a
 * refresh that fails costs nothing — the sweep runs against the checked-in list
 * exactly as before. What a refresh buys is the handful of paths registered
 * since the release.
 *
 * IANA serves `Last-Modified` and honours `If-Modified-Since` with a 304
 * (verified 2026-09-08), so the steady state is a conditional request that
 * transfers no body at all. The registry changes a few times a year; the check
 * interval is set accordingly.
 */

const CSV_URL = "https://www.iana.org/assignments/well-known-uris/well-known-uris-1.csv";

const STORAGE_KEY = "digger_wellknown_registry_v1";

interface StoredRegistry {
  /** Entries parsed from the registry CSV — the IANA half of the catalog only. */
  entries: Array<{ path: string; status: WellKnownStatus; reference?: string }>;
  /** `Last-Modified` from the response that produced `entries`. */
  lastModified?: string;
  /** When we last ASKED, whether or not anything changed. */
  checkedAt: number;
}

/** Paths the registry does not list, which are ours to maintain, plus every `probe: false` ruling. */
const LOCAL_ENTRIES = WELL_KNOWN_CATALOG.filter((e) => e.status === "unregistered");
const LOCAL_RULINGS = new Map(WELL_KNOWN_CATALOG.map((e) => [e.path, e.probe]));

function parseRegistryCsv(csv: string): StoredRegistry["entries"] {
  const rows = parseCsvRows(csv);
  const header = rows.shift();
  if (!header) throw new Error("Registry CSV had no header row");

  const col = (name: string) => header.findIndex((h) => h.trim().toLowerCase() === name);
  const iPath = col("uri suffix");
  const iStatus = col("status");
  const iRef = col("reference");
  if (iPath === -1 || iStatus === -1) {
    throw new Error(`Registry CSV columns changed: got ${header.join(", ")}`);
  }

  const entries: StoredRegistry["entries"] = [];
  for (const row of rows) {
    const path = row[iPath]?.trim();
    const status = row[iStatus]?.trim();
    if (!path || !status) continue;
    if (!["permanent", "provisional", "deprecated", "obsoleted"].includes(status)) continue;
    entries.push({
      path,
      status: status as WellKnownStatus,
      reference: referenceUrl(row[iRef] ?? ""),
    });
  }
  // A registry that parsed to almost nothing means the format moved, not that
  // IANA deleted its own list. Refuse it rather than shrinking the catalog.
  if (entries.length < 50) {
    throw new Error(`Registry CSV parsed to only ${entries.length} entries — refusing to adopt it`);
  }
  return entries;
}

/** Minimal RFC 4180 reader: the Reference column contains quoted commas. */
function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (quoted) {
      if (c === '"') {
        if (csv[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function referenceUrl(reference: string): string | undefined {
  const url = /https?:\/\/[^\][,\s]+/.exec(reference);
  if (url) return url[0].replace(/[.,]$/, "");
  const rfc = /RFC\s?(\d{4,5})/.exec(reference);
  return rfc ? `https://www.rfc-editor.org/rfc/rfc${rfc[1]}` : undefined;
}

async function readStored(): Promise<StoredRegistry | undefined> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as StoredRegistry;
  } catch {
    // Corrupt entry: drop it and fall back to the shipped snapshot.
    await LocalStorage.removeItem(STORAGE_KEY);
    return undefined;
  }
}

/**
 * The catalog to sweep: the shipped snapshot, replaced by a fetched registry
 * when one has been stored.
 *
 * Local rulings survive the swap. `probe: false` is a judgement about whether a
 * bare GET can answer for a path at all — it is not in the registry and IANA
 * will never supply it, so a refresh that dropped it would silently start
 * probing 30 paths that cannot answer and inflating the denominator with them.
 */
export function catalogFrom(stored: StoredRegistry | undefined): readonly WellKnownEntry[] {
  if (!stored) return WELL_KNOWN_CATALOG;
  const registry: WellKnownEntry[] = stored.entries.map((e) => ({
    path: e.path,
    status: e.status,
    reference: e.reference,
    ...(LOCAL_RULINGS.get(e.path) === false ? { probe: false as const } : {}),
  }));
  return [...registry, ...LOCAL_ENTRIES].sort((a, b) => a.path.localeCompare(b.path));
}

/** Reads the stored registry without touching the network. */
export async function loadCatalog(): Promise<readonly WellKnownEntry[]> {
  return catalogFrom(await readStored());
}

/**
 * Refreshes the stored registry if the check interval has elapsed.
 *
 * Never throws and never blocks a dig: a failure leaves whatever was stored (or
 * the shipped snapshot) in place. Returns true when the entries changed.
 */
export async function refreshCatalogIfStale(): Promise<boolean> {
  try {
    // Inside the try: LocalStorage can reject, and a rejection out here escapes
    // as an unhandled promise on the fire-and-forget call site.
    const stored = await readStored();
    const age = stored ? Date.now() - stored.checkedAt : Infinity;
    if (age < CACHE.REGISTRY_CHECK_INTERVAL_MS) return false;

    const response = await fetch(CSV_URL, {
      redirect: "follow",
      headers: {
        "Accept-Encoding": "identity",
        ...(stored?.lastModified ? { "If-Modified-Since": stored.lastModified } : {}),
      },
      signal: AbortSignal.timeout(TIMEOUTS.REGISTRY_FETCH),
    });

    if (response.status === 304) {
      // Unchanged. Record that we asked, so the next dig does not ask again.
      await response.body?.cancel().catch(() => undefined);
      if (stored) {
        await LocalStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, checkedAt: Date.now() }));
      }
      log.log("registry:unchanged");
      return false;
    }
    if (!response.ok) {
      throw new Error(`Registry request failed with HTTP ${response.status}`);
    }

    const entries = parseRegistryCsv(await response.text());
    const next: StoredRegistry = {
      entries,
      lastModified: response.headers.get("last-modified") ?? undefined,
      checkedAt: Date.now(),
    };
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(next));

    const added = entries.filter((e) => !WELL_KNOWN_CATALOG.some((c) => c.path === e.path)).map((e) => e.path);
    log.log("registry:updated", { entries: entries.length, added: added.length, lastModified: next.lastModified });
    return true;
  } catch (error) {
    // A refresh failure is not a dig failure. The shipped snapshot is a valid
    // catalog; the only cost is not seeing paths registered since the release,
    // which is why this is logged and swallowed rather than surfaced.
    log.warn("registry:refresh-failed", { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}
