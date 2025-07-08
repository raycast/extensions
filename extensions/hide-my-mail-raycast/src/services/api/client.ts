import Cloudflare from "cloudflare";
import { getApiConfig } from "./config";

export function createCloudflareClient(): Cloudflare {
  const config = getApiConfig();
  return new Cloudflare({
    apiToken: config.apiKey,
  });
}

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const config = getApiConfig();

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${config.apiKey}`);
  headers.set("Content-Type", "application/json");

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response;
}
