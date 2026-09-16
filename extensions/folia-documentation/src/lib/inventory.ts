import { environment } from "@raycast/api";
import { once } from "node:events";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline";
import { CACHE_SCHEMA, docsBase, timeoutSignal } from "./constants";
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

// member-search-index.js alone is a ~30,000-element flat array of small flat
// objects (string/number fields only, never nested), so JSON.parse-ing the
// whole array at once means holding all 30,000 parsed objects in memory
// simultaneously just to iterate them once each. Scanning for one top-level
// `{...}` at a time and JSON.parse-ing only that slice keeps at most one
// object alive per iteration instead — the difference that kept this file's
// own peak memory well clear of a tight worker heap in testing.
function* parseIndexItems(source: string): Generator<IndexItem> {
  const start = source.indexOf("[");
  const end = source.lastIndexOf("]");
  if (start === -1 || end <= start)
    throw new Error("Unrecognised Javadoc search index format");

  let i = start + 1;
  let inString = false;
  let depth = 0;
  let objectStart = -1;

  for (; i < end; i++) {
    const char = source[i];
    if (inString) {
      if (char === "\\") i++;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
    } else if (char === "{") {
      if (depth === 0) objectStart = i;
      depth++;
    } else if (char === "}") {
      depth--;
      if (depth === 0 && objectStart !== -1) {
        yield JSON.parse(source.slice(objectStart, i + 1)) as IndexItem;
        objectStart = -1;
      }
    }
  }
}

// The scheduler package is Folia's whole reason to exist, so it gets its own
// section instead of being lost inside the much larger Paper API package.
function resolveSection(pkg: string): SectionId {
  if (pkg.startsWith("io.papermc.paper.threadedregions")) return "scheduler";
  if (
    pkg.startsWith("org.bukkit.event") ||
    pkg.startsWith("io.papermc.paper.event") ||
    pkg.startsWith("com.destroystokyo.paper.event") ||
    pkg.startsWith("org.spigotmc.event")
  )
    return "events";
  if (pkg.startsWith("org.bukkit.entity")) return "entities";
  if (pkg.startsWith("org.bukkit.inventory")) return "inventory";
  if (
    pkg.startsWith("io.papermc.paper") ||
    pkg.startsWith("com.destroystokyo.paper")
  )
    return "paper";
  if (pkg.startsWith("org.bukkit")) return "core";
  return "utils";
}

function pagePath(pkg: string, type: string): string {
  return `${pkg.replace(/\./g, "/")}/${type}.html`;
}

// The Bukkit/Paper doclet publishes these roots as documented API; everything
// else (relocated libraries, Log4j, Guava re-exports) is noise. org.spigotmc
// is small but carries real, widely used API such as PlayerSpawnLocationEvent.
function isDocumentedPackage(pkg: string): boolean {
  return (
    pkg.startsWith("org.bukkit") ||
    pkg.startsWith("io.papermc.paper") ||
    pkg.startsWith("com.destroystokyo.paper") ||
    pkg.startsWith("co.aikar") ||
    pkg.startsWith("org.spigotmc")
  );
}

function typeEntry(item: IndexItem): DocEntry | null {
  const pkg = item.p;
  if (!pkg || item.k === SUMMARY_KIND || !isDocumentedPackage(pkg)) return null;

  const base = TYPE_KINDS[item.k ?? "12"] ?? "class";
  const section = resolveSection(pkg);
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
  if (!pkg || !type || item.k === SUMMARY_KIND || !isDocumentedPackage(pkg))
    return null;

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
  };
}

function packageEntry(item: IndexItem): DocEntry | null {
  if (item.k === SUMMARY_KIND || !isDocumentedPackage(item.l)) return null;

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
  };
}

// Deduplicating straight into the target map as each index file is processed,
// instead of concatenating all three into one flat array first, keeps only
// one raw parsed index in memory at a time instead of all three at once.
function addEntry(
  best: Map<string, DocEntry>,
  entry: DocEntry | null,
  version: string,
): void {
  if (!entry) return;
  const current = best.get(entry.name);
  if (current && entry.name.length >= current.name.length) return;

  // A JSON round trip flattens the concatenated strings, halving the heap a
  // freshly downloaded inventory retains compared with the built objects.
  const finished = JSON.parse(
    JSON.stringify({ ...entry, version }),
  ) as DocEntry;
  best.set(finished.name, finished);
}

async function fetchText(base: string, file: string): Promise<string> {
  const response = await fetch(base + file, { signal: timeoutSignal() });
  if (!response.ok)
    throw new Error(`Failed to download ${file} (HTTP ${response.status})`);
  return response.text();
}

// The `.jsonl` token also stands in for a format version: the cache is now a
// line-delimited file, so an old array-form `inventory-v1-<version>.json` left
// by a previous build is simply ignored rather than mis-parsed, without
// disturbing the guide/page/details caches that also key off CACHE_SCHEMA.
function cachePath(version: string): string {
  return path.join(
    environment.supportPath,
    `inventory-${CACHE_SCHEMA}-${version}.jsonl`,
  );
}

interface CacheHeader {
  version: string;
  fetchedAt: number;
}

