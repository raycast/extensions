import { useCachedPromise, useFetch } from "@raycast/utils";
import {
  getGeoContentBrief,
  getGeoDashboard,
  getGeoTrafficJourney,
  getNotraRequestInit,
  NOTRA_API_URL,
} from "../lib/notra";
import type { ListGeoProjectsResponse } from "../types/geo";

export function useGeoProjects() {
  return useFetch<ListGeoProjectsResponse, ListGeoProjectsResponse, ListGeoProjectsResponse>(
    `${NOTRA_API_URL}/v1/projects`,
    {
      ...getNotraRequestInit(),
      initialData: {
        organization: { id: "", logo: null, name: "", slug: "" },
        projects: [],
      },
      mapResult(result) {
        return { data: result };
      },
    },
  );
}

export function useGeoDashboard(projectId: string, days: number) {
  return useCachedPromise(getGeoDashboard, [projectId, days]);
}

export function useGeoContentBrief(projectId: string, briefId: string) {
  return useCachedPromise(getGeoContentBrief, [projectId, briefId]);
}

export function useGeoTrafficJourney(projectId: string, journeyId: string, days: number) {
  return useCachedPromise(getGeoTrafficJourney, [projectId, journeyId, days]);
}
