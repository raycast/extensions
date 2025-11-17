import * as fs from "fs";
import { getCacheConfigPath } from "./granolaConfig";

// Memory cache with timestamp for freshness
let cacheData: unknown = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5000; // 5 seconds TTL to balance performance and freshness

function getCache(forceRefresh = false) {
  const now = Date.now();

  // Return cached data if it's still fresh and we're not forcing refresh
  if (!forceRefresh && cacheData && now - cacheTimestamp < CACHE_TTL) {
    return cacheData;
  }

  // Get the platform-specific path to the cache file
  // This cache file is how Granola keeps your data secure
  // It stores your content on your machine, and not on Granola's servers
  const filePath = getCacheConfigPath();

  // Read and parse the local JSON file
  const fileContent = fs.readFileSync(filePath, "utf8");
  const jsonData = JSON.parse(fileContent);

  // Get the cache data, parsing it only if it's a string
  const data = typeof jsonData.cache === "string" ? JSON.parse(jsonData.cache) : jsonData.cache;

  if (!data) {
    throw new Error(
      "Unable to find your local Granola data. Make sure Granola is installed, running, and that you are logged in to the application.",
    );
  }

  // Update memory cache
  cacheData = data;
  cacheTimestamp = now;

  return data;
}

export default getCache;
