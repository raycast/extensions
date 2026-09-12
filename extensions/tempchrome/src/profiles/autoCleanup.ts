import { LocalStorage } from "@raycast/api";
import { getChromiumProcessArgs, isProfileInUse } from "../chromium/processes";
import { removePath } from "../utils/fs";
import { reportError } from "../utils/reportError";

const AUTO_CLEANUP_REGISTRY_KEY = "tempchrome.auto-cleanup-registry";

export type Registry = Record<string, number>;

async function readRegistryInternal(): Promise<Registry> {
  const raw = await LocalStorage.getItem<string>(AUTO_CLEANUP_REGISTRY_KEY);
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Registry;
    }
    return {};
  } catch {
    return {};
  }
}

export async function readRegistry(): Promise<Registry> {
  return readRegistryInternal();
}

// Serializes all mutations of the registry through a single in-module promise
// chain, so two concurrent callers (e.g. two rapid Quick Launches) cannot
// stomp each other's writes via a read-modify-write TOCTOU race. The
// .catch fallback keeps the chain alive after a rejecting link.
let writeChain: Promise<Registry> = Promise.resolve({});

export async function updateRegistry(mutator: (current: Registry) => Registry): Promise<Registry> {
  const next = writeChain.then(async () => {
    const current = await readRegistryInternal();
    const updated = mutator(current);
    await LocalStorage.setItem(AUTO_CLEANUP_REGISTRY_KEY, JSON.stringify(updated));
    return updated;
  });
  writeChain = next.catch(() => readRegistryInternal());
  return next;
}

export async function markForAutoCleanup(profilePath: string): Promise<void> {
  await updateRegistry((current) => ({ ...current, [profilePath]: Date.now() }));
}

export async function unmarkAutoCleanup(profilePath: string): Promise<void> {
  await updateRegistry((current) => {
    const next = { ...current };
    delete next[profilePath];
    return next;
  });
}

let inFlightSweep: Promise<string[]> | null = null;

export async function sweepStaleProfiles(): Promise<string[]> {
  if (inFlightSweep) {
    return inFlightSweep;
  }
  inFlightSweep = performSweep().finally(() => {
    inFlightSweep = null;
  });
  return inFlightSweep;
}

async function performSweep(): Promise<string[]> {
  const registry = await readRegistryInternal();
  const registeredPaths = Object.keys(registry);
  if (registeredPaths.length === 0) {
    return [];
  }

  const psLines = await getChromiumProcessArgs();
  const stalePaths = registeredPaths.filter((candidate) => !isProfileInUse(candidate, psLines));
  const removed: string[] = [];

  for (const stalePath of stalePaths) {
    try {
      await removePath(stalePath);
      removed.push(stalePath);
    } catch (error) {
      await reportError("Auto-cleanup failed to remove a profile", error);
    }
  }

  if (removed.length > 0) {
    const removedSet = new Set(removed);
    await updateRegistry((current) => {
      const next = { ...current };
      for (const removedPath of removedSet) {
        delete next[removedPath];
      }
      return next;
    });
  }
  return removed;
}

export function runSweepFireAndForget(): void {
  sweepStaleProfiles().catch((error) => {
    void reportError("Auto-cleanup sweep failed", error);
  });
}
