import { Cache } from "@raycast/api";

export const clearCache = async () => {
  const cache = new Cache();
  cache.clear();
};
