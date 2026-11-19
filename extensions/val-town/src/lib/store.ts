import { listOrgs, readBlob, storeBlob, type BlobStorage } from "./api";
import { cacheState } from "./cache";
import { McpError } from "./mcp";

const STATE_KEY = "raycast:tools.json";

const STATE_VERSION = 7;

export type JsonSchema = {
  type?: string;
  properties?: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
};

/** Membership only. How to call a val lives in that val's own blob, so it travels with the val. */
type ToolEntry = {
  val: string;
  addedAt: string;
};

export type ExtensionState = {
  version: typeof STATE_VERSION;
  /** Keyed by `handle/valName`. This key set is the collection: nothing else decides membership. */
  tools: Record<string, ToolEntry>;
};

function emptyState(): ExtensionState {
  return {
    version: STATE_VERSION,
    tools: {},
  };
}

let cachedHandle: string | null = null;

async function personalHandle(signal?: AbortSignal): Promise<string> {
  if (cachedHandle) return cachedHandle;
  const { user, orgs } = await listOrgs(signal);
  const handle = orgs.find((org) => org.isPersonal)?.handle ?? user.handle;
  cachedHandle = handle;
  return handle;
}

/** LocalStorage is device-local, and a free-tier account can only create public vals. */
async function stateStorage(signal?: AbortSignal): Promise<BlobStorage> {
  return { type: "deprecated_global", org: await personalHandle(signal) };
}

/** Caches on the way through, so the next command run paints before this call finishes. */
export async function loadState(signal?: AbortSignal): Promise<ExtensionState> {
  const state = await fetchState(signal);
  cacheState(state);
  return state;
}

async function fetchState(signal?: AbortSignal): Promise<ExtensionState> {
  const storage = await stateStorage(signal);

  let raw: string | undefined;
  try {
    raw = (await readBlob(storage, STATE_KEY, signal)).content;
  } catch (error) {
    // Swallowing anything but a missing blob would report a rejected token as an empty collection.
    if (error instanceof McpError && /not found/i.test(error.message)) return emptyState();
    throw error;
  }
  if (!raw) return emptyState();

  try {
    return normalizeState(JSON.parse(raw) as Record<string, unknown>);
  } catch {
    // Never an empty state: the next mutation would save it and wipe the real collection.
    throw new Error(
      "Your Val Town extension state (raycast:tools.json) is not valid JSON. Fix or delete it on val.town.",
    );
  }
}

type LegacyEntry = { val?: string; addedAt?: string | null; derivedAt?: string | null };

/**
 * Brings any stored or cached shape up to the current version. Every cache in the extension is keyed
 * on something that survives a shape change — `useCachedPromise` hashes the function's source, not
 * the type — so a value read from one has to be normalized before it is trusted, not just parsed.
 *
 * Earlier versions also cached a spec derived from each val's README. Only the key set survives.
 */
export function normalizeState(stored: Record<string, unknown>): ExtensionState {
  const base = emptyState();
  const storedTools = (stored.tools ?? {}) as Record<string, LegacyEntry>;

  return {
    ...base,
    tools: Object.fromEntries(
      Object.entries(storedTools).map(([identifier, entry]) => [
        identifier,
        { val: entry.val ?? identifier, addedAt: entry.addedAt ?? entry.derivedAt ?? new Date(0).toISOString() },
      ]),
    ),
  };
}

async function saveState(state: ExtensionState): Promise<void> {
  const storage = await stateStorage();
  await storeBlob(storage, STATE_KEY, JSON.stringify(state));
  // Only after the write lands, so a failed save does not leave the cache claiming it succeeded.
  cacheState(state);
}

export async function mutateState(mutate: (state: ExtensionState) => ExtensionState): Promise<ExtensionState> {
  const next = mutate(await loadState());
  await saveState(next);
  return next;
}
