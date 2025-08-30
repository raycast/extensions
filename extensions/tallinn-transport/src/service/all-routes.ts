import { fetchRoutes, fetchStops, type RouteRaw, type StopRaw } from "@/api";
import { extractAllRoutes, type Route } from "@/lib/routes";
import { extractAllStops, type Stop } from "@/lib/stops";
import Papa from "papaparse";
import { CacheManager } from "@/utils/cache";

const cache = new CacheManager<{ routes: Route[]; serializedStops: [string, Stop][] }>({ key: "all-routes" });

export const getAllRoutesData = async () => {
  const cachedData = cache.get();

  if (cachedData) {
    const { routes, serializedStops } = cachedData;
    return { routes, stops: new Map(serializedStops) };
  }

  const [routesRaw, stopsRaw] = await Promise.all([fetchRoutes(), fetchStops()]);

  const parsedRoutes = Papa.parse<RouteRaw>(routesRaw, { header: true, delimiter: ";" });
  const parsedStops = Papa.parse<StopRaw>(stopsRaw, { header: true, delimiter: ";" });

  if (!Array.isArray(parsedRoutes.data)) {
    throw new Error("Invalid routes data");
  }
  if (!Array.isArray(parsedStops.data)) {
    throw new Error("Invalid stops data");
  }

  const { routes, relevantStopIds } = extractAllRoutes(parsedRoutes.data);
  const { stops } = extractAllStops(parsedStops.data, relevantStopIds);

  cache.set({ routes, serializedStops: Array.from(stops) });

  return { routes, stops };
};
