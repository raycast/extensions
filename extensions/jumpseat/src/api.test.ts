import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clearAuthorization: vi.fn(),
  getAccessToken: vi.fn(),
  parseFriendResponse: vi.fn(),
  refreshAccessToken: vi.fn(),
}));

vi.mock("./config", () => ({
  getJumpseatConfiguration: () => ({
    apiBaseUrl: "https://api.withjumpseat.com",
    webBaseUrl: "https://app.withjumpseat.com",
  }),
}));

vi.mock("./oauth", () => {
  class JumpseatAuthenticationError extends Error {}
  return {
    clearJumpseatAuthorization: mocks.clearAuthorization,
    getJumpseatAccessToken: mocks.getAccessToken,
    JumpseatAuthenticationError,
    refreshJumpseatAccessToken: mocks.refreshAccessToken,
  };
});

vi.mock("./api-response", async () => {
  const actual =
    await vi.importActual<typeof import("./api-response")>("./api-response");
  return {
    ...actual,
    parseFriendUpcomingFlightsResponse: mocks.parseFriendResponse,
  };
});

import { fetchFriendUpcomingFlights, type FriendUpcomingFlight } from "./api";

const firstFlight = { userFlightId: "first" } as FriendUpcomingFlight;
const secondFlight = { userFlightId: "second" } as FriendUpcomingFlight;
const nextCursor = {
  departureTime: "2026-09-01T10:00:00.000Z",
  flightId: "11111111-1111-4111-8111-111111111111",
  userFlightId: "33333333-3333-4333-8333-333333333333",
};

describe("friends' upcoming flights API", () => {
  beforeEach(() => {
    mocks.getAccessToken.mockResolvedValue("access-token");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("loads every cursor page", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ page: 1 }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ page: 2 }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    mocks.parseFriendResponse
      .mockReturnValueOnce({
        flights: [firstFlight],
        nextCursor,
        hasMore: true,
      })
      .mockReturnValueOnce({
        flights: [secondFlight],
        nextCursor: null,
        hasMore: false,
      });

    await expect(fetchFriendUpcomingFlights()).resolves.toEqual([
      firstFlight,
      secondFlight,
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    const secondUrl = new URL(String(fetchMock.mock.calls[1]?.[0]));
    expect(firstUrl.searchParams.has("cursorDepartureTime")).toBe(false);
    expect(secondUrl.searchParams.get("cursorDepartureTime")).toBe(
      nextCursor.departureTime,
    );
    expect(secondUrl.searchParams.get("cursorFlightId")).toBe(
      nextCursor.flightId,
    );
    expect(secondUrl.searchParams.get("cursorUserFlightId")).toBe(
      nextCursor.userFlightId,
    );
  });

  it("rejects a repeated cursor instead of looping forever", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation(
        async () => new Response(JSON.stringify({ page: 1 }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    mocks.parseFriendResponse.mockReturnValue({
      flights: [firstFlight],
      nextCursor,
      hasMore: true,
    });

    await expect(fetchFriendUpcomingFlights()).rejects.toThrow(
      "repeated friends flights cursor",
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
