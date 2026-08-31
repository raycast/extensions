import { describe, expect, it } from "vitest";
import type { UpcomingFlight } from "./api";
import {
  ACTIVE_REFRESH_INTERVAL_MS,
  DISTANT_REFRESH_INTERVAL_MS,
  EMPTY_REFRESH_INTERVAL_MS,
  menuBarRefreshInterval,
  menuBarTitle,
  resolveMenuBarLoadState,
  selectMenuBarFlight,
} from "./menu-bar-flight";

function flight(
  id: string,
  departureTime: string,
  overrides: {
    arrivalCity?: string | null;
    arrivalIata?: string | null;
    estimatedDepartureTime?: string | null;
    actualGateDepartureTime?: string | null;
    actualTakeoffTime?: string | null;
    actualLandingTime?: string | null;
    actualGateArrivalTime?: string | null;
    boardState?: string | null;
    flightPhase?: string | null;
    flightState?: string | null;
    onTimeStatus?: string | null;
  } = {},
): UpcomingFlight {
  return {
    flight: {
      id,
      flightNumber: "123",
      departureTime,
      arrivalTime: new Date(
        Date.parse(departureTime) + 2 * 60 * 60_000,
      ).toISOString(),
      estimatedDepartureTime: overrides.estimatedDepartureTime ?? null,
      estimatedArrivalTime: null,
      actualGateDepartureTime: overrides.actualGateDepartureTime ?? null,
      actualTakeoffTime: overrides.actualTakeoffTime ?? null,
      actualLandingTime: overrides.actualLandingTime ?? null,
      actualGateArrivalTime: overrides.actualGateArrivalTime ?? null,
      departureGate: null,
      arrivalGate: null,
      departureTerminal: null,
      arrivalTerminal: null,
      aircraftName: null,
      aircraftRegistration: null,
      aircraftShipName: null,
      flightState: overrides.flightState ?? "scheduled",
      boardState: overrides.boardState ?? null,
      flightPhase: overrides.flightPhase ?? "countdown",
      onTimeStatus: overrides.onTimeStatus ?? "unknown",
    },
    airline: { iata: "EI", name: "Aer Lingus" },
    departureAirport: {
      iata: "DUB",
      icao: "EIDW",
      name: "Dublin Airport",
      city: "Dublin",
      country: "Ireland",
      timeZoneRegionName: "Europe/Dublin",
    },
    arrivalAirport: {
      iata: overrides.arrivalIata === undefined ? "JFK" : overrides.arrivalIata,
      icao: "KJFK",
      name: "John F. Kennedy International Airport",
      city:
        overrides.arrivalCity === undefined
          ? "New York"
          : overrides.arrivalCity,
      country: "United States",
      timeZoneRegionName: "America/New_York",
    },
    seatNumber: null,
    seatCabinClass: null,
    seatPosition: null,
    bookingNumber: null,
  };
}

describe("menu-bar flight selection", () => {
  const now = new Date("2026-08-29T12:00:00.000Z");

  it("selects an active flight before the next future flight", () => {
    const future = flight(
      "11111111-1111-4111-8111-111111111111",
      "2026-08-29T14:00:00.000Z",
    );
    const boarding = flight(
      "22222222-2222-4222-8222-222222222222",
      "2026-08-29T11:30:00.000Z",
      { boardState: "boarding" },
    );

    expect(selectMenuBarFlight([future, boarding], now)?.flight.id).toBe(
      boarding.flight.id,
    );
  });

  it("advances to the next future flight after gate arrival", () => {
    const arrived = flight(
      "11111111-1111-4111-8111-111111111111",
      "2026-08-29T09:00:00.000Z",
      {
        actualGateDepartureTime: "2026-08-29T09:10:00.000Z",
        actualGateArrivalTime: "2026-08-29T11:15:00.000Z",
        flightState: "arrived",
      },
    );
    const next = flight(
      "22222222-2222-4222-8222-222222222222",
      "2026-08-30T09:00:00.000Z",
    );

    expect(selectMenuBarFlight([arrived, next], now)?.flight.id).toBe(
      next.flight.id,
    );
  });
});

