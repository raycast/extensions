import fetch, { Response } from "node-fetch";

import { useDefaultHeaders } from "./headers.js";
import { extractURLs, isValid } from "../utils/url.js";

async function save(url: string, author?: string) {
  const readerAPI = "https://readwise.io/api/v3/save/";
  const body = {
    url,
    saved_using: "raycast",
    ...(author && { author }),
  };

  const headers = useDefaultHeaders();

  const response = await fetch(readerAPI, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(body),
  });
  return response;
}

async function saveWithRateLimit(url: string, author?: string): Promise<Response> {
  const response = await save(url, author);
  if (response.status === 429) {
    const retryAfter = Number(response.headers.get("Retry-After"));
    if (!isNaN(retryAfter)) {
      console.log(`Rate limit exceeded. Waiting for ${retryAfter} seconds.`);
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000)); // wait for x seconds
      return saveWithRateLimit(url, author); // send new request
    } else {
      throw new Error("Invalid Retry-After header value");
    }
  }

  return response;
}

export async function saveURL(url: string, author?: string) {
  if (!isValid(url)) {
    throw new Error("Invalid URL");
  }

  await save(url, author);
}

export async function saveURLs(urls: string, author?: string) {
  const urlList = extractURLs(urls);

  const requests = urlList.map((url) => saveWithRateLimit(url, author));
  await Promise.all(requests);
}
