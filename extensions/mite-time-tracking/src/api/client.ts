import { getPreferenceValues } from "@raycast/api";
import type { MitePreferences } from "./types";
import { cleanMiteUrl } from "../utils/mite-url";

/**
 * HTTP client for mite API with automatic authentication
 */
export class MiteClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    const preferences = getPreferenceValues<MitePreferences>();

    // Validate API key is provided
    if (!preferences.apiKey || preferences.apiKey.trim().length === 0) {
      throw new Error(
        "API key is required. Please configure it in extension preferences.",
      );
    }

    const miteUrl = cleanMiteUrl(preferences.miteUrl);

    // Validate mite URL format
    if (!miteUrl.match(/^[\w-]+\.mite\.yo\.lk$/)) {
      throw new Error(
        `Invalid mite URL format. Expected format: account.mite.yo.lk`,
      );
    }

    this.baseUrl = `https://${miteUrl}`;
    this.apiKey = preferences.apiKey;
  }

  private getHeaders(): Record<string, string> {
    return {
      "X-MiteApiKey": this.apiKey,
      "Content-Type": "application/json",
    };
  }

  async get<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `API Error: ${response.status} ${response.statusText} - URL: ${url} - ${errorBody}`,
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error(
          `Network error: Unable to reach ${this.baseUrl}. Check your internet connection and mite URL.`,
        );
      }
      throw error;
    }
  }

  async post<T>(endpoint: string, data: unknown): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `API Error: ${response.status} ${response.statusText} - URL: ${url} - ${errorBody}`,
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error(
          `Network error: Unable to reach ${this.baseUrl}. Check your internet connection and mite URL.`,
        );
      }
      throw error;
    }
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method: "PATCH",
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `API Error: ${response.status} ${response.statusText} - URL: ${url} - ${errorBody}`,
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error(
          `Network error: Unable to reach ${this.baseUrl}. Check your internet connection and mite URL.`,
        );
      }
      throw error;
    }
  }

  async delete<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method: "DELETE",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `API Error: ${response.status} ${response.statusText} - URL: ${url} - ${errorBody}`,
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error(
          `Network error: Unable to reach ${this.baseUrl}. Check your internet connection and mite URL.`,
        );
      }
      throw error;
    }
  }
}
