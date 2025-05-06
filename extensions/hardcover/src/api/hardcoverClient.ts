import { getPreferenceValues } from "@raycast/api";
import { UNKNOWN_ERROR_MESSAGE } from "../helpers/errors";

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

  public async post<T>(query: string, variables?: object): Promise<T> {
    const headers = {
      Authorization: `${this.apiKey}`,
      "Content-Type": "application/json",
    };

    const body = JSON.stringify({
      query: query,
      ...(variables && { variables }),
    });

    const response = await fetch(API_BASE_URL, {
      method: "POST",
      body,
      headers,
    });
    const data = await response.json();

    if (response.status === 401) {
      throw new Error("Invalid API key. Please check your API key in the extension preferences.");
    } else if (!response.ok) {
      throw new Error(data.error || UNKNOWN_ERROR_MESSAGE);
    }

    return data;
  }
}
