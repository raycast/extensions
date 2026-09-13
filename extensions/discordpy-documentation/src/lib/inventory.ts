import { environment } from "@raycast/api";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { inflateSync } from "node:zlib";
import {
  CACHE_SCHEMA,
  docsBase,
  docsVersion,
  timeoutSignal,
} from "./constants";
import { DocEntry, EntryKind, Inventory, SectionId } from "./types";

const CACHE_TTL = 24 * 60 * 60 * 1000;

const INVENTORY_LINE = /^(.+?)\s+(\S+):(\S+)\s+(-?\d+)\s+(\S+)\s*(.*)$/;

const IGNORED_PAGES = [
  "whats_new.html",
  "migrating.html",
  "migrating_to_v1.html",
  "migrating_to_async.html",
  "genindex.html",
  "py-modindex.html",
  "search.html",
];

function resolveKind(role: string, name: string): EntryKind {
  switch (role) {
    case "class":
      return "class";
    case "method":
      return "method";
    case "attribute":
      return "attribute";
    case "property":
      return "property";
    case "exception":
      return "exception";
    case "data":
      return "data";
    case "function":
      return /\.on_[a-z0-9_]+$/.test(name) ? "event" : "function";
    default:
      return "guide";
  }
}

function resolveSection(kind: EntryKind, page: string): SectionId {
  if (kind === "guide") return "guide";
  if (kind === "event") return "events";
  if (page.startsWith("ext/commands/")) return "commands";
  if (page.startsWith("ext/tasks/")) return "tasks";
  if (page.startsWith("interactions/")) return "app_commands";
  return "core";
}

const MODULE_PREFIXES = [
  "discord.ext.commands",
  "discord.ext.tasks",
  "discord.app_commands",
  "discord.abc",
  "discord.ui",
  "discord.utils",
  "discord.opus",
  "discord",
];

function splitModule(name: string): { module: string; display: string } {
  for (const prefix of MODULE_PREFIXES) {
    if (name.startsWith(`${prefix}.`))
      return { module: prefix, display: name.slice(prefix.length + 1) };
  }
  return { module: "", display: name };
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

function parseInventory(raw: Uint8Array): Inventory {
  const decoder = new TextDecoder();
  let offset = 0;
  const header: string[] = [];
  for (let i = 0; i < 4; i++) {
    const next = raw.indexOf(0x0a, offset);
    header.push(decoder.decode(raw.subarray(offset, next)));
    offset = next + 1;
  }

  const version = header[2]?.replace("# Version:", "").trim() ?? "";
  const body = decoder.decode(inflateSync(raw.subarray(offset)));
  const entries: DocEntry[] = [];

  for (const line of body.split("\n")) {
    const match = INVENTORY_LINE.exec(line.trim());
    if (!match) continue;

    const [, name, domain, role, , rawUri, rawDisplay] = match;
    const uri = rawUri.replace(/\$$/, name);
    const [page, anchor = ""] = uri.split("#");
    if (IGNORED_PAGES.includes(page)) continue;

    const qualified = name.replace(/^discord\.discord\./, "discord.");
    const kind = resolveKind(domain === "py" ? role : "guide", qualified);
    const { module, display } = splitModule(qualified);

    entries.push({
      name: qualified,
      display:
        kind === "guide" && rawDisplay && rawDisplay !== "-"
          ? rawDisplay
          : display,
      module: kind === "guide" ? "" : module,
      kind,
      section: resolveSection(kind, page),
      page,
      anchor,
      url: docsBase() + uri,
    });
  }

  const unique = deduplicate(entries).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  return { version, fetchedAt: Date.now(), entries: unique };
}

function cachePath(): string {
  return path.join(
    environment.supportPath,
    `inventory-${CACHE_SCHEMA}-${docsVersion()}.json`,
  );
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
  const response = await fetch(`${docsBase()}objects.inv`, {
    signal: timeoutSignal(),
  });
  if (!response.ok)
    throw new Error(
      `Failed to download the documentation index (HTTP ${response.status})`,
    );
  const inventory = parseInventory(
    new Uint8Array(await response.arrayBuffer()),
  );
  await writeCache(inventory);
  return inventory;
}

export async function loadInventory(): Promise<Inventory> {
  const cached = await readCache();
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return cached;

  try {
    return await download();
  } catch (error) {
    if (cached) return cached;
    throw error;
  }
}

export async function refreshInventory(): Promise<Inventory> {
  return download();
}
