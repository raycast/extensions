import { getPreferenceValues } from "@raycast/api";

import { adapters as builtinAdapters } from "./adapters";
import { loadExternalAdapters } from "./registry/load-external-adapters";
import type { AdapterStatus, CliPathOverrides, PasswordManagerAdapter } from "./types";
import { wrapAdapterWithAutoUnlock } from "./utils/adapter-auto-unlock";
import { resolveBinary } from "./utils/cli";

export function adapterNeedsAuth(status: AdapterStatus): boolean {
  return status.ok === false && status.needsAuth === true;
}

export function isAdapterSelectable(status: AdapterStatus): boolean {
  return status.ok === true || adapterNeedsAuth(status);
}

let adapterCache: PasswordManagerAdapter[] | undefined;

export async function loadAdapters(): Promise<PasswordManagerAdapter[]> {
  if (adapterCache) {
    return adapterCache;
  }

  const externalAdapters = await loadExternalAdapters();
  const builtinIds = new Set(builtinAdapters.map((adapter) => adapter.id));

  const filteredExternal = externalAdapters.filter((adapter) => {
    if (builtinIds.has(adapter.id)) {
      console.warn(`Skipping external adapter "${adapter.id}": builtin adapter takes precedence`);
      return false;
    }
    return true;
  });

  adapterCache = [...builtinAdapters, ...filteredExternal].map(wrapAdapterWithAutoUnlock);
  return adapterCache;
}

export function getAdapters(): PasswordManagerAdapter[] {
  return adapterCache ?? builtinAdapters;
}

export function getAdapter(id: string): PasswordManagerAdapter | undefined {
  return getAdapters().find((adapter) => adapter.id === id);
}

export function parseCliPathOverrides(raw: string | undefined): CliPathOverrides {
  if (!raw?.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as CliPathOverrides;
    if (typeof parsed !== "object" || parsed === null) {
      return {};
    }
    return parsed;
  } catch {
    return {};
  }
}

export function getCliPathOverride(adapterId: string): string | undefined {
  const preferences = getPreferenceValues<{ cliPathOverrides?: string }>();
  const overrides = parseCliPathOverrides(preferences.cliPathOverrides);
  return overrides[adapterId];
}

export async function checkAdapterAvailability(adapter: PasswordManagerAdapter): Promise<AdapterStatus> {
  if (adapter.kind === "external") {
    try {
      return await adapter.isAvailable();
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error ? error.message : String(error),
      };
    }
  }

  const customPath = getCliPathOverride(adapter.id);
  const binary = await resolveBinary(adapter.cliBinary, customPath);

  if (!binary) {
    const hint = customPath
      ? `Configured path not found: ${customPath}`
      : `CLI "${adapter.cliBinary}" not found. Set path in extension preferences.`;
    return { ok: false, reason: hint };
  }

  return adapter.isAvailable();
}

export async function getAvailableAdapters(): Promise<
  Array<{ adapter: PasswordManagerAdapter; status: AdapterStatus }>
> {
  const allAdapters = await loadAdapters();

  const results = await Promise.all(
    allAdapters.map(async (adapter) => ({
      adapter,
      status: await checkAdapterAvailability(adapter),
    })),
  );

  return results;
}

export function resolveManagerId(
  preferredId: string | undefined,
  availableAdapters: PasswordManagerAdapter[],
  allAdapters: PasswordManagerAdapter[],
): string | undefined {
  const preferred = preferredId?.trim();

  if (!preferred || preferred === "auto") {
    return availableAdapters[0]?.id;
  }

  const normalizedPreferred = preferred.toLowerCase().replace(/[\s_-]+/g, "");

  const matchedAdapter =
    allAdapters.find((adapter) => adapter.id === preferred) ??
    allAdapters.find((adapter) => adapter.id.toLowerCase() === normalizedPreferred) ??
    allAdapters.find((adapter) => adapter.name.toLowerCase().replace(/[\s_-]+/g, "") === normalizedPreferred);

  if (matchedAdapter) {
    return matchedAdapter.id;
  }

  return availableAdapters[0]?.id;
}

export function getDefaultManagerId(availableIds: string[], preferredId?: string): string | undefined {
  const preferences = getPreferenceValues<{ defaultManagerId?: string; defaultManagerOverride?: string }>();
  const override = preferences.defaultManagerOverride?.trim();
  const preferred = override || preferredId || preferences.defaultManagerId;
  const allAdapters = getAdapters();
  const availableAdapters = allAdapters.filter((adapter) => availableIds.includes(adapter.id));
  return resolveManagerId(preferred, availableAdapters, allAdapters);
}
