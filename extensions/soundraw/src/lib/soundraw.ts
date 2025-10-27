import { getSoundrawToken, getSoundrawApiBaseUrl } from "./storage";
import { SearchSamplesRequest, SearchSamplesResponse } from "./types";

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
  const token = await getSoundrawToken();
  const apiBaseUrl = await getSoundrawApiBaseUrl();

  if (!token) {
    throw new SoundrawAPIError("No API token found. Please set up your token first.");
  }

  if (!apiBaseUrl) {
    throw new SoundrawAPIError("No API base URL found. Please set up your configuration first.");
  }

  const url = `${apiBaseUrl}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
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
    // Send genres as array parameters
    params.genres.forEach((genre) => {
      queryParams.append("genres[]", genre);
    });
  }
  if (params.page) {
    queryParams.append("page", params.page.toString());
  }
  if (params.limit) {
    queryParams.append("limit", params.limit.toString());
  }

  const endpoint = `/beats${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

  return makeRequest<SearchSamplesResponse>(endpoint);
}

export async function getAvailableGenres(): Promise<{ genres: Record<string, string>; total_count: number }> {
  return makeRequest<{ genres: Record<string, string>; total_count: number }>("/tags");
}
