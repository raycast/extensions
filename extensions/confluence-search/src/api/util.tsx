import fetch, { RequestInfo } from "node-fetch";
import { client } from "./oauth";

export async function get(url: RequestInfo, signal?: AbortSignal) {
  const tokenSet = await client.getTokens();

  console.debug(`GET ${url}`);
  const response = await fetch(url, {
    method: "GET",
    signal,
    compress: true,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenSet?.accessToken}`,
    },
  });

  if (!response.ok) {
    console.error("fetch items error:", await response.text());
    throw new Error(response.statusText);
  }

  return response.json();
}
