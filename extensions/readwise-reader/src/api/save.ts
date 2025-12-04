import fetch, { Response } from "node-fetch";

import { useDefaultHeaders } from "./headers.js";
import { extractURLs, isValid } from "../utils/url.js";

async function save(url: string, author?: string, tags?: string) {
  const readerAPI = "https://readwise.io/api/v3/save/";
  const body = {
    url,
    saved_using: "raycast",
    ...(author && { author }),
    ...(tags && {
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
    }),
  };

  const headers = useDefaultHeaders();

  const response = await fetch(readerAPI, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(body),
  });
  return response;
}

async function saveWithRateLimit(url: string, author?: string, tags?: string): Promise<Response> {
  const response = await save(url, author, tags);
  if (response.status === 429) {
    const retryAfter = Number(response.headers.get("Retry-After"));
    if (!isNaN(retryAfter)) {
      console.log(`Rate limit exceeded. Waiting for ${retryAfter} seconds.`);
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000)); // wait for x seconds
      return saveWithRateLimit(url, author, tags); // send new request
    } else {
      throw new Error("Invalid Retry-After header value");
    }
  }

  return response;
}

export async function saveURL(url: string, author?: string, tags?: string) {
  if (!isValid(url)) {
    throw new Error("Invalid URL");
  }

  await save(url, author, tags);
}

export async function saveURLs(urls: string, author?: string, tags?: string) {
  const urlList = extractURLs(urls);

  const requests = urlList.map((url) => saveWithRateLimit(url, author, tags));
  await Promise.all(requests);
}
