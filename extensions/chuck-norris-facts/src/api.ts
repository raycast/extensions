import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { ApiError, ChuckFact, Preferences } from "./types";

export async function fetchFact(): Promise<ChuckFact> {
  const preferences: Preferences = getPreferenceValues();
  let apiUrl = "https://api.chucknorris.io/jokes/random";

  if (preferences && "category" in preferences && preferences.category !== "random") {
    apiUrl += `?category=${preferences.category}`;
  }

  const response = await fetch(apiUrl);

  if (!response.ok) {
    const errorInfo = (await response.json()) as ApiError;
    throw errorInfo;
  }

  return (await response.json()) as ChuckFact;
}
