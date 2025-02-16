import { dryrun } from "@permaweb/aoconnect";
import { ARIO, AoGatewayWithAddress } from "@ar.io/sdk";
import { LocalStorage } from "@raycast/api";

// Constants
// const TOP_GATEWAY_LIMIT = 25;
// const EMA_ALPHA = 0.2; // Smoothing factor for exponential moving average
const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds
// const LOCK_TIMEOUT = 30 * 1000; // 30 seconds lock timeout

interface GatewayPerformance {
  fqdn: string;
  avgResponseTime: number;
  failures: number;
  successCount: number;
  lastChecked: number;
  healthy: boolean;
}

// interface GatewayPerformanceMap {
//   [fqdn: string]: GatewayPerformance;
// }

interface RecordData {
  transactionId: string;
  ttlSeconds: number;
}

interface RecordsResponse {
  [key: string]: RecordData;
}

// Add cache interfaces and constants
interface GatewayCache {
  bestGateway: string;
  sortedGateways: GatewayPerformance[];
  lastUpdated: number;
}

interface ResourceAvailabilityCache {
  [key: string]: {
    available: boolean;
    lastChecked: number;
  };
}

const GATEWAY_CACHE_KEY = "gateway_cache";
const RESOURCE_CACHE_KEY = "resource_cache";
const GATEWAY_CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const RESOURCE_CACHE_TTL = 60 * 60 * 1000; // 1 hour

let memoryGatewayCache: GatewayCache | null = null;
let memoryResourceCache: ResourceAvailabilityCache = {};

/**
 * Check if a gateway is healthy
 */
