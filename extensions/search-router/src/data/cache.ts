import { environment, Cache } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { builtinSearchEngines } from "./builtin-search-engines";
import { getPrimarySearchEngine } from "./search-engines";
import { getCustomSearchEngines } from "./custom-search-engines";
import type { SearchEngine } from "../types";

const config = {
  namespace: environment.extensionName,
  cacheKey: "defaultSearchEngine",
  defaultSearchEngine: builtinSearchEngines.find((engine) => engine.t === "g"),
};

const cache = new Cache({
  namespace: config.namespace,
});

// The saved default may name a deleted custom engine, so resolve it the same way searches do.
export const resolveDefaultSearchEngine = (
  savedEngine: SearchEngine | undefined,
  customSearchEngines: SearchEngine[] = getCustomSearchEngines(),
) =>
  getPrimarySearchEngine(savedEngine?.t, customSearchEngines) ??
  getPrimarySearchEngine(config.defaultSearchEngine?.t, customSearchEngines);

export const getDefaultSearchEngine = (customSearchEngines: SearchEngine[] = getCustomSearchEngines()) => {
  const cacheValue = cache.get(config.cacheKey);
  return resolveDefaultSearchEngine(
    cacheValue ? (JSON.parse(cacheValue) as SearchEngine) : undefined,
    customSearchEngines,
  );
};

export const useDefaultSearchEngine = () => {
  return useCachedState(config.cacheKey, config.defaultSearchEngine, {
    cacheNamespace: config.namespace,
  });
};
