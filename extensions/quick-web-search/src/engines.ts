import { Icon, Image, LocalStorage } from "@raycast/api";
import { getFavicon, useLocalStorage } from "@raycast/utils";

export interface Engine {
  id: string;
  title: string;
  homepage: string;
  icon: Image.ImageLike;
  searchUrl: (query: string) => string;
  suggestUrl: (query: string) => string;
  isCustom?: boolean;
  rawSearchUrl?: string;
  rawSuggestUrl?: string;
}

export interface CustomEngineData {
  id: string;
  title: string;
  searchUrl: string;
  suggestUrl?: string;
}

const CUSTOM_ENGINES_KEY = "custom-engines";

export function formatEngineUrl(urlTemplate: string, query: string): string {
  const encoded = encodeURIComponent(query);
  if (urlTemplate.includes("{query}")) {
    return urlTemplate.replaceAll("{query}", encoded);
  }
  if (urlTemplate.includes("%s")) {
    return urlTemplate.replaceAll("%s", encoded);
  }
  return urlTemplate + encoded;
}

export function extractHomepage(url: string): string {
  try {
    const cleaned = url.replace(/\{query\}|%s/g, "");
    const parsed = new URL(cleaned);
    return parsed.origin;
  } catch {
    return url;
  }
}

export function createCustomEngine(data: CustomEngineData): Engine {
  const homepage = extractHomepage(data.searchUrl);
  return {
    id: data.id,
    title: data.title,
    homepage,
    icon: getFavicon(homepage, { fallback: Icon.Globe, mask: Image.Mask.Circle }),
    searchUrl: (query: string) => formatEngineUrl(data.searchUrl, query),
    suggestUrl: (query: string) =>
      data.suggestUrl && data.suggestUrl.trim().length > 0
        ? formatEngineUrl(data.suggestUrl, query)
        : googleSuggestUrl(query),
    isCustom: true,
    rawSearchUrl: data.searchUrl,
    rawSuggestUrl: data.suggestUrl,
  };
}

export async function getStoredCustomEngines(): Promise<CustomEngineData[]> {
  const raw = await LocalStorage.getItem<string>(CUSTOM_ENGINES_KEY);
  if (typeof raw !== "string") {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CustomEngineData[]) : [];
  } catch {
    return [];
  }
}

export function useCustomEngines() {
  const { value, setValue, isLoading } = useLocalStorage<CustomEngineData[]>(CUSTOM_ENGINES_KEY, []);
  const customData = value ?? [];

  async function addCustomEngine(data: Omit<CustomEngineData, "id">): Promise<void> {
    const current = await getStoredCustomEngines();
    const newEngine: CustomEngineData = {
      id: `custom-${Date.now()}`,
      ...data,
    };
    await setValue([...current, newEngine]);
  }

  async function updateCustomEngine(id: string, data: Omit<CustomEngineData, "id">) {
    const current = await getStoredCustomEngines();
    const next = current.map((item) => (item.id === id ? { ...item, ...data } : item));
    await setValue(next);
  }

  async function removeCustomEngine(id: string) {
    const current = await getStoredCustomEngines();
    const next = current.filter((item) => item.id !== id);
    await setValue(next);
  }

  const customEngines: Engine[] = customData.map(createCustomEngine);
  const engines: Engine[] = [...ENGINES, ...customEngines];

  return {
    engines,
    customEngines,
    customEnginesData: customData,
    isLoading,
    addCustomEngine,
    updateCustomEngine,
    removeCustomEngine,
  };
}

function defineEngine(def: Omit<Engine, "icon"> & { icon?: string }): Engine {
  return {
    ...def,
    icon: def.icon
      ? { source: def.icon, fallback: Icon.MagnifyingGlass }
      : getFavicon(def.homepage, { fallback: Icon.MagnifyingGlass, mask: Image.Mask.Circle }),
  };
}

function googleSuggestUrl(query: string): string {
  return `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`;
}

