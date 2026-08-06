import { readRemoteFile, safeWriteRemoteFile } from "./files";
import { extractOutboundTags, tryParseJson } from "./json";
import {
  createRaycastCategory,
  detectInboundTags,
  entryTypesForField,
  existingValuesInCategory,
  findRaycastCategory,
  insertDomainsIntoCategory,
  normalizerForEntryType,
  parseRoutingCategories,
  splitInputs,
  type EntryType,
  type RoutingCategory,
} from "./routing";
import { getPaths, getProxyTagPref } from "./utils";

// === Quick Add: shared pipeline used by the QuickAddForm UI and AI tools ===

const DEFAULT_PROXY_TAG = "vless-reality";
const NON_PROXY_OUTBOUND_TAGS = new Set(["direct", "block", "blackhole", "dns-out", "dns"]);

export type QuickAddResult = {
  added: number;
  skippedDuplicates: number;
  categoryTitle: string;
  restarted: boolean;
};

export type QuickAddOptions = {
  rawInput: string; // raw input (comma/newline separated)
  entryType: EntryType;
  categoryNumber?: number; // undefined => Raycast category (auto-created if missing)
  // The UI defers the restart on purpose (it surfaces a "restart required"
  // indicator instead), while the AI tool restarts immediately so the change
  // actually takes effect for the requester.
  restartAfterWrite?: boolean;
};

// Determines the outbound tag to use for a newly created Raycast category:
// 1. explicit preference, if set
// 2. first outbound tag from 04_outbounds.json that isn't a known non-proxy tag
// 3. hardcoded fallback
async function resolveProxyTag(configDir: string): Promise<string> {
  const pref = getProxyTagPref();
  if (pref) return pref;
  try {
    const outboundsText = await readRemoteFile(`${configDir}/04_outbounds.json`);
    const tags = extractOutboundTags(outboundsText);
    const candidate = tags.find((t) => !NON_PROXY_OUTBOUND_TAGS.has(t));
    if (candidate) return candidate;
  } catch {
    // Unreadable/missing outbounds file — fall back to the hardcoded default.
  }
  return DEFAULT_PROXY_TAG;
}

// ---------------------------------------------------------------------------
// Reads the routing file, resolves (or auto-creates) the target category,
// normalizes and dedupes the input tokens, inserts the new ones, validates
// the resulting JSON, and writes it back with a "quick-add" backup. Used by
// both QuickAddForm and the add-domains AI tool so the pipeline only lives
// in one place.
// ---------------------------------------------------------------------------

export async function applyQuickAdd(opts: QuickAddOptions): Promise<QuickAddResult> {
  const { configDir } = getPaths();
  const routingPath = `${configDir}/05_routing.json`;

  let text = await readRemoteFile(routingPath);
  let cats = parseRoutingCategories(text);
  let targetCategory: RoutingCategory | null = null;

  if (opts.categoryNumber === undefined) {
    targetCategory = findRaycastCategory(cats);
    if (!targetCategory) {
      const proxyTag = await resolveProxyTag(configDir);
      const inboundTags = detectInboundTags(text) ?? undefined;
      text = createRaycastCategory(text, cats, { proxyTag, inboundTags });
      cats = parseRoutingCategories(text);
      targetCategory = findRaycastCategory(cats);
    }
  } else {
    targetCategory = cats.find((c) => c.number === opts.categoryNumber) ?? null;
  }

  if (!targetCategory) {
    throw new Error("Category not found");
  }

  const allowedTypes = entryTypesForField(targetCategory.field);
  if (!allowedTypes.includes(opts.entryType)) {
    throw new Error(
      `Entry type "${opts.entryType}" is not valid for "${targetCategory.title}" ` +
        `(a ${targetCategory.field}-based category). Allowed types: ${allowedTypes.join(", ")}`,
    );
  }

  const normalizer = normalizerForEntryType(opts.entryType);
  const tokens = splitInputs(opts.rawInput).map(normalizer).filter(Boolean) as string[];

  if (tokens.length === 0) {
    throw new Error("No valid entries");
  }

  const existing = existingValuesInCategory(text, targetCategory);
  const newTokens = tokens.filter((t) => !existing.has(t));
  const skippedDuplicates = tokens.length - newTokens.length;

  if (newTokens.length === 0) {
    throw new Error("Nothing new to add — all entries already exist");
  }

  const updated = insertDomainsIntoCategory(text, targetCategory, newTokens);

  const parsed = tryParseJson(updated);
  if (!parsed.ok) {
    throw new Error(`Result invalid JSON: ${parsed.error}`);
  }

  const restartAfterWrite = opts.restartAfterWrite ?? false;
  await safeWriteRemoteFile(routingPath, updated, { backupTag: "quick-add", restartAfterWrite });

  return {
    added: newTokens.length,
    skippedDuplicates,
    categoryTitle: targetCategory.title,
    restarted: restartAfterWrite,
  };
}