describe("menu-bar title formatting", () => {
  const now = new Date("2026-08-29T12:00:00.000Z");

  it("shows destination city and compact countdown before departure", () => {
    expect(
      menuBarTitle(
        flight(
          "11111111-1111-4111-8111-111111111111",
          "2026-08-29T16:00:00.000Z",
        ),
        now,
      ),
    ).toBe("New York in 4h");

    expect(
      menuBarTitle(
        flight(
          "22222222-2222-4222-8222-222222222222",
          "2026-08-29T12:42:00.000Z",
        ),
        now,
      ),
    ).toBe("New York in 42m");
  });

  it("falls back to the arrival code when the city is unavailable", () => {
    expect(
      menuBarTitle(
        flight(
          "11111111-1111-4111-8111-111111111111",
          "2026-08-31T12:00:00.000Z",
          { arrivalCity: null },
        ),
        now,
      ),
    ).toBe("JFK in 2d");
  });

  it("removes the city for boarding and delayed operational titles", () => {
    const boarding = flight(
      "11111111-1111-4111-8111-111111111111",
      "2026-08-29T12:42:00.000Z",
      { boardState: "boarding" },
    );
    const delayed = flight(
      "22222222-2222-4222-8222-222222222222",
      "2026-08-29T13:00:00.000Z",
      {
        estimatedDepartureTime: "2026-08-29T13:25:00.000Z",
        onTimeStatus: "delayed",
      },
    );

    expect(menuBarTitle(boarding, now)).toBe("Boarding");
    expect(menuBarTitle(delayed, now)).toBe("Delayed 25m");
  });
});

describe("adaptive menu-bar refresh", () => {
  const now = new Date("2026-08-29T12:00:00.000Z");

  it("refreshes active and near flights every minute", () => {
    const active = flight(
      "11111111-1111-4111-8111-111111111111",
      "2026-08-29T11:30:00.000Z",
      { flightPhase: "in_flight" },
    );
    const near = flight(
      "22222222-2222-4222-8222-222222222222",
      "2026-08-29T18:00:00.000Z",
    );

    expect(menuBarRefreshInterval(active, now)).toBe(
      ACTIVE_REFRESH_INTERVAL_MS,
    );
    expect(menuBarRefreshInterval(near, now)).toBe(ACTIVE_REFRESH_INTERVAL_MS);
  });

  it("refreshes distant flights in five minutes and no flight in fifteen", () => {
    const distant = flight(
      "11111111-1111-4111-8111-111111111111",
      "2026-08-30T12:00:01.000Z",
    );
    expect(menuBarRefreshInterval(distant, now)).toBe(
      DISTANT_REFRESH_INTERVAL_MS,
    );
    expect(menuBarRefreshInterval(null, now)).toBe(EMPTY_REFRESH_INTERVAL_MS);
  });
});

describe("menu-bar empty and error states", () => {
  const cached = [
    flight("11111111-1111-4111-8111-111111111111", "2026-08-30T12:00:00.000Z"),
  ];

  it("distinguishes empty results from initial errors", () => {
    expect(
      resolveMenuBarLoadState({
        latestFlights: [],
        lastSuccessfulFlights: undefined,
        error: undefined,
      }).state,
    ).toBe("empty");
    expect(
      resolveMenuBarLoadState({
        latestFlights: undefined,
        lastSuccessfulFlights: undefined,
        error: new Error("offline"),
      }).state,
    ).toBe("error");
  });

  it("keeps the last successful in-memory result on transient errors", () => {
    const result = resolveMenuBarLoadState({
      latestFlights: undefined,
      lastSuccessfulFlights: cached,
      error: new Error("offline"),
    });
    expect(result.state).toBe("stale-error");
    expect(result.flights).toBe(cached);
  });
});