// Keep ids and titles in sync with package.json: the `defaultEngine`
// preference `data` entries and the engine names mentioned in the extension
// and command descriptions. The manifest is static JSON, so it cannot import
// this registry.
//
// Perplexity has no public suggestion endpoint, so it reuses
// Google's generic suggestions. All endpoints below are keyless and unauthenticated.
export const ENGINES: Engine[] = [
  defineEngine({
    id: "google",
    title: "Google",
    homepage: "https://www.google.com",
    icon: "google.png",
    searchUrl: (query) => `https://www.google.com/search?q=${encodeURIComponent(query)}`,
    suggestUrl: googleSuggestUrl,
  }),
  defineEngine({
    id: "google-ai",
    title: "Google AI Mode",
    homepage: "https://www.google.com",
    icon: "google-ai-mode.png",
    // AI Mode results page; the query must be plus-encoded, e.g.
    // https://www.google.com/search?q=what+is+the+meaning+of+life&udm=50
    searchUrl: (query) => `https://www.google.com/search?${new URLSearchParams({ q: query })}&udm=50`,
    suggestUrl: googleSuggestUrl,
  }),
  defineEngine({
    id: "perplexity",
    title: "Perplexity",
    homepage: "https://www.perplexity.ai",
    icon: "perplexity.png",
    searchUrl: (query) => `https://www.perplexity.ai/search?q=${encodeURIComponent(query)}`,
    suggestUrl: googleSuggestUrl,
  }),
  defineEngine({
    id: "bing",
    title: "Bing",
    homepage: "https://www.bing.com",
    icon: "bing.png",
    searchUrl: (query) => `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
    suggestUrl: googleSuggestUrl,
  }),
  defineEngine({
    id: "duckduckgo",
    title: "DuckDuckGo",
    homepage: "https://duckduckgo.com",
    icon: "duckduckgo.png",
    searchUrl: (query) => `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
    suggestUrl: (query) => `https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&type=list`,
  }),
  defineEngine({
    id: "youtube",
    title: "YouTube",
    homepage: "https://www.youtube.com",
    icon: "youtube.png",
    searchUrl: (query) => `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
    suggestUrl: (query) =>
      `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(query)}`,
  }),
];

export function getEngine(id: string | undefined, availableEngines: Engine[] = ENGINES): Engine {
  return availableEngines.find((engine) => engine.id === id) ?? availableEngines[0] ?? ENGINES[0];
}

// The dropdown's storeValue storage is not readable by code, so the selection
// is mirrored here for the instant fallback path.
export const LAST_ENGINE_KEY = "last-engine";

export async function rememberEngine(id: string): Promise<void> {
  await LocalStorage.setItem(LAST_ENGINE_KEY, JSON.stringify(id));
}

export async function getAllEngines(): Promise<Engine[]> {
  const customList = await getStoredCustomEngines();
  return [...ENGINES, ...customList.map(createCustomEngine)];
}

export async function getLastEngine(fallbackId: string): Promise<Engine> {
  const raw = await LocalStorage.getItem<string>(LAST_ENGINE_KEY);
  let targetId: string = fallbackId;
  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw);
      targetId = typeof parsed === "string" ? parsed : raw;
    } catch {
      targetId = raw;
    }
  }
  const allEngines = await getAllEngines();

  return (
    allEngines.find((engine) => engine.id === targetId) ??
    allEngines.find((engine) => engine.id === fallbackId) ??
    ENGINES[0]
  );
}

// Google and DuckDuckGo (`type=list`) both return the OpenSearch suggestion
// shape `["query", ["suggestion", ...]]`, but Google responds with
// `text/html; charset=ISO-8859-1`, so the body is decoded from the declared
// charset (bare or quoted token) instead of assuming JSON/UTF-8. Any failure
// degrades to an empty list — the plain "search for what you typed" row must
// keep working offline.
export async function parseSuggestions(response: Response): Promise<string[]> {
  if (!response.ok) {
    return [];
  }
  try {
    const charset = /charset="?([\w-]+)/i.exec(response.headers.get("content-type") ?? "")?.[1] ?? "utf-8";
    const buffer = await response.arrayBuffer();
    let text: string;
    try {
      text = new TextDecoder(charset).decode(buffer);
    } catch {
      text = new TextDecoder().decode(buffer);
    }
    const parsed: unknown = JSON.parse(text);
    if (Array.isArray(parsed) && Array.isArray(parsed[1])) {
      const suggestions = parsed[1].filter((item): item is string => typeof item === "string" && item.length > 0);
      return [...new Set(suggestions)];
    }
    return [];
  } catch {
    return [];
  }
}
