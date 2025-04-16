import { getPreferenceValues } from "@raycast/api";

const API_BASE_URL = "https://api.hardcover.app/v1/graphql";

export interface Preferences {
  api_key: string;
}

export class HardcoverClient {
  private apiKey: string;

  constructor() {
    const preferences = getPreferenceValues<Preferences>();
    this.apiKey = preferences.api_key;
  }

  public async post<T>(query: string): Promise<T> {
    const url = `${API_BASE_URL}`;
    const headers = {
      Authorization: `${this.apiKey}`,
      "Content-Type": "application/json",
    };

    const body = JSON.stringify({
      query: query,
    });

    const response = await fetch(url, {
      method: "POST",
      body,
      headers,
    });
    const data = await response.json();

    if (response.status === 401) {
      throw new Error("Invalid API key. Please check your API key in the extension preferences.");
    } else if (!response.ok) {
      throw new Error(data.error);
    }

    return data;
  }
}
