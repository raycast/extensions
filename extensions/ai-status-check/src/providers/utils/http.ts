export type FetchJson = (url: string, signal: AbortSignal, init?: RequestInit) => Promise<unknown>;
export type FetchText = (url: string, signal: AbortSignal, init?: RequestInit) => Promise<string>;

export const STATUS_USER_AGENT = "AI-Provider-Status/0.1.0 (+https://www.raycast.com/Astatine-213)";

function requestHeaders(accept: string, headers?: RequestInit["headers"]): Headers {
  const result = new Headers(headers);
  if (!result.has("Accept")) result.set("Accept", accept);
  if (!result.has("User-Agent")) result.set("User-Agent", STATUS_USER_AGENT);
  return result;
}

export const fetchJson: FetchJson = async (url, signal, init = {}) => {
  const response = await fetch(url, {
    ...init,
    headers: requestHeaders("application/json", init.headers),
    signal,
  });

  if (!response.ok) throw new Error(`Status source returned HTTP ${response.status}`);
  if (response.headers.get("content-type")?.includes("text/html")) {
    throw new Error("Status source returned an HTML page instead of JSON");
  }
  return response.json() as Promise<unknown>;
};

export const fetchText: FetchText = async (url, signal, init = {}) => {
  const response = await fetch(url, {
    ...init,
    headers: requestHeaders("text/html", init.headers),
    signal,
  });

  if (!response.ok) throw new Error(`Status source returned HTTP ${response.status}`);
  return response.text();
};
