// Utility for fetching metadata from the Microlink API
// See: https://microlink.io/docs/api

export interface MicrolinkResponse {
  data: {
    title?: string;
    logo?: {
      url: string;
      type: string;
      size: number;
      height: number;
      width: number;
    };
  };
}

/**
 * Fetch metadata (title, logo) from Microlink API for a given URL.
 * Returns null on error or if API does not return data.
 */
export async function fetchMicrolinkData(url: string): Promise<MicrolinkResponse | null> {
  try {
    const response = await fetch(
      `https://api.microlink.io?url=${encodeURIComponent(url)}&data.title&data.logo`
    );
    if (!response.ok) return null;
    const data = (await response.json()) as MicrolinkResponse;
    return data;
  } catch {
    return null;
  }
}
