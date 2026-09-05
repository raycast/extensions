import fs from "fs";
import os from "os";
import path from "path";
import { useEffect, useRef, useState } from "react";

/**
 * Reads directly from the same ~/Saturn files the Saturn app writes.
 * Search stays retrieval-only. The save command does not mutate
 * library.json directly; it hands off to Saturn through ~/Saturn/inbox so the
 * app can run its normal metadata / screenshot / indexing pipeline.
 *
 * Three files, by temperature:
 *   library.json       — hot: item metadata (small, re-read on every change)
 *   search-index.json  — the app-maintained inverted index (primary search source)
 *   page-texts.json    — bulk extracted page text, only needed for snippets
 */

export const SATURN_ROOT = path.join(os.homedir(), "Saturn");
export const LIBRARY_FILE = path.join(SATURN_ROOT, "library.json");
export const SEARCH_INDEX_FILE = path.join(SATURN_ROOT, "search-index.json");
export const PAGE_TEXTS_FILE = path.join(SATURN_ROOT, "page-texts.json");
export const INBOX_DIR = path.join(SATURN_ROOT, "inbox");

/** Public listing for the Saturn macOS app on Glaze. */
export const SATURN_APP_URL = "https://www.glaze.app/app/saturn-ewPgBX";

/**
 * Glaze per-app URL scheme for the Saturn macOS app (package id `1v0xag7h`).
 * Opens the library window on that collection: glaze-1v0xag7h-local://collection/<id>
 */
export const SATURN_URL_SCHEME = "glaze-1v0xag7h-local";

/** Deep link that opens a collection in the Saturn app. */
export function collectionDeepLink(collectionId: string): string {
  return `${SATURN_URL_SCHEME}://collection/${encodeURIComponent(collectionId)}`;
}

const WATCHED_FILES = new Set([
  "library.json",
  "search-index.json",
  "page-texts.json",
]);
const RELOAD_DEBOUNCE_MS = 150;

export interface SaturnCollection {
  id: string;
  name: string;
  createdAt: string;
  isInbox: boolean;
  parentId?: string;
}

/** Only the fields this extension cares about — the real SaturnItem has more (type, clickCount, etc). */
export interface SaturnLink {
  id: string;
  url: string;
  title: string;
  collectionId: string;
  sourceApp?: string;
  capturedAt: string;
  pinned: boolean;
  tags?: string[];
  /** Absolute path to the local viewport screenshot, when captured. */
  previewImagePath?: string;
  /** Most recent open (from the app's clickTimestamps); absent → never opened. */
  lastOpenedAt?: string;
}

interface RawItem {
  id?: unknown;
  type?: unknown;
  payload?: unknown;
  title?: unknown;
  collectionId?: unknown;
  sourceApp?: unknown;
  capturedAt?: unknown;
  pinned?: unknown;
  tags?: unknown;
  previewImagePath?: unknown;
  clickTimestamps?: unknown;
}

interface RawCollection {
  id?: unknown;
  name?: unknown;
  createdAt?: unknown;
  isInbox?: unknown;
  parentId?: unknown;
}

export interface SaturnLibrary {
  collections: SaturnCollection[];
  links: SaturnLink[];
}

/** One inverted-index posting: item id, field mask (title 1 / tag 2 / body 4), term frequency. */
export interface SearchIndexPosting {
  id: string;
  f: number;
  t: number;
}

export interface SearchIndexData {
  docs: Record<string, { title: number; tags: number; body: number }>;
  terms: Record<string, SearchIndexPosting[]>;
}

function coerceCollection(raw: RawCollection): SaturnCollection | null {
  if (typeof raw.id !== "string" || typeof raw.name !== "string") return null;
  return {
    id: raw.id,
    name: raw.name,
    createdAt:
      typeof raw.createdAt === "string"
        ? raw.createdAt
        : new Date(0).toISOString(),
    isInbox: raw.isInbox === true,
    parentId: typeof raw.parentId === "string" ? raw.parentId : undefined,
  };
}

function coerceLink(raw: RawItem): SaturnLink | null {
  if (raw.type !== "link") return null;
  if (
    typeof raw.id !== "string" ||
    typeof raw.payload !== "string" ||
    typeof raw.collectionId !== "string"
  ) {
    return null;
  }
  const clickTimestamps = Array.isArray(raw.clickTimestamps)
    ? raw.clickTimestamps.filter((t): t is string => typeof t === "string")
    : [];
  return {
    id: raw.id,
    url: raw.payload,
    title:
      typeof raw.title === "string" && raw.title.trim()
        ? raw.title
        : raw.payload,
    collectionId: raw.collectionId,
    sourceApp: typeof raw.sourceApp === "string" ? raw.sourceApp : undefined,
    capturedAt:
      typeof raw.capturedAt === "string"
        ? raw.capturedAt
        : new Date(0).toISOString(),
    pinned: raw.pinned === true,
    tags: Array.isArray(raw.tags)
      ? raw.tags.filter((t): t is string => typeof t === "string")
      : undefined,
    previewImagePath:
      typeof raw.previewImagePath === "string"
        ? raw.previewImagePath
        : undefined,
    lastOpenedAt: clickTimestamps[clickTimestamps.length - 1],
  };
}

