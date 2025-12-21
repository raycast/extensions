import { getBackendUrl, getStoredSession } from "../config";
import { autoRelogin } from "./auth";
import { NewsHtmlResponse } from "../types";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const sessionId = await getStoredSession();
  const headers: Record<string, string> = {};

  if (sessionId) {
    headers["X-Session-Cookie"] = sessionId;
    headers["Cookie"] = `JSESSIONID=${sessionId}`;
    console.log("[NEWS] Session ID found, added to headers (first 8 chars):", sessionId.substring(0, 8) + "...");
  } else {
    console.warn("[NEWS] No session ID found in storage");
  }

  return headers;
}

export async function getNewsHtml(): Promise<string> {
  const backendUrl = getBackendUrl();
  const headers = await getAuthHeaders();

  console.log("[NEWS] Fetching news HTML from:", `${backendUrl}/api/news`);
  console.log("[NEWS] Request headers:", Object.keys(headers));

  const response = await fetch(`${backendUrl}/api/news`, {
    method: "GET",
    headers,
    credentials: "include",
  });

  console.log("[NEWS] News response status:", response.status, response.statusText);

  if (!response.ok) {
    if (response.status === 401) {
      console.error("[NEWS] Unauthorized - session expired or invalid");
      console.log("[NEWS] Attempting automatic re-login...");

      // Try to automatically re-login
      const reloginSuccess = await autoRelogin();
      if (reloginSuccess) {
        console.log("[NEWS] Auto-relogin successful, retrying request...");
        // Retry the request with new session
        const retryHeaders = await getAuthHeaders();
        const retryResponse = await fetch(`${backendUrl}/api/news`, {
          method: "GET",
          headers: retryHeaders,
          credentials: "include",
        });

        if (retryResponse.ok) {
          const retryData = (await retryResponse.json()) as NewsHtmlResponse;
          console.log("[NEWS] Successfully fetched news HTML after auto-relogin");
          return retryData.html;
        }
      }

      throw new Error("Unauthorized - Please login again");
    }
    console.error("[NEWS] Failed to fetch news:", response.status, response.statusText);
    throw new Error(`Failed to fetch news: ${response.statusText}`);
  }

  const data = (await response.json()) as NewsHtmlResponse;
  console.log("[NEWS] Successfully fetched news HTML");
  return data.html;
}
