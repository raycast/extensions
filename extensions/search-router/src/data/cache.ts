import { environment, Cache } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { builtinSearchEngines } from "./builtin-search-engines";
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

export const getDefaultSearchEngine = () => {
  const cacheValue = cache.get(config.cacheKey);
  if (cacheValue) {
    const savedEngine = JSON.parse(cacheValue) as SearchEngine;
    // Check if the saved engine still exists (in case it was a custom engine that got deleted)
    const customEngines = getCustomSearchEngines();
    const existsInCustom = customEngines.some((engine) => engine.t === savedEngine.t);
    const existsInBuiltIn = builtinSearchEngines.some((engine) => engine.t === savedEngine.t);

    if (existsInCustom || existsInBuiltIn) {
      return savedEngine;
    }
  }
  return config.defaultSearchEngine;
};

export const useDefaultSearchEngine = () => {
  return useCachedState(config.cacheKey, config.defaultSearchEngine, {
    cacheNamespace: config.namespace,
  });
};
