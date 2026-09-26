import { getServiceDetails, getServiceStats } from "../api";

type Input = {
  /** The service ID. Resolve a service name to its ID with the get-services tool first. */
  serviceId: string;
};

/**
 * Get traffic stats for a Fastly service over the last 24 hours: requests,
 * cache hits/misses and hit ratio, errors, status code counts, and bandwidth.
 * For Compute services it returns request counts and execution time instead
 * of cache stats.
 */
export default async function ({ serviceId }: Input) {
  const details = await getServiceDetails(serviceId);
  const stats = await getServiceStats(serviceId, details.type, { throwOnError: true });

  const hits = stats.hits || 0;
  const miss = stats.miss || 0;
  const cacheable = hits + miss;

  return {
    service: details.name,
    period: "last 24 hours",
    requests: stats.requests || 0,
    errors: stats.errors || 0,
    status_2xx: stats.status_2xx || 0,
    status_4xx: stats.status_4xx || 0,
    status_5xx: stats.status_5xx || 0,
    ...(details.type?.toLowerCase() === "wasm"
      ? { compute_execution_time_ms: stats.compute_execution_time_ms || 0 }
      : {
          hits,
          misses: miss,
          hit_ratio_percent: cacheable > 0 ? Math.round((hits / cacheable) * 1000) / 10 : null,
          bandwidth_bytes: stats.bandwidth || 0,
        }),
  };
}