// The whole-file JSON.parse this replaces built a multi-megabyte source string
// and the parser's own tree/scratch on top of it in one synchronous call —
// the last big transient allocation left in the command and AI-tool path, and
// on its own enough to exhaust Raycast's worker heap on the ~33,000-entry
// index. A line-delimited file is read back one entry at a time: the header is
// line one, every following line is one entry's JSON, so peak memory is the
// finished array plus a single line, never a second copy of the whole thing.
async function readCache(version: string): Promise<Inventory | null> {
  const lines = createInterface({
    input: createReadStream(cachePath(version), { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  try {
    let header: CacheHeader | null = null;
    const entries: DocEntry[] = [];

    for await (const line of lines) {
      if (!line) continue;
      if (!header) header = JSON.parse(line) as CacheHeader;
      else entries.push(JSON.parse(line) as DocEntry);
    }

    if (!header || !entries.length) return null;
    return { version: header.version, fetchedAt: header.fetchedAt, entries };
  } catch {
    return null;
  } finally {
    lines.close();
  }
}

// JSON.stringify on the whole ~33,000-entry inventory builds one multi-megabyte
// string (and the recursive serializer's own scratch space on top of it) in a
// single call, which is exactly the kind of allocation that can tip a tight
// heap over the edge. Writing entry-by-entry keeps only one entry's JSON in
// memory at a time, pausing serialization whenever the stream's write buffer
// is full to respect backpressure. The temp-file rename keeps a crash mid-write
// from leaving a truncated cache behind. The header goes on line one and each
// entry on its own line so readCache can stream it back the same way.
async function writeCache(inventory: Inventory): Promise<void> {
  await mkdir(environment.supportPath, { recursive: true });
  const file = cachePath(inventory.version);
  const tmpFile = `${file}.tmp`;

  try {
    await new Promise<void>((resolve, reject) => {
      const stream = createWriteStream(tmpFile, { encoding: "utf8" });
      stream.on("error", reject);
      stream.on("finish", resolve);

      const writeAll = async (): Promise<void> => {
        const header: CacheHeader = {
          version: inventory.version,
          fetchedAt: inventory.fetchedAt,
        };
        if (!stream.write(JSON.stringify(header))) {
          await once(stream, "drain");
        }
        for (const entry of inventory.entries) {
          if (!stream.write(`\n${JSON.stringify(entry)}`)) {
            await once(stream, "drain");
          }
        }
        stream.end();
      };

      writeAll().catch(reject);
    });

    await rename(tmpFile, file);
  } catch (error) {
    try {
      await rm(tmpFile, { force: true });
    } catch {
      // ignore cleanup errors
    }
    throw error;
  }
}

// Scoping each file's raw text to this function, rather than to three
// destructured consts living for the whole of download(), lets it be
// collected the moment its own loop finishes instead of sitting in scope
// (unused but still reachable) until the largest of the three is done too.
// Fetching one at a time instead of with Promise.all costs a bit of wall
// clock but means at most one of the three raw texts is ever in memory.
async function processIndex(
  base: string,
  file: string,
  handle: (item: IndexItem) => void,
): Promise<void> {
  const text = await fetchText(base, file);
  for (const item of parseIndexItems(text)) handle(item);
}

async function download(version: string): Promise<Inventory> {
  const base = docsBase(version);
  const best = new Map<string, DocEntry>();

  await processIndex(base, PACKAGE_INDEX, (item) =>
    addEntry(best, packageEntry(item), version),
  );
  await processIndex(base, TYPE_INDEX, (item) =>
    addEntry(best, typeEntry(item), version),
  );
  await processIndex(base, MEMBER_INDEX, (item) =>
    addEntry(best, memberEntry(item), version),
  );

  if (best.size < 1000)
    throw new Error("The Javadoc search index came back unexpectedly small");

  const inventory: Inventory = {
    version,
    fetchedAt: Date.now(),
    entries: [...best.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };
  await writeCache(inventory);
  return inventory;
}

// Parsing the cache file costs several megabytes of transient JSON, so the
// ~33,000-entry result is held in memory for the lifetime of the process —
// but only for one version at a time. The version is a preference the user
// can change, and a process can outlive several commands, so a Map here
// would keep every version ever selected in memory forever; switching
// between all three real builds that way was enough on its own to exhaust a
// worker's heap without a single entry actually being read.
let memoryInventory: Inventory | null = null;

export async function loadInventory(version: string): Promise<Inventory> {
  if (
    memoryInventory?.version === version &&
    Date.now() - memoryInventory.fetchedAt < CACHE_TTL
  )
    return memoryInventory;

  // Dropping the reference to the previous version's ~33,000 entries before
  // building the next version's, instead of only after, gives the collector
  // a chance to free it during that build instead of holding both at once.
  if (memoryInventory && memoryInventory.version !== version)
    memoryInventory = null;

  const cached = await readCache(version);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    memoryInventory = cached;
    return cached;
  }

  try {
    const fresh = await download(version);
    memoryInventory = fresh;
    return fresh;
  } catch (error) {
    if (cached) {
      memoryInventory = cached;
      return cached;
    }
    throw error;
  }
}

export async function refreshInventory(version: string): Promise<Inventory> {
  const fresh = await download(version);
  memoryInventory = fresh;
  return fresh;
}
