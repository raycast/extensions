import type { RouteBase, RouteRaw } from "@/api";

export type Route = {
  id: string;
  number: string;
  name: string;
  type: RouteType;
  direction: RouteDirection;
  times: string[];
  stopIds: string[];
};

export type RouteDirection = "a-b" | "b-a";
export type RouteType = "bus" | "tram";

const normalizeRoutes = (rawRoutes: RouteRaw[]) => {
  const normalizedRoutes: (RouteBase & { times: string })[] = [];

  for (let i = 0; i < rawRoutes.length; i += 1) {
    const rawRoute = rawRoutes[i];

    if (!("RouteName" in rawRoute) || rawRoute.RouteName === "") {
      continue;
    }

    const rawRouteTime = rawRoutes[++i];

    if (!rawRouteTime || "RouteName" in rawRouteTime) {
      continue;
    }

    if (!rawRoute.RouteNum && normalizedRoutes.length > 0) {
      rawRoute.RouteNum = normalizedRoutes[normalizedRoutes.length - 1].RouteNum;
    }
    if (!rawRoute.Transport && normalizedRoutes.length > 0) {
      rawRoute.Transport = normalizedRoutes[normalizedRoutes.length - 1].Transport;
    }

    normalizedRoutes.push({ ...rawRoute, times: rawRouteTime.RouteNum });
  }

  return normalizedRoutes;
};

export const extractAllRoutes = (rawRoutes: RouteRaw[]) => {
  const normalizedRoutes = normalizeRoutes(rawRoutes);

  const routes: Route[] = [];
  const relevantStopIds = new Set<string>();

  for (const normalizedRoute of normalizedRoutes) {
    if (!["bus", "tram"].includes(normalizedRoute.Transport) || !["a-b", "b-a"].includes(normalizedRoute.RouteType)) {
      continue;
    }

    const stopIds = normalizedRoute.RouteStops.split(",");

    for (const stopId of stopIds) {
      relevantStopIds.add(stopId);
    }

    routes.push({
      id: `${normalizedRoute.RouteNum}-${normalizedRoute.RouteName}`,
      number: normalizedRoute.RouteNum,
      name: normalizedRoute.RouteName,
      type: normalizedRoute.Transport as RouteType,
      direction: normalizedRoute.RouteType as RouteDirection,
      times: normalizedRoute.times.split(","),
      stopIds,
    });
  }

  return {
    routes,
    relevantStopIds,
  };
};
