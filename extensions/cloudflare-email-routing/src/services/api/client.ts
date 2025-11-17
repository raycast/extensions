import Cloudflare from "cloudflare";
import { getApiConfig } from "./config";

export class CloudflareApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly statusText: string,
    public readonly responseBody?: string
  ) {
    super(message);
    this.name = "CloudflareApiError";
  }
}

export function createCloudflareClient(): Cloudflare {
  const config = getApiConfig();
  return new Cloudflare({
    apiToken: config.apiKey,
  });
}

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const config = getApiConfig();

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${config.apiKey}`);
  headers.set("Content-Type", "application/json");

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let responseBody: string | undefined;

    try {
      responseBody = await response.text();
    } catch {
      // If we can't read the response body, continue without it
      responseBody = undefined;
    }

    const baseMessage = responseBody || `HTTP ${response.status} ${response.statusText}`;

    // Handle specific status codes with user-friendly messages
    switch (response.status) {
      case 401:
        throw new CloudflareApiError(
          `Authentication failed: Invalid API token. ${baseMessage}`,
          response.status,
          response.statusText,
          responseBody
        );
      case 403:
        throw new CloudflareApiError(
          `Access forbidden: Check your API token permissions. ${baseMessage}`,
          response.status,
          response.statusText,
          responseBody
        );
      case 404:
        throw new CloudflareApiError(
          `Resource not found: Check your Zone ID and resource paths. ${baseMessage}`,
          response.status,
          response.statusText,
          responseBody
        );
      case 429:
        throw new CloudflareApiError(
          `Rate limit exceeded: Too many requests. Please try again later. ${baseMessage}`,
          response.status,
          response.statusText,
          responseBody
        );
      case 500:
        throw new CloudflareApiError(
          `Cloudflare server error: ${baseMessage}`,
          response.status,
          response.statusText,
          responseBody
        );
      case 502:
      case 503:
      case 504:
        throw new CloudflareApiError(
          `Cloudflare service unavailable: ${baseMessage}`,
          response.status,
          response.statusText,
          responseBody
        );
      default:
        throw new CloudflareApiError(
          `Request failed: ${baseMessage}`,
          response.status,
          response.statusText,
          responseBody
        );
    }
  }

  return response;
}
