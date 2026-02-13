import { Cache, LocalStorage } from "@raycast/api";
import { ProviderResult } from "./types";

const SELECTED_PROVIDER_KEY = "menu-bar-selected-provider";
const PROVIDER_ORDER_KEY = "provider-order";
const cache = new Cache();

export const getSelectedMenuBarProvider = (): string | undefined => cache.get(SELECTED_PROVIDER_KEY) || undefined;

export const setSelectedMenuBarProvider = (providerId: string): void => {
  cache.set(SELECTED_PROVIDER_KEY, providerId);
  LocalStorage.setItem(SELECTED_PROVIDER_KEY, providerId);
};

export const getProviderOrder = (): string[] | undefined => {
  const raw = cache.get(PROVIDER_ORDER_KEY);
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) && parsed.every((x) => typeof x === "string") ? (parsed as string[]) : undefined;
  } catch {
    return undefined;
  }
};

export const setProviderOrder = (providerIds: string[]): void => {
  const json = JSON.stringify(providerIds);
  cache.set(PROVIDER_ORDER_KEY, json);
  LocalStorage.setItem(PROVIDER_ORDER_KEY, json);
};

export const hydratePreferencesFromStorage = async (): Promise<void> => {
  const keys = [SELECTED_PROVIDER_KEY, PROVIDER_ORDER_KEY] as const;
  for (const key of keys) {
    if (!cache.get(key)) {
      const stored = await LocalStorage.getItem<string>(key);
      if (stored) cache.set(key, stored);
    }
  }
};

export const reorderProviders = (data: ProviderResult[] | undefined, order: string[] | undefined): ProviderResult[] => {
  if (!data?.length) return data ?? [];
  if (!order?.length) return data;
  const byId = new Map(data.map((r) => [r.id, r]));
  const ordered: ProviderResult[] = [];
  for (const id of order) {
    const r = byId.get(id);
    if (r) ordered.push(r);
  }
  for (const r of data) {
    if (!order.includes(r.id)) ordered.push(r);
  }
  return ordered;
};
