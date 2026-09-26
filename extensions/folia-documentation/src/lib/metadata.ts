import { environment } from "@raycast/api";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { CACHE_SCHEMA, docsBase, timeoutSignal } from "./constants";
import { DocEntry, MetaIndex } from "./types";

const META_TTL = 24 * 60 * 60 * 1000;

interface StoredMeta {
  fetchedAt: number;
  deprecated: string[];
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function metaFile(version: string): string {
  return path.join(
    environment.supportPath,
    `meta-${CACHE_SCHEMA}-${version}.json`,
  );
}

// deprecated-list.html links straight back to the anchor of every deprecated
// class and member, in the exact page/anchor shape the search index already
// uses. Only the "col-summary-item-name" link is the deprecated element's own
// link, though: the "col-last" description next to it is free Javadoc text
// ("use Player.setResourcePack(...) instead") that can itself link to
// unrelated, non-deprecated classes, so scanning the whole page for hrefs
// would misfile something like Player itself as deprecated.
async function download(version: string): Promise<StoredMeta> {
  const response = await fetch(docsBase(version) + "deprecated-list.html", {
    signal: timeoutSignal(),
  });
  if (!response.ok)
    throw new Error(
      `Failed to download deprecated-list.html (HTTP ${response.status})`,
    );
  const html = await response.text();

  const deprecated = new Set<string>();
  const itemPattern =
    /<div class="col-summary-item-name[^"]*">([\s\S]*?)<\/div>/g;
  const hrefPattern = /href="([^"#]+)\.html(?:#([^"]+))?"/;
  for (const item of html.matchAll(itemPattern)) {
    const href = hrefPattern.exec(item[1]);
    if (!href) continue;
    const page = `${href[1]}.html`;
    const anchor = href[2] ? safeDecode(href[2]) : "class-description";
    deprecated.add(`${page}|${anchor}`);
  }

  return { fetchedAt: Date.now(), deprecated: [...deprecated] };
}

async function readStored(version: string): Promise<StoredMeta | null> {
  try {
    const stored = JSON.parse(
      await readFile(metaFile(version), "utf8"),
    ) as StoredMeta;
    return stored.deprecated ? stored : null;
  } catch {
    return null;
  }
}

// One version at a time, same reasoning as memoryInventory in inventory.ts:
// the version is a user preference that can change within a long-lived
// process, and a Map keyed by version would keep every version ever selected
// in memory for the rest of the session instead of releasing the old one.
let cachedMeta: (StoredMeta & { version: string }) | null = null;

async function ensureStored(
  version: string,
  force = false,
): Promise<StoredMeta> {
  if (
    cachedMeta?.version === version &&
    !force &&
    Date.now() - cachedMeta.fetchedAt < META_TTL
  )
    return cachedMeta;

  const stored = force ? null : await readStored(version);
  if (stored && Date.now() - stored.fetchedAt < META_TTL) {
    cachedMeta = { ...stored, version };
    return stored;
  }

  try {
    const fresh = await download(version);
    await mkdir(environment.supportPath, { recursive: true });
    await writeFile(metaFile(version), JSON.stringify(fresh), "utf8");
    cachedMeta = { ...fresh, version };
    return fresh;
  } catch (error) {
    const stale = stored ?? (await readStored(version));
    if (!stale) throw error;
    cachedMeta = { ...stale, version };
    return stale;
  }
}

// Same one-slot reasoning again: this holds a full deprecated/legacy map over
// every entry, so it is kept for one (version, entry count) combination only.
let memoryMeta: { key: string; meta: MetaIndex } | null = null;

export async function ensureMeta(
  entries: DocEntry[],
  version: string,
  force = false,
): Promise<MetaIndex> {
  const stored = await ensureStored(version, force);
  const cacheKey = `${version}:${stored.fetchedAt}:${entries.length}`;
  if (!force && memoryMeta?.key === cacheKey) return memoryMeta.meta;

  const deprecated = new Set(stored.deprecated);

  const meta: MetaIndex = {};
  for (const entry of entries) {
    const isDeprecated = deprecated.has(`${entry.page}|${entry.anchor}`);
    const isLegacyScheduler = entry.pkg === "org.bukkit.scheduler";
    if (isDeprecated || isLegacyScheduler)
      meta[entry.name] = {
        deprecated: isDeprecated,
        legacyScheduler: isLegacyScheduler,
      };
  }

  memoryMeta = { key: cacheKey, meta };
  return meta;
}
