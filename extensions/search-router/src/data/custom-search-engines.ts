import { environment, Cache } from "@raycast/api";
import type { SearchEngine } from "../types";

const cache = new Cache({
  namespace: environment.extensionName,
});

const CUSTOM_ENGINES_CACHE_KEY = "customSearchEngines";

export const getCustomSearchEngines = (): SearchEngine[] => {
  const cacheValue = cache.get(CUSTOM_ENGINES_CACHE_KEY);
  const engines = cacheValue ? JSON.parse(cacheValue) : [];

  return engines.sort((a: SearchEngine, b: SearchEngine) => a.t.localeCompare(b.t));
};

export const saveCustomSearchEngines = (engines: SearchEngine[]): void => {
  cache.set(CUSTOM_ENGINES_CACHE_KEY, JSON.stringify(engines));
};

export const addCustomSearchEngine = (engine: SearchEngine): void => {
  const engines = getCustomSearchEngines();
  const existingIndex = engines.findIndex((e) => e.t === engine.t);

  if (existingIndex >= 0) {
    engines[existingIndex] = engine;
  } else {
    engines.push(engine);
  }

  saveCustomSearchEngines(engines);
};

export const removeCustomSearchEngine = (trigger: string): void => {
  const engines = getCustomSearchEngines();
  const filteredEngines = engines.filter((e) => e.t !== trigger);
  saveCustomSearchEngines(filteredEngines);
};

export const getCustomSearchEngine = (trigger: string): SearchEngine | undefined => {
  const engines = getCustomSearchEngines();
  return engines.find((e) => e.t === trigger);
};
