import type { ActionOrGroup, RootConfig } from "./types";

interface BrowserValueObject {
  value?: unknown;
  path?: unknown;
}

export function normalizeBrowserValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  if (!value || typeof value !== "object") {
    return undefined;
  }

  const objectValue = value as BrowserValueObject;
  return normalizeBrowserValue(objectValue.value ?? objectValue.path);
}

export function normalizeConfigBrowserValues(config: RootConfig): RootConfig {
  const normalized = structuredClone(config);

  function normalizeItem(item: ActionOrGroup) {
    const browser = normalizeBrowserValue(item.browser);
    if (browser) {
      item.browser = browser;
    } else {
      delete item.browser;
    }

    if (item.type === "group") {
      item.actions.forEach(normalizeItem);
    }
  }

  normalized.actions.forEach(normalizeItem);
  return normalized;
}
