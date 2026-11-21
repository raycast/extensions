import { environment, getPreferenceValues } from "@raycast/api";
import axios from "axios";
import { Preferences } from "../types";

const preferences = getPreferenceValues<Preferences>();

// Shared MOCO API client: base URL and auth header in one place.
export const api = axios.create({
  baseURL: `https://${preferences.url_prefix}.mocoapp.com/api/v1`,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Token token=${preferences.apikey}`,
  },
});

// Request log, only under `npm run dev`. The API key is redacted.
if (environment.isDevelopment) {
  api.interceptors.request.use((request) => {
    const headers = { ...request.headers.toJSON(), Authorization: "Token token=***" };
    console.debug(`${request.method?.toUpperCase()} ${request.url}`, {
      params: request.params,
      data: request.data,
      headers,
    });
    return request;
  });
}
