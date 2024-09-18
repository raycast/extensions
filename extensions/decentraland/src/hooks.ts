import { useFetch } from "@raycast/utils";
import { Event, District, DecentralandResponse } from "./types";
import { DECENTRALAND_API_URL, DECENTRALAND_EVENTS_API_URL } from "./constants";

export function useEvents() {
  const { isLoading, data } = useFetch<DecentralandResponse<Event>>(`${DECENTRALAND_EVENTS_API_URL}/events`);
  return { isLoading, events: data?.data };
}

export function useDistricts() {
  const { isLoading, data } = useFetch<DecentralandResponse<District>>(`${DECENTRALAND_API_URL}/districts`);
  return { isLoading, districts: data?.data };
}
