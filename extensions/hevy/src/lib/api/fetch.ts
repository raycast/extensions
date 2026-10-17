import { getPreferenceValues } from "@raycast/api";

const BASE_URL = "https://api.hevyapp.com";

export async function fetchFromHevyAPI<T>(endpoint: string, params?: URLSearchParams): Promise<T> {
  const { apiKey } = getPreferenceValues<{ apiKey: string }>();

  const url = params ? `${BASE_URL}${endpoint}?${params.toString()}` : `${BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Api-Key": apiKey,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch from Hevy API: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}
