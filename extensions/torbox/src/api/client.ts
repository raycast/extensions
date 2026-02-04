import { ApiResponse } from "./types";

export const BASE_URL = "https://api.torbox.app/v1/api";

export const request = async <T extends ApiResponse>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(url, options);
  const json: T = await response.json();

  if (!response.ok || !json.success) {
    throw new Error(json.detail || "Request failed");
  }

  return json;
};

export const authHeaders = (apiKey: string): HeadersInit => ({
  Authorization: `Bearer ${apiKey}`,
});