/** Never throws — a missing or malformed library.json just reads as empty. */
export function readSaturnLibrary(): SaturnLibrary {
  try {
    const text = fs.readFileSync(LIBRARY_FILE, "utf-8");
    const parsed = JSON.parse(text) as {
      collections?: RawCollection[];
      items?: RawItem[];
    };
    const collections = (
      Array.isArray(parsed.collections) ? parsed.collections : []
    )
      .map(coerceCollection)
      .filter((c): c is SaturnCollection => c !== null);
    const links = (Array.isArray(parsed.items) ? parsed.items : [])
      .map(coerceLink)
      .filter((l): l is SaturnLink => l !== null)
      .sort((a, b) => (a.capturedAt < b.capturedAt ? 1 : -1));
    return { collections, links };
  } catch {
    return { collections: [], links: [] };
  }
}

function coercePosting(raw: unknown): SearchIndexPosting | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (
    typeof r.id !== "string" ||
    typeof r.f !== "number" ||
    typeof r.t !== "number"
  ) {
    return null;
  }
  return { id: r.id, f: r.f, t: r.t };
}

/**
 * Reads the app-maintained inverted index. Returns null when missing/corrupt —
 * the caller then falls back to building one in-memory (rare path; the app
 * rewrites this file on every launch and index mutation).
 */
export function readSearchIndex(): SearchIndexData | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(SEARCH_INDEX_FILE, "utf-8")) as {
      version?: unknown;
      docs?: unknown;
      terms?: unknown;
    };
    if (
      parsed?.version !== 1 ||
      !parsed.docs ||
      typeof parsed.docs !== "object" ||
      !parsed.terms ||
      typeof parsed.terms !== "object"
    ) {
      return null;
    }
    const terms: Record<string, SearchIndexPosting[]> = {};
    for (const [term, rawPostings] of Object.entries(
      parsed.terms as Record<string, unknown>,
    )) {
      if (!Array.isArray(rawPostings)) continue;
      const postings = rawPostings
        .map(coercePosting)
        .filter((p): p is SearchIndexPosting => p !== null);
      if (postings.length > 0) terms[term] = postings;
    }
    return { docs: parsed.docs as SearchIndexData["docs"], terms };
  } catch {
    return null;
  }
}

/** Reads the page-text sidecar (item id → extracted text). Never throws. */
export function readPageTexts(): Record<string, string> {
  try {
    const parsed = JSON.parse(fs.readFileSync(PAGE_TEXTS_FILE, "utf-8")) as {
      texts?: unknown;
    };
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !parsed.texts ||
      typeof parsed.texts !== "object"
    ) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed.texts as Record<string, unknown>).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );
  } catch {
    return {};
  }
}

export function sortCollections(
  collections: SaturnCollection[],
): SaturnCollection[] {
  return [...collections].sort((a, b) => {
    if (a.isInbox !== b.isInbox) return a.isInbox ? -1 : 1;
    return collectionPathName(a, collections).localeCompare(
      collectionPathName(b, collections),
    );
  });
}

/** Nested collection path, e.g. "design/inspo". */
export function collectionPathName(
  collection: SaturnCollection,
  all: SaturnCollection[],
): string {
  const byId = new Map(all.map((c) => [c.id, c]));
  const parts = [collection.name];
  const seen = new Set([collection.id]);
  let current = collection;
  while (current.parentId) {
    const parent = byId.get(current.parentId);
    if (!parent || seen.has(parent.id)) break;
    parts.unshift(parent.name);
    seen.add(parent.id);
    current = parent;
  }
  return parts.join("/");
}

export function filterCollections(
  query: string,
  collections: SaturnCollection[],
): { matches: SaturnCollection[]; exactMatch: SaturnCollection | undefined } {
  const ordered = sortCollections(collections);
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return { matches: ordered, exactMatch: undefined };
  const matches = ordered.filter((c) =>
    collectionPathName(c, collections).toLowerCase().includes(trimmed),
  );
  const exactMatch = ordered.find(
    (c) => collectionPathName(c, collections).toLowerCase() === trimmed,
  );
  return { matches, exactMatch };
}

function normalizeUrlForDuplicate(raw: string): string {
  try {
    const u = new URL(raw.trim());
    let pathname = u.pathname;
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }
    return `${u.protocol}//${u.hostname.toLowerCase()}${u.port ? `:${u.port}` : ""}${pathname}${u.search}`;
  } catch {
    return raw.trim().toLowerCase();
  }
}

