import { environment } from "@raycast/api";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { CACHE_SCHEMA, DOCS_BASE } from "./constants";
import { fetchIfChanged, fetchText, revisionOf } from "./http";
import { clearDetailsCache } from "./pages";
import { pruneStaleSchemas, writeFileAtomic } from "./storage";
import { DocEntry, EntryKind, Inventory, SectionId } from "./types";

const CACHE_TTL = 24 * 60 * 60 * 1000;

const TYPE_INDEX = "type-search-index.js";
const MEMBER_INDEX = "member-search-index.js";
const PACKAGE_INDEX = "package-search-index.js";
const INDEX_FILES = [PACKAGE_INDEX, TYPE_INDEX, MEMBER_INDEX];

// The "k" field of a Javadoc search index item is an index into the itemDesc
// table of the generated search.js. Members default to 5 (method) and types to
// 12 (class) when the field is absent.
const MEMBER_KINDS: Record<string, EntryKind> = {
  "0": "constant",
  "1": "field",
  "2": "field",
  "3": "initializer",
  "4": "method",
  "5": "method",
  "6": "method",
  "7": "field",
};

const TYPE_KINDS: Record<string, EntryKind> = {
  "8": "annotation",
  "9": "enum",
  "10": "interface",
  "11": "record",
  "12": "class",
  "13": "exception",
};

const SUMMARY_KIND = "18";

interface IndexItem {
  p?: string;
  c?: string;
  l: string;
  u?: string;
  k?: string;
}

function parseIndexFile(source: string): IndexItem[] {
  const start = source.indexOf("[");
  const end = source.lastIndexOf("]");
  if (start === -1 || end <= start)
    throw new Error("Unrecognised Javadoc search index format");
  return JSON.parse(source.slice(start, end + 1)) as IndexItem[];
}

function resolveSection(pkg: string): SectionId {
  if (pkg.startsWith("net.dv8tion.jda.api.events")) return "events";
  if (
    pkg.startsWith("net.dv8tion.jda.api.interactions") ||
    pkg.startsWith("net.dv8tion.jda.api.components") ||
    pkg.startsWith("net.dv8tion.jda.api.modals")
  )
    return "interactions";
  if (pkg.startsWith("net.dv8tion.jda.api.requests")) return "requests";
  if (pkg.startsWith("net.dv8tion.jda.api.audio")) return "audio";
  if (
    pkg.startsWith("net.dv8tion.jda.api.utils") ||
    pkg.startsWith("net.dv8tion.jda.api.exceptions") ||
    pkg.startsWith("net.dv8tion.jda.api.hooks") ||
    pkg.startsWith("net.dv8tion.jda.api.audit") ||
    pkg.startsWith("net.dv8tion.jda.api.sharding") ||
    pkg.startsWith("net.dv8tion.jda.annotations")
  )
    return "utils";
  return "core";
}

function pagePath(pkg: string, type: string): string {
  return `${pkg.replace(/\./g, "/")}/${type}.html`;
}

function typeEntry(item: IndexItem): DocEntry | null {
  const pkg = item.p;
  if (!pkg || item.k === SUMMARY_KIND) return null;

  const section = resolveSection(pkg);
  const base = TYPE_KINDS[item.k ?? "12"] ?? "class";
  const kind: EntryKind =
    section === "events" && (base === "class" || base === "interface")
      ? "event"
      : base;
  const page = pagePath(pkg, item.l);

  return {
    name: `${pkg}.${item.l}`,
    display: item.l,
    pkg,
    owner: "",
    kind,
    section,
    page,
    anchor: "class-description",
    url: DOCS_BASE + page,
  };
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function memberEntry(item: IndexItem): DocEntry | null {
  const pkg = item.p;
  const type = item.c;
  if (!pkg || !type || item.k === SUMMARY_KIND) return null;

  const target = item.u ?? item.l;
  const anchor = safeDecode(target);
  const page = pagePath(pkg, type);
  const owner = `${pkg}.${type}`;

  return {
    name: `${owner}#${anchor}`,
    display: `${type}.${item.l}`,
    pkg,
    owner,
    kind: MEMBER_KINDS[item.k ?? "5"] ?? "method",
    section: resolveSection(pkg),
    page,
    anchor,
    url: `${DOCS_BASE}${page}#${target}`,
  };
}

function packageEntry(item: IndexItem): DocEntry | null {
  if (item.k === SUMMARY_KIND || !item.l.startsWith("net.dv8tion")) return null;

  const page = `${item.l.replace(/\./g, "/")}/package-summary.html`;
  return {
    name: item.l,
    display: item.l,
    pkg: item.l,
    owner: "",
    kind: "package",
    section: resolveSection(item.l),
    page,
    anchor: "package-description",
    url: DOCS_BASE + page,
  };
}

function deduplicate(entries: DocEntry[]): DocEntry[] {
  const best = new Map<string, DocEntry>();
  for (const entry of entries) {
    const current = best.get(entry.url);
    if (!current || entry.name.length < current.name.length)
      best.set(entry.url, entry);
  }
  return [...best.values()];
}

async function fetchVersion(): Promise<string> {
  try {
    const overview = await fetchText(`${DOCS_BASE}index.html`);
    return (
      /<title>[^<]*\(JDA ([^)]+?) API\)<\/title>/.exec(overview.body)?.[1] ?? ""
    );
  } catch {
    return "";
  }
}

