import { environment } from "@raycast/api";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { CACHE_SCHEMA, DOCS_BASE, timeoutSignal } from "./constants";
import { DocEntry, EntryKind, Inventory, SectionId } from "./types";

const CACHE_TTL = 24 * 60 * 60 * 1000;

const TYPE_INDEX = "type-search-index.js";
const MEMBER_INDEX = "member-search-index.js";
const PACKAGE_INDEX = "package-search-index.js";

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

async function fetchText(file: string): Promise<string> {
  const response = await fetch(DOCS_BASE + file, { signal: timeoutSignal() });
  if (!response.ok)
    throw new Error(`Failed to download ${file} (HTTP ${response.status})`);
  return response.text();
}

async function fetchVersion(): Promise<string> {
  try {
    const overview = await fetchText("index.html");
    return (
      /<title>[^<]*\(JDA ([^)]+?) API\)<\/title>/.exec(overview)?.[1] ?? ""
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
  await mkdir(environment.supportPath, { recursive: true });
  await writeFile(cachePath(), JSON.stringify(inventory), "utf8");
}

async function download(): Promise<Inventory> {
  const [types, members, packages, version] = await Promise.all([
    fetchText(TYPE_INDEX),
    fetchText(MEMBER_INDEX),
    fetchText(PACKAGE_INDEX),
    fetchVersion(),
  ]);

  const entries = [
    ...parseIndexFile(packages).map(packageEntry),
    ...parseIndexFile(types).map(typeEntry),
    ...parseIndexFile(members).map(memberEntry),
  ].filter((entry): entry is DocEntry => entry !== null);

  if (entries.length < 1000)
    throw new Error("The Javadoc search index came back unexpectedly small");

  const inventory: Inventory = {
    version,
    fetchedAt: Date.now(),
    entries: deduplicate(entries).sort((a, b) => a.name.localeCompare(b.name)),
  };
  await writeCache(inventory);
  return inventory;
}

// Parsing the cache file costs several megabytes of transient JSON, so the
// result is held for the lifetime of the process rather than read per command.
let memoryInventory: Inventory | null = null;

export async function loadInventory(): Promise<Inventory> {
  if (memoryInventory && Date.now() - memoryInventory.fetchedAt < CACHE_TTL)
    return memoryInventory;

  const cached = await readCache();
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    memoryInventory = cached;
    return cached;
  }

  try {
    memoryInventory = await download();
    return memoryInventory;
  } catch (error) {
    if (cached) {
      memoryInventory = cached;
      return cached;
    }
    throw error;
  }
}

export async function refreshInventory(): Promise<Inventory> {
  memoryInventory = await download();
  return memoryInventory;
}
