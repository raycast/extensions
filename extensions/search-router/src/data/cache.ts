import { environment, Cache } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { searchEngines } from "./search-engines";
import { SearchEngine } from "../types";

const config = {
  namespace: environment.extensionName,
  cacheKey: "defaultSearchEngine",
  defaultSearchEngine: searchEngines.find((engine) => engine.t === "g"),
};

const cache = new Cache({
  namespace: config.namespace,
});

export const getDefaultSearchEngine = () => {
  const cacheValue = cache.get(config.cacheKey);
  return cacheValue ? (JSON.parse(cacheValue) as SearchEngine) : config.defaultSearchEngine;
};

export const useDefaultSearchEngine = () => {
  return useCachedState(config.cacheKey, config.defaultSearchEngine, {
    cacheNamespace: config.namespace,
  });
};
