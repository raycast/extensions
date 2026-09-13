import { getJumpseatConfiguration } from "./config";
import {
  clearJumpseatAuthorization,
  getJumpseatAccessToken,
  JumpseatAuthenticationError,
  refreshJumpseatAccessToken,
} from "./oauth";
import { REQUEST_TIMEOUT_MS, responseErrorMessage } from "./http";
import {
  parseFriendUpcomingFlightsResponse,
  parseUpcomingFlightsResponse,
  type FriendUpcomingFlightsCursor,
  type FriendUpcomingFlight,
  type UpcomingFlight,
} from "./api-response";

export type {
  FriendSummary,
  FriendUpcomingFlight,
  UpcomingFlight,
} from "./api-response";

export class JumpseatApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "JumpseatApiError";
  }
}

function requestFlights(url: URL, token: string): Promise<Response> {
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

  let response = await requestFlights(url, accessToken);
  if (response.status === 401) {
    try {
      accessToken = await refreshJumpseatAccessToken(configuration);
      response = await requestFlights(url, accessToken);
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

export async function fetchFriendUpcomingFlights(): Promise<
  FriendUpcomingFlight[]
> {
  const configuration = getJumpseatConfiguration();
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

  const flights: FriendUpcomingFlight[] = [];
  const seenCursors = new Set<string>();
  let cursor: FriendUpcomingFlightsCursor | null = null;

  do {
    const url = new URL("/api/v1/crew/flights", configuration.apiBaseUrl);
    url.searchParams.set("scope", "upcoming");
    url.searchParams.set("allUpcoming", "true");
    url.searchParams.set("projection", "full");
    url.searchParams.set("limit", "100");
    if (cursor) {
      url.searchParams.set("cursorDepartureTime", cursor.departureTime);
      url.searchParams.set("cursorFlightId", cursor.flightId);
      if (cursor.userFlightId) {
        url.searchParams.set("cursorUserFlightId", cursor.userFlightId);
      }
    }

    let response = await requestFlights(url, accessToken);
    if (response.status === 401) {
      try {
        accessToken = await refreshJumpseatAccessToken(configuration);
        response = await requestFlights(url, accessToken);
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
          : "Jumpseat could not load your friends' upcoming flights.";
      throw new JumpseatApiError(
        await responseErrorMessage(response, fallback),
        response.status,
      );
    }

    const page = parseFriendUpcomingFlightsResponse(await response.json());
    if (!page) {
      throw new JumpseatApiError(
        "Jumpseat returned an unexpected friends flights response.",
        response.status,
      );
    }
    flights.push(...page.flights);
    cursor = page.nextCursor;
    if (cursor) {
      const cursorKey = `${cursor.departureTime}:${cursor.flightId}:${cursor.userFlightId ?? ""}`;
      if (seenCursors.has(cursorKey)) {
        throw new JumpseatApiError(
          "Jumpseat returned a repeated friends flights cursor.",
          response.status,
        );
      }
      seenCursors.add(cursorKey);
    }
  } while (cursor);

  return flights;
}
