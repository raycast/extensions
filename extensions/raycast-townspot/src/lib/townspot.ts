import { RaycastResponse, AskPayload } from "../types";

const sanitizeQuery = (query: string): string => {
  const trimmed = String(query || "").trim().replace(/\s+/g, " ");
  return trimmed.length ? trimmed : "what's on";
};

export const sanitizeTownSlug = (townSlug: string): string =>
  String(townSlug || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");

const sanitizeLocale = (locale: string): string => {
  const value = String(locale || "en-GB").trim();
  if (!value) return "en-GB";
  return value;
};

export const normalizeApiBaseUrl = (apiBaseUrl: string): string => {
  const value = String(apiBaseUrl || "").trim();
  if (!value) {
    throw new Error("TownSpot API Base URL is required.");
  }
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    return `http://${value}`;
  }
  return value;
};

const buildLocalEndpointCandidates = (baseUrl: string): string[] => {
  const normalized = baseUrl.replace(/\/$/, "");
  const endpoint = `${normalized}/raycast/query`;
  return [...new Set([endpoint, endpoint.replace("localhost", "127.0.0.1")])];
};

const buildFailureMessage = (endpoint: string, details: string): string =>
  `Could not reach TownSpot at ${endpoint}. Verify the server is running and reachable. ` +
  `Try ${endpoint.replace("localhost", "127.0.0.1")} for 127.0.0.1 fallback. (${details})`;

export const askTownspot = async (payload: AskPayload): Promise<RaycastResponse> => {
  const query = sanitizeQuery(payload.query);
  const townSlug = sanitizeTownSlug(payload.townSlug);
  const locale = sanitizeLocale(payload.locale);
  const apiBaseUrl = normalizeApiBaseUrl(payload.apiBaseUrl);
  const candidateEndpoints = buildLocalEndpointCandidates(apiBaseUrl);

  let response: Response | undefined;
  let lastError: Error | undefined;

  for (const endpoint of candidateEndpoints) {
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          query,
          townSlug,
          locale,
          limit: payload.limit || 8,
          conversation: payload.conversation || [],
        }),
      });
      break;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("unknown network error");
      response = undefined;
    }
  }

  if (!response) {
    const details = lastError?.message || "unknown network error";
    throw new Error(buildFailureMessage(candidateEndpoints[0], details));
  }

  const checkedEndpoint = response.url || candidateEndpoints[0];

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`TownSpot query failed (${response.status}) at ${checkedEndpoint}: ${details || response.statusText}`);
  }

  const body = (await response.json()) as RaycastResponse;
  return body;
};
