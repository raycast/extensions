import fetch, { RequestInit } from "node-fetch";
import { getDepartureQueryDocument, QuayDepartures } from "./departuresQuery";
import { TripQuery, tripsQueryDocument } from "./tripsQuery";
import { Feature, QuayLineFavorites, StopPlaceQuayDeparturesQuery } from "../types";
import { showToast, Toast } from "@raycast/api";

const CLIENT_NAME = "raycast-norwegian-public-transport";

type FeatureResponse = {
  features: Feature[];
};
export async function fetchVenues(
  query: string,
  signal?: AbortSignal,
): Promise<Feature[] | undefined> {
  const params = new URLSearchParams({
    text: query,
    size: "7",
    lang: "no",
    layers: "venue",
  });

  const url = `https://api.entur.io/geocoder/v1/autocomplete?${params.toString()}`;
  console.debug(url);
  const featureResponse = await tryFetch<FeatureResponse>(url, { signal });
  return featureResponse?.features;
}

export async function fetchDepartures(
  stopId: string,
  numberOfDepartures: number,
  favorites: QuayLineFavorites[],
  signal?: AbortSignal,
): Promise<StopPlaceQuayDeparturesQuery | undefined> {
  const departuresQuery = await fetchJourneyPlannerData(getDepartureQueryDocument(favorites), {
    id: stopId,
    numberOfDepartures,
    signal,
  });

  const departures = mapDepartureQueryKeys(departuresQuery, favorites);
  return departures;
}

export async function fetchTrip(
  originId: string,
  destinationId: string,
  pageCursor: string,
  signal?: AbortSignal,
): Promise<TripQuery | undefined> {
  const tripQuery = await fetchJourneyPlannerData<TripQuery>(
    tripsQueryDocument,
    {
      fromPlace: originId,
      toPlace: destinationId,
      pageCursor,
    },
    signal,
  );
  return tripQuery;
}

async function fetchJourneyPlannerData<T>(
  document: string,
  variables: object,
  signal?: AbortSignal,
): Promise<T | undefined> {
  const url = "https://api.entur.io/journey-planner/v3/graphql";
  console.debug(url, JSON.stringify(variables));
  const response = await tryFetch<{ data: T }>(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: document,
      variables,
    }),
    signal,
  });
  return response?.data;
}

function mapDepartureQueryKeys(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any,
  favorites: QuayLineFavorites[],
): StopPlaceQuayDeparturesQuery | undefined {
  if (!data) return;
  const favoriteQuayIds = favorites.map((fav) => fav.quayId);
  const quayDepartures = favoriteQuayIds
    .map((favoriteQuayId) => {
      const key = favoriteQuayId.replaceAll(":", "_");
      if (!Object.keys(data).includes(key)) return;
      return data[key] as QuayDepartures;
    })
    .filter(Boolean) as QuayDepartures[];
  const quaysWithDepartures = quayDepartures.filter((quay) => quay.estimatedCalls.length > 0);
  return {
    stopPlace: data.stopPlace,
    favorites: quaysWithDepartures,
  };
}

async function tryFetch<T>(url: string, options: RequestInit): Promise<T | undefined> {
  try {
    const result = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        "ET-Client-Name": CLIENT_NAME,
      },
    });
    if (result.status !== 200) {
      console.error(result);
      throw new Error("Failed to fetch data");
    }
    return (await result.json()) as T;
  } catch (error) {
    console.error(error);
    showToast({
      title: "Failed to fetch data",
      style: Toast.Style.Failure,
    });
  }
}