export function findDuplicateLink(
  links: SaturnLink[],
  url: string,
): SaturnLink | undefined {
  const norm = normalizeUrlForDuplicate(url);
  return links.find((l) => l.url && normalizeUrlForDuplicate(l.url) === norm);
}

export function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Human-phrased relative time for metadata labels: "yesterday", "3 months ago". */
export function relativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < minute) return "just now";
  if (diffMs < hour) {
    const n = Math.floor(diffMs / minute);
    return n === 1 ? "1 minute ago" : `${n} minutes ago`;
  }
  if (diffMs < day) {
    const n = Math.floor(diffMs / hour);
    return n === 1 ? "1 hour ago" : `${n} hours ago`;
  }
  const days = Math.floor(diffMs / day);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return months <= 1 ? "1 month ago" : `${months} months ago`;
  }
  const years = Math.floor(days / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

export function absoluteTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export interface SaturnData {
  library: SaturnLibrary;
  /** The app-maintained index, or null when missing/corrupt (→ in-memory fallback). */
  index: SearchIndexData | null;
  pageTexts: Record<string, string>;
  isLoading: boolean;
}

function readAll(): Omit<SaturnData, "isLoading"> {
  return {
    library: readSaturnLibrary(),
    index: readSearchIndex(),
    pageTexts: readPageTexts(),
  };
}

/**
 * Live-reads Saturn's files: re-reads on mount, and again whenever one of the
 * three files changes on disk (the app can be capturing/extracting while this
 * list is open). fs.watch events are coalesced per filename behind a shared
 * debounce, so a backfill storm (every bookmark getting text extracted at
 * once) re-reads each file at most once per quiet gap. Only the file that
 * actually changed is re-parsed.
 */
export interface CaptureSaveInput {
  type: "link" | "text" | "color" | "file";
  payload: string;
  title?: string;
  sourceApp?: string;
  sourceUrl?: string;
  capturedAt: string;
  collectionName: string;
  tags?: string[];
  company?: string;
  description?: string;
  previewImagePath?: string;
}

/**
 * Hands a capture to Saturn's inbox watcher. The app ingests the file, saves
 * the item, and runs metadata / page-text enrichment (skipping screenshot when
 * previewImagePath is already present).
 */
export function enqueueCapture(input: CaptureSaveInput): void {
  fs.mkdirSync(INBOX_DIR, { recursive: true });
  const capture: Record<string, unknown> = {
    type: input.type,
    payload: input.payload.trim(),
    title: input.title,
    sourceApp: input.sourceApp ?? "Raycast",
    sourceUrl: input.sourceUrl ?? input.payload,
    capturedAt: input.capturedAt,
    collection: input.collectionName,
  };
  if (input.tags && input.tags.length > 0) capture.tags = input.tags;
  if (input.company) capture.company = input.company;
  if (input.description) capture.description = input.description;
  if (input.previewImagePath) {
    capture.previewImagePath = input.previewImagePath;
  }
  const tmpFile = path.join(INBOX_DIR, `raycast-${Date.now()}.json.tmp`);
  const finalFile = tmpFile.replace(/\.tmp$/, "");
  fs.writeFileSync(tmpFile, JSON.stringify(capture), "utf-8");
  fs.renameSync(tmpFile, finalFile);
}

export function useSaturnLibrary(): SaturnData {
  const [data, setData] = useState<Omit<SaturnData, "isLoading">>(readAll);
  const [isLoading, setIsLoading] = useState(true);
  const pendingRef = useRef<Set<string>>(new Set());
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setData(readAll());
    setIsLoading(false);

    let watcher: fs.FSWatcher | null = null;
    try {
      // Watch the containing directory, not the files themselves — atomic
      // writes (write temp + rename) replace inodes, breaking direct watches.
      watcher = fs.watch(
        SATURN_ROOT,
        { persistent: false },
        (_event, filename) => {
          const name = filename?.toString();
          if (!name || !WATCHED_FILES.has(name)) return;
          pendingRef.current.add(name);
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            const pending = new Set(pendingRef.current);
            pendingRef.current.clear();
            setData((prev) => ({
              library: pending.has("library.json")
                ? readSaturnLibrary()
                : prev.library,
              index: pending.has("search-index.json")
                ? readSearchIndex()
                : prev.index,
              pageTexts: pending.has("page-texts.json")
                ? readPageTexts()
                : prev.pageTexts,
            }));
          }, RELOAD_DEBOUNCE_MS);
        },
      );
    } catch {
      // ~/Saturn may not exist yet (app never launched) — nothing to watch.
    }

    return () => {
      watcher?.close();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { ...data, isLoading };
}
