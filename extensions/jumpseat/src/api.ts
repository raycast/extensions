import { getJumpseatConfiguration } from "./config";
import {
  clearJumpseatAuthorization,
  getJumpseatAccessToken,
  JumpseatAuthenticationError,
  refreshJumpseatAccessToken,
} from "./oauth";
import { REQUEST_TIMEOUT_MS, responseErrorMessage } from "./http";
import {
  parseUpcomingFlightsResponse,
  type UpcomingFlight,
} from "./api-response";

export type { UpcomingFlight } from "./api-response";

export class JumpseatApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "JumpseatApiError";
  }
}

function requestUpcomingFlights(url: URL, token: string): Promise<Response> {
  return fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

export async function fetchUpcomingFlights(): Promise<UpcomingFlight[]> {
  const configuration = getJumpseatConfiguration();
  const url = new URL(
    "/api/v1/users/me/flights/query",
    configuration.apiBaseUrl,
  );
  // Include active and recently arrived flights so operational updates remain
  // visible after the estimated departure time has passed.
  url.searchParams.set("scope", "live");
  url.searchParams.set("limit", "100");

  let accessToken: string;
  try {
    accessToken = await getJumpseatAccessToken(configuration);
  } catch (error) {
    const message =
      error instanceof JumpseatAuthenticationError
        ? error.message
        : "Jumpseat could not complete sign-in.";
    throw new JumpseatApiError(message, 401);
  }

  let response = await requestUpcomingFlights(url, accessToken);
  if (response.status === 401) {
    try {
      accessToken = await refreshJumpseatAccessToken(configuration);
      response = await requestUpcomingFlights(url, accessToken);
    } catch (error) {
      const message =
        error instanceof JumpseatAuthenticationError
          ? error.message
          : "Your Jumpseat session has expired. Try again to sign in.";
      throw new JumpseatApiError(message, 401);
    }
  }

  if (!response.ok) {
    if (response.status === 401) await clearJumpseatAuthorization();
    const fallback =
      response.status === 401
        ? "Your Jumpseat session has expired. Try again to sign in."
        : "Jumpseat could not load your upcoming flights.";
    throw new JumpseatApiError(
      await responseErrorMessage(response, fallback),
      response.status,
    );
  }

  const flights = parseUpcomingFlightsResponse(await response.json());
  if (!flights) {
    throw new JumpseatApiError(
      "Jumpseat returned an unexpected flights response.",
      response.status,
    );
  }

  return flights;
}