async function checkGatewayHealth(fqdn: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      HEALTH_CHECK_TIMEOUT,
    );

    const response = await fetch(`https://${fqdn}`, {
      method: "HEAD",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Test gateway performance and return performance metrics
 */
async function testGatewayPerformance(
  gateway: AoGatewayWithAddress,
): Promise<GatewayPerformance> {
  const start = performance.now();
  const fqdn = gateway.settings.fqdn;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      HEALTH_CHECK_TIMEOUT,
    );

    const response = await fetch(`https://${fqdn}`, {
      method: "HEAD",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseTime = performance.now() - start;
    return {
      fqdn,
      healthy: response.ok,
      avgResponseTime: responseTime,
      failures: response.ok ? 0 : 1,
      successCount: response.ok ? 1 : 0,
      lastChecked: Date.now(),
    };
  } catch {
    return {
      fqdn,
      healthy: false,
      avgResponseTime: Infinity,
      failures: 1,
      successCount: 0,
      lastChecked: Date.now(),
    };
  }
}

/**
 * Acquire a lock for performance checks
 */
// async function acquirePerformanceLock(): Promise<boolean> {
//     const currentLock = await LocalStorage.getItem<number>("performanceLock");
//     const now = Date.now();

//     // If there's a lock and it hasn't expired
//     if (currentLock && now - currentLock < LOCK_TIMEOUT) {
//         return false;
//     }

//     // Set the lock
//     await LocalStorage.setItem("performanceLock", now);
//     return true;
// }

// /**
//  * Release the performance check lock
//  */
// async function releasePerformanceLock() {
//     await LocalStorage.removeItem("performanceLock");
// }

// /**
//  * Force a complete refresh of gateway performance data
//  */
// async function forceGatewayRefresh(): Promise<GatewayPerformanceMap> {
//     try {
//         const arIO = ARIO.init();
//         const gatewaysResult = await arIO.getGateways();

//         if (!gatewaysResult?.items?.length) {
//             return {};
//         }

//         const stored = await LocalStorage.getItem<string>("gatewayPerformance");
//         const storedPerformance: GatewayPerformanceMap = stored
//             ? JSON.parse(stored)
//             : {};

//         const results = await Promise.all(
//             gatewaysResult.items.map((gateway) => testGatewayPerformance(gateway)),
//         );

//         const newPerformanceMap: GatewayPerformanceMap = {};
//         results.forEach((result) => {
//             newPerformanceMap[result.fqdn] = {
//                 ...result,
//                 avgResponseTime: storedPerformance[result.fqdn]
//                     ? EMA_ALPHA * result.avgResponseTime +
//                     (1 - EMA_ALPHA) * storedPerformance[result.fqdn].avgResponseTime
//                     : result.avgResponseTime,
//             };
//         });

//         // Sort just for local usage if needed, but not stored
//         Object.values(newPerformanceMap)
//             .sort((a, b) => a.avgResponseTime - b.avgResponseTime)
//             .slice(0, TOP_GATEWAY_LIMIT);

//         await LocalStorage.setItem(
//             "gatewayPerformance",
//             JSON.stringify(newPerformanceMap),
//         );
//         await LocalStorage.setItem("lastBenchmarkTime", Date.now());
//         await LocalStorage.setItem("lastWeeklyRefresh", Date.now());

//         return newPerformanceMap;
//     } catch {
//         return {};
//     }
// }

/**
 * Check if a specific resource or domain is available from a gateway
 */
async function checkResourceAvailability(
  fqdn: string,
  resourcePath?: string,
): Promise<boolean> {
  if (!resourcePath) {
    return await checkGatewayHealth(fqdn);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      HEALTH_CHECK_TIMEOUT,
    );

    let url: string;
    if (/^[a-zA-Z0-9-_]{43}$/i.test(resourcePath)) {
      const cleanPath = resourcePath.startsWith("/")
        ? resourcePath.slice(1)
        : resourcePath;
      url = `https://${fqdn}/${cleanPath}`;
    } else {
      url = `https://${resourcePath}.${fqdn}`;
    }

    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok && !/^[a-zA-Z0-9-_]{43}$/i.test(resourcePath)) {
      const contentType = response.headers.get("content-type");
      return (
        contentType !== null &&
        (contentType.includes("text/html") ||
          contentType.includes("application/json") ||
          contentType.includes("image/") ||
          contentType.includes("video/") ||
          contentType.includes("audio/"))
      );
    }

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get the gateway cache, either from memory or storage
 */
async function getGatewayCache(): Promise<GatewayCache | null> {
  if (
    memoryGatewayCache &&
    Date.now() - memoryGatewayCache.lastUpdated < GATEWAY_CACHE_TTL
  ) {
    return memoryGatewayCache;
  }

  const cached = await LocalStorage.getItem<string>(GATEWAY_CACHE_KEY);
  if (cached) {
    try {
      const parsedCache = JSON.parse(cached) as GatewayCache;
      if (Date.now() - parsedCache.lastUpdated < GATEWAY_CACHE_TTL) {
        memoryGatewayCache = parsedCache;
        return parsedCache;
      }
    } catch {
      // Invalid cache, will be refreshed
    }
  }

  return null;
}

/**
 * Update the gateway cache with new data
 */
async function updateGatewayCache(cache: GatewayCache) {
  memoryGatewayCache = cache;
  await LocalStorage.setItem(GATEWAY_CACHE_KEY, JSON.stringify(cache));
}

/**
 * Get resource availability from cache
 */
async function getResourceAvailability(
  resourcePath: string,
): Promise<boolean | null> {
  const memoryCached = memoryResourceCache[resourcePath];
  if (
    memoryCached &&
    Date.now() - memoryCached.lastChecked < RESOURCE_CACHE_TTL
  ) {
    return memoryCached.available;
  }

  const cached = await LocalStorage.getItem<string>(RESOURCE_CACHE_KEY);
  if (cached) {
    try {
      const parsedCache = JSON.parse(cached) as ResourceAvailabilityCache;
      const resourceCache = parsedCache[resourcePath];
      if (
        resourceCache &&
        Date.now() - resourceCache.lastChecked < RESOURCE_CACHE_TTL
      ) {
        memoryResourceCache = parsedCache;
        return resourceCache.available;
      }
    } catch {
      // Invalid cache, will be refreshed
    }
  }

  return null;
}

/**
 * Update resource availability cache
 */
async function updateResourceAvailability(
  resourcePath: string,
  available: boolean,
) {
  const now = Date.now();
  memoryResourceCache[resourcePath] = { available, lastChecked: now };

  try {
    const cached = await LocalStorage.getItem<string>(RESOURCE_CACHE_KEY);
    const existingCache = cached
      ? (JSON.parse(cached) as ResourceAvailabilityCache)
      : {};
    existingCache[resourcePath] = { available, lastChecked: now };
    await LocalStorage.setItem(
      RESOURCE_CACHE_KEY,
      JSON.stringify(existingCache),
    );
  } catch {
    // If storage update fails, at least we have memory cache
  }
}

// Modify getBestGateway to use the new caching system
export async function getBestGateway(resourcePath?: string): Promise<string> {
  try {
    // Try to get from cache first
    const gatewayCache = await getGatewayCache();
    if (gatewayCache) {
      // If we have a resource path, check its availability
      if (resourcePath) {
        const resourceAvailable = await getResourceAvailability(resourcePath);
        if (resourceAvailable !== null) {
          return gatewayCache.bestGateway;
        }
      } else {
        return gatewayCache.bestGateway;
      }
    }

    // If no cache or cache invalid, perform gateway selection
    const arIO = ARIO.init();
    const gatewaysResult = await arIO.getGateways();

    if (!gatewaysResult?.items?.length) {
      return "arweave.net";
    }

    // Take top gateways
    const topGateways = gatewaysResult.items.slice(0, 10);
    const results = await Promise.all(
      topGateways.map((gateway) => testGatewayPerformance(gateway)),
    );

    // Sort by performance and filter healthy gateways
    const sortedGateways = results
      .filter((result) => result.healthy)
      .sort((a, b) => a.avgResponseTime - b.avgResponseTime);

    if (sortedGateways.length === 0) {
      return "arweave.net";
    }

    const bestGateway = sortedGateways[0].fqdn;

    // Update cache
    await updateGatewayCache({
      bestGateway,
      sortedGateways,
      lastUpdated: Date.now(),
    });

    // If we have a resource path, check and cache its availability
    if (resourcePath) {
      const available = await checkResourceAvailability(
        bestGateway,
        resourcePath,
      );
      await updateResourceAvailability(resourcePath, available);
    }

    return bestGateway;
  } catch {
    return "arweave.net";
  }
}

export async function getUndernames(
  processId: string,
): Promise<Array<{ name: string; transactionId: string }>> {
  try {
    // Use dryrun to simulate the Records request
    const result = await dryrun({
      process: processId,
      tags: [{ name: "Action", value: "Records" }],
    });

    if (!result.Messages || result.Messages.length === 0) {
      throw new Error("No response received from Records request");
    }

    // Get the last message which should contain our records
    const lastMessage = result.Messages[result.Messages.length - 1];

    // Parse the response data
    const recordsData = JSON.parse(lastMessage.Data) as RecordsResponse;

    // Convert the records into an array of name/transactionId pairs
    // Filter out special characters and only include valid names
    const records = Object.entries(recordsData)
      .filter(([key]) => /^[a-zA-Z0-9-]+$/.test(key))
      .map(([key, value]) => ({
        name: key,
        transactionId: value.transactionId,
      }));

    return records;
  } catch {
    throw new Error("Failed to fetch undernames");
  }
}

/**
 * Convert an ar:// style URL to a routable gateway URL
 */
export async function getRoutableUrl(
  arUrl: string,
  gateway: string,
  isUndername = false,
  parentName?: string,
): Promise<string> {
  // Clean the gateway URL
  const cleanGateway = gateway.replace(/^https?:\/\//, "").replace(/\/$/, "");

  // Handle transaction IDs (43 characters, alphanumeric)
  if (/^[a-zA-Z0-9-_]{43}$/i.test(arUrl)) {
    return `https://${cleanGateway}/${arUrl}`;
  }

  // Handle undernames (using underscore format)
  if (isUndername && parentName) {
    return `https://${arUrl}_${parentName}.${cleanGateway}`;
  }

  // Handle ArNS names (using subdomain format)
  return `https://${arUrl}.${cleanGateway}`;
}
