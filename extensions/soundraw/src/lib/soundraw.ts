import { SearchSamplesRequest, SearchSamplesResponse } from "./types";
import { getPreferenceValues } from "@raycast/api";

const { soundrawToken, soundrawApiUrl } = getPreferenceValues<Preferences>();

export class SoundrawAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: Response,
  ) {
    super(message);
    this.name = "SoundrawAPIError";
  }
}

async function makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${soundrawApiUrl}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${soundrawToken}`,
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new SoundrawAPIError(
        `API request failed: ${response.status} ${response.statusText}`,
        response.status,
        response,
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof SoundrawAPIError) {
      throw error;
    }
    throw new SoundrawAPIError(`Network error: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function searchSamples(params: SearchSamplesRequest): Promise<SearchSamplesResponse> {
  const queryParams = new URLSearchParams();

  if (params.genres && params.genres.length > 0) {
    params.genres.forEach((genre) => queryParams.append("genres[]", genre));
  }

  const endpoint = `/beats${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

  return makeRequest<SearchSamplesResponse>(endpoint);
}

export async function getAvailableGenres(): Promise<{ genres: Record<string, string>; total_count: number }> {
  return makeRequest<{ genres: Record<string, string>; total_count: number }>("/tags");
}
