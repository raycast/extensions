import { environment, Cache } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { builtinSearchEngines } from "./builtin-search-engines";
import { getSearchEngine } from "./search-engines";
import type { SearchEngine } from "../types";

const config = {
  namespace: environment.extensionName,
  cacheKey: "defaultSearchEngine",
  defaultSearchEngine: builtinSearchEngines.find((engine) => engine.t === "g"),
};

const cache = new Cache({
  namespace: config.namespace,
});

export const getDefaultSearchEngine = () => {
  const cacheValue = cache.get(config.cacheKey);
  if (cacheValue) {
    const savedEngine = JSON.parse(cacheValue) as SearchEngine;
    const currentEngine = getSearchEngine(savedEngine.t);
    if (currentEngine) return currentEngine;
  }
  return getSearchEngine(config.defaultSearchEngine?.t);
};

export const useDefaultSearchEngine = () => {
  return useCachedState(config.cacheKey, config.defaultSearchEngine, {
    cacheNamespace: config.namespace,
  });
};
