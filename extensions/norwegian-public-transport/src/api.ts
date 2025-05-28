import fetch from "node-fetch";
import { getDepartureQuery } from "./departureQuery";
import { Feature, QuayDeparture, QuayLineFavorites, StopPlaceQuayDeparturesQuery } from "./types";

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
  const response = await fetch(url, {
    headers: {
      "ET-Client-Name": CLIENT_NAME,
    },
    signal,
  });
  const featureResponse = (await response.json()) as FeatureResponse;
  return featureResponse.features;
}

export async function fetchDepartures(
  stopId: string,
  numberOfDepartures: number,
  favorites: QuayLineFavorites[],
  signal?: AbortSignal,
): Promise<StopPlaceQuayDeparturesQuery | undefined> {
  const departuresQuery = await fetchJourneyPlannerData(getDepartureQuery(favorites), {
    id: stopId,
    numberOfDepartures,
    signal,
  });

  const departures = mapDepartureQueryKeys(departuresQuery, favorites);
  return departures;
}

async function fetchJourneyPlannerData<T>(
  document: string,
  variables: object,
  signal?: AbortSignal,
): Promise<T> {
  const url = "https://api.entur.io/journey-planner/v3/graphql";
  console.debug(url, JSON.stringify(variables));
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ET-Client-Name": CLIENT_NAME,
    },
    body: JSON.stringify({
      query: document,
      variables,
    }),
    signal,
  });
  if (response.status !== 200) {
    console.error(response);
    throw new Error("Failed to fetch data");
  }
  const result = (await response.json()) as { data: T };
  return result.data;
}

function mapDepartureQueryKeys(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any,
  favorites: QuayLineFavorites[],
): StopPlaceQuayDeparturesQuery {
  const favoriteQuayIds = favorites.map((fav) => fav.quayId);
  const quayDepartures = favoriteQuayIds
    .map((favoriteQuayId) => {
      const key = favoriteQuayId.replaceAll(":", "_");
      if (!Object.keys(data).includes(key)) return;
      return data[key] as QuayDeparture;
    })
    .filter(Boolean) as QuayDeparture[];
  const quaysWithDepartures = quayDepartures.filter((quay) => quay.estimatedCalls.length > 0);
  return {
    stopPlace: data.stopPlace,
    favorites: quaysWithDepartures,
  };
}
