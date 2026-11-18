import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  tempoApiToken: string;
}

// Helper function to make authenticated API calls to Tempo
export async function fetchFromTempoAPI(endpoint: string, options: RequestInit = {}) {
  const { tempoApiToken } = getPreferenceValues<Preferences>();

  const response = await fetch(`https://api.tempo.io/4${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${tempoApiToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Tempo API error: ${response.status} - ${errorText}`);
  }

  // Don't try to parse JSON for empty responses (like DELETE)
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }

  return null;
}
