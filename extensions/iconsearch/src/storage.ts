import { LocalStorage } from "@raycast/api";
import type { IconSearchIcon } from "./types";

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  const value = await LocalStorage.getItem<string>(key);
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson(key: string, value: unknown): Promise<void> {
  await LocalStorage.setItem(key, JSON.stringify(value));
}

export async function readIconList(key: string): Promise<IconSearchIcon[]> {
  const list = await readJson<unknown[]>(key, []);
  return Array.isArray(list)
    ? list
        .map(normalizeStoredIcon)
        .filter((icon): icon is IconSearchIcon => Boolean(icon))
    : [];
}

function normalizeStoredIcon(value: unknown): IconSearchIcon | undefined {
  if (!value || typeof value !== "object") return undefined;
  const item = value as Partial<IconSearchIcon>;
  if (!item.id || !item.name || !item.library || !item.svgUrl) return undefined;

  return {
    id: String(item.id),
    name: String(item.name),
    displayName: String(item.displayName || item.name),
    library: String(item.library),
    libraryName: String(item.libraryName || item.library),
    npmPackage: item.npmPackage ? String(item.npmPackage) : undefined,
    license: item.license ? String(item.license) : undefined,
    licenseUrl: item.licenseUrl ? String(item.licenseUrl) : undefined,
    legalSafe: item.legalSafe === true,
    sourceUrl: item.sourceUrl ? String(item.sourceUrl) : undefined,
    svgUrl: String(item.svgUrl),
    previewUrls: Array.isArray(item.previewUrls)
      ? item.previewUrls.filter((url): url is string => typeof url === "string")
      : [String(item.svgUrl)],
    reactImport: item.reactImport ? String(item.reactImport) : undefined,
    reactUsage: item.reactUsage ? String(item.reactUsage) : undefined,
    tags: Array.isArray(item.tags)
      ? item.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
  };
}
