import fetch, { RequestInit, Response } from "node-fetch";

const TIMEOUT_DURATION = 3000;

export async function timeoutFetch(url: string, options: RequestInit): Promise<Response> {
  return Promise.race<Response>([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out after 3 seconds")), TIMEOUT_DURATION),
    ),
  ]);
}
