import { getCached, getCachedStale, setCached } from "./cache";
import { CATALOG } from "./catalog";
import { runBatched } from "./pool";
import { providerFor } from "./providers";
import type { Service, ServiceStatus } from "./providers/types";

export interface ServiceState {
  service: Service;
  status?: ServiceStatus;
  error?: string;
}

/**
 * Fetches the requested services (≤5 in flight), turning failures into an `error` field.
 * Callers pass their enabled ids so disabled services aren't fetched; omitting them loads the
 * whole catalog. A fresh (<5 min) cached snapshot is reused so the dashboard and menu bar share
 * fetches; Refresh clears the cache (see `clearCache`) before revalidating to force a network read.
 */
export async function loadAll(serviceIds?: string[]): Promise<ServiceState[]> {
  const services = serviceIds ? CATALOG.filter((service) => serviceIds.includes(service.id)) : CATALOG;
  return runBatched(
    services,
    async (service): Promise<ServiceState> => {
      const cached = await getCached(service.id);
      if (cached) return { service, status: cached };
      try {
        const status = await providerFor(service).getStatus(service);
        await setCached(service.id, status);
        return { service, status };
      } catch (error) {
        // A transient failure shouldn't wipe good data and flash an error: fall back to the last
        // snapshot we ever stored. Only surface an error if this service has never been reachable.
        const stale = await getCachedStale(service.id);
        if (stale) return { service, status: stale };
        return { service, error: error instanceof Error ? error.message : String(error) };
      }
    },
    5,
  );
}
