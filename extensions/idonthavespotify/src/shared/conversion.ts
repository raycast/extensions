import { Adapter } from "../@types/global";
import { getApiUrl } from "../constants";
import { isAdapter, isLinkValid, parseSearchResult } from "./links";

export const isAbortError = (error: unknown) => error instanceof Error && error.name === "AbortError";
export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Could not convert the link.";

function messageForStatus(status: number): string {
  if (status === 400) return "Invalid link or not supported. Paste a music link from a supported service.";
  if (status === 401 || status === 403) {
    return "This instance requires authentication. Set a self-hosted instance in Extension Preferences, or convert on the website in your browser.";
  }
  if (status === 429) return "Rate limit exceeded. Please wait a moment and try again.";
  return "Conversion service is temporarily unavailable. Please try again later.";
}

export async function apiCall(link: string, adapter?: Adapter, signal?: AbortSignal) {
  if (!isLinkValid(link)) throw new Error("Paste a valid HTTP or HTTPS music link.");
  if (adapter !== undefined && !isAdapter(adapter)) throw new Error("Unsupported destination platform.");

  const apiUrl = getApiUrl();
  const timeout = AbortSignal.timeout(30_000);
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
  let response: Response;
  try {
    response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ link: link.trim(), ...(adapter ? { adapters: [adapter] } : {}) }),
      signal: requestSignal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    if (timeout.aborted) throw new Error("Conversion timed out. Please try again.");
    throw new Error("Could not reach the conversion service. Please try again later.");
  }

  if (!response.ok) throw new Error(messageForStatus(response.status));
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error("The conversion service returned an invalid response. Please try again later.");
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    if (signal?.aborted) throw error;
    if (timeout.aborted) throw new Error("Conversion timed out. Please try again.");
    throw new Error("The conversion service returned an invalid response. Please try again later.");
  }
  return parseSearchResult(data);
}
