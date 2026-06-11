import type { SimilarwebResponse } from "../types";

const API_URL = "https://data.similarweb.com/api/v1/data";

export async function fetchWebsiteData(domain: string): Promise<SimilarwebResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}?domain=${encodeURIComponent(domain)}`, {
      headers: {
        Accept: "application/json,text/plain,*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Referer: "https://www.similarweb.com/",
        Origin: "https://www.similarweb.com",
      },
    });
  } catch {
    throw new Error("Could not reach Similarweb. Check your network connection and try again.");
  }

  if (!response.ok) {
    throw new Error(`Similarweb returned ${response.status} ${response.statusText || "Request Failed"}`);
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new Error("Similarweb returned a response that was not valid JSON.");
  }

  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new Error("Similarweb returned JSON in an unexpected format.");
  }

  return payload as SimilarwebResponse;
}
