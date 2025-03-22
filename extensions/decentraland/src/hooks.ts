import { useFetch } from "@raycast/utils";
import { Event, District, DecentralandResponse } from "./types";
import { DECENTRALAND_API_URL, DECENTRALAND_EVENTS_API_URL } from "./constants";

export function useEvents() {
  const { isLoading, data } = useFetch(`${DECENTRALAND_EVENTS_API_URL}/events`, {
    mapResult(result: DecentralandResponse<Event>) {
      return {
        data: result.data,
      };
    },
    initialData: [],
  });
  return { isLoading, events: data };
}

export function useDistricts() {
  const { isLoading, data } = useFetch(`${DECENTRALAND_API_URL}/districts`, {
    mapResult(result: DecentralandResponse<District>) {
      return {
        data: result.data,
      };
    },
    initialData: [],
  });
  return { isLoading, districts: data };
}