function cachePath(): string {
  return path.join(environment.supportPath, `inventory-${CACHE_SCHEMA}.json`);
}

async function readCache(): Promise<Inventory | null> {
  try {
    const cached = JSON.parse(await readFile(cachePath(), "utf8")) as Inventory;
    return cached.entries?.length ? cached : null;
  } catch {
    return null;
  }
}

async function writeCache(inventory: Inventory): Promise<void> {
  await writeFileAtomic(cachePath(), JSON.stringify(inventory));
}

// The three index files are published together with every page, so when all of
// them answer 304 the cached inventory, metadata and pages are all still current.
async function download(previous: Inventory | null): Promise<Inventory> {
  const checked = await Promise.all(
    INDEX_FILES.map((file) =>
      fetchIfChanged(DOCS_BASE + file, previous?.validators[file]),
    ),
  );
  if (previous && checked.every((result) => result === null)) {
    const renewed = { ...previous, fetchedAt: Date.now() };
    await writeCache(renewed);
    return renewed;
  }

  const [[packages, types, members], version] = await Promise.all([
    Promise.all(
      checked.map(
        (result, index) => result ?? fetchText(DOCS_BASE + INDEX_FILES[index]),
      ),
    ),
    fetchVersion(),
  ]);

  const entries = [
    ...parseIndexFile(packages.body).map(packageEntry),
    ...parseIndexFile(types.body).map(typeEntry),
    ...parseIndexFile(members.body).map(memberEntry),
  ].filter((entry): entry is DocEntry => entry !== null);

  if (entries.length < 1000)
    throw new Error("The Javadoc search index came back unexpectedly small");

  const inventory: Inventory = {
    fetchedAt: Date.now(),
    revision: revisionOf([
      packages.validators,
      types.validators,
      members.validators,
    ]),
    version,
    validators: {
      [PACKAGE_INDEX]: packages.validators,
      [TYPE_INDEX]: types.validators,
      [MEMBER_INDEX]: members.validators,
    },
    entries: deduplicate(entries).sort((a, b) => a.name.localeCompare(b.name)),
  };
  await writeCache(inventory);

  if (
    previous &&
    (!inventory.revision || previous.revision !== inventory.revision)
  )
    await clearDetailsCache();
  await pruneStaleSchemas();
  return inventory;
}

// Parsing the cache file costs several megabytes of transient JSON, so the
// result is held for the lifetime of the process rather than read per command.
let memoryInventory: Inventory | null = null;
let pending: Promise<Inventory> | null = null;

function isFresh(inventory: Inventory): boolean {
  return Date.now() - inventory.fetchedAt < CACHE_TTL;
}

// A refresh pressed while the first load is still downloading must join it
// rather than race it to the same cache file.
function exclusive(task: () => Promise<Inventory>): Promise<Inventory> {
  if (!pending) {
    pending = task().finally(() => {
      pending = null;
    });
  }
  return pending;
}

export async function loadInventory(): Promise<Inventory> {
  if (memoryInventory && isFresh(memoryInventory)) return memoryInventory;

  return exclusive(async () => {
    const cached = (await readCache()) ?? memoryInventory;
    if (cached && isFresh(cached)) {
      memoryInventory = cached;
      return cached;
    }

    try {
      memoryInventory = await download(cached);
    } catch (error) {
      if (!cached) throw error;
      memoryInventory = cached;
    }
    return memoryInventory;
  });
}

export async function refreshInventory(): Promise<Inventory> {
  await pending?.catch(() => undefined);
  return exclusive(async () => {
    memoryInventory = await download(memoryInventory ?? (await readCache()));
    return memoryInventory;
  });
}
