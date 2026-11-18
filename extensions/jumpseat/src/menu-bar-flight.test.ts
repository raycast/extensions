import { describe, expect, it } from "vitest";
import { flightAirline, flightAirlineName } from "./airline-brand";
import type { UpcomingFlight } from "./api";
import { flightSummary } from "./flight-presentation";
import {
  inFlightProgress,
  menuBarTitle,
  projectMenuBarFlight,
  resolveMenuBarLoadState,
  selectMenuBarFlight,
} from "./menu-bar-flight";

function flight(
  id: string,
  departureTime: string,
  overrides: {
    arrivalCity?: string | null;
    arrivalIata?: string | null;
    flightNumber?: string;
    estimatedDepartureTime?: string | null;
    actualGateDepartureTime?: string | null;
    actualTakeoffTime?: string | null;
    actualLandingTime?: string | null;
    actualGateArrivalTime?: string | null;
    estimatedArrivalTime?: string | null;
    belt?: string | null;
    boardState?: string | null;
    flightPhase?: string | null;
    flightState?: string | null;
    onTimeStatus?: string | null;
  } = {},
): UpcomingFlight {
  return {
    flight: {
      id,
      flightNumber: overrides.flightNumber ?? "123",
      departureTime,
      arrivalTime: new Date(
        Date.parse(departureTime) + 2 * 60 * 60_000,
      ).toISOString(),
      estimatedDepartureTime: overrides.estimatedDepartureTime ?? null,
      estimatedArrivalTime: overrides.estimatedArrivalTime ?? null,
      actualGateDepartureTime: overrides.actualGateDepartureTime ?? null,
      actualTakeoffTime: overrides.actualTakeoffTime ?? null,
      actualLandingTime: overrides.actualLandingTime ?? null,
      actualGateArrivalTime: overrides.actualGateArrivalTime ?? null,
      departureGate: null,
      arrivalGate: null,
      departureTerminal: null,
      arrivalTerminal: null,
      belt: overrides.belt ?? null,
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

describe("in-flight progress", () => {
  // Scheduled 10:00 → 12:00 (fixture adds two hours to departure).
  const departure = "2026-08-29T10:00:00.000Z";

  it("counts down to the arrival estimate from the takeoff time", () => {
    const airborne = flight("11111111-1111-4111-8111-111111111111", departure, {
      actualTakeoffTime: "2026-08-29T10:20:00.000Z",
      estimatedArrivalTime: "2026-08-29T12:20:00.000Z",
    });
    const now = new Date("2026-08-29T11:20:00.000Z");

    expect(menuBarTitle(airborne, now)).toBe("1h to New York");
    expect(inFlightProgress(airborne, now)).toMatchObject({
      startIsTakeoff: true,
      remainingMs: 60 * 60_000,
      fraction: 0.5,
    });
    expect(menuBarTitle(airborne, new Date("2026-08-29T10:59:30.000Z"))).toBe(
      "1h 21m to New York",
    );
  });

  it("falls back to the departure when only the status says airborne", () => {
    const airborne = flight("11111111-1111-4111-8111-111111111111", departure, {
      flightPhase: "inFlight",
    });
    const now = new Date("2026-08-29T11:30:00.000Z");

    expect(menuBarTitle(airborne, now)).toBe("30m to New York");
    expect(inFlightProgress(airborne, now)).toMatchObject({
      startIsTakeoff: false,
      fraction: 0.75,
    });
  });

  it("names the arrival code when the city is unavailable", () => {
    const airborne = flight("11111111-1111-4111-8111-111111111111", departure, {
      actualTakeoffTime: "2026-08-29T10:10:00.000Z",
      arrivalCity: null,
    });

    expect(menuBarTitle(airborne, new Date("2026-08-29T11:59:30.000Z"))).toBe(
      "1m to JFK",
    );
  });

  it("claims no countdown once the arrival estimate has passed", () => {
    const overdue = flight("11111111-1111-4111-8111-111111111111", departure, {
      actualTakeoffTime: "2026-08-29T10:10:00.000Z",
    });
    const now = new Date("2026-08-29T12:05:00.000Z");

    expect(inFlightProgress(overdue, now)).toBeNull();
    expect(menuBarTitle(overdue, now)).toBe("In Flight");
  });

  it("has no progress before takeoff or after landing", () => {
    const now = new Date("2026-08-29T11:00:00.000Z");
    const boarding = flight("11111111-1111-4111-8111-111111111111", departure, {
      boardState: "boarding",
    });
    const landed = flight("22222222-2222-4222-8222-222222222222", departure, {
      actualTakeoffTime: "2026-08-29T10:10:00.000Z",
      actualLandingTime: "2026-08-29T10:55:00.000Z",
    });

    expect(inFlightProgress(boarding, now)).toBeNull();
    expect(inFlightProgress(landed, now)).toBeNull();
  });

  it("shows the baggage belt while taxiing in once it is known", () => {
    const now = new Date("2026-08-29T12:00:00.000Z");
    const landed = {
      actualTakeoffTime: "2026-08-29T10:10:00.000Z",
      actualLandingTime: "2026-08-29T11:55:00.000Z",
    };

    expect(
      menuBarTitle(
        flight("11111111-1111-4111-8111-111111111111", departure, {
          ...landed,
          belt: " 7 ",
        }),
        now,
      ),
    ).toBe("Taxi In · Belt 7");
    expect(
      menuBarTitle(
        flight("11111111-1111-4111-8111-111111111111", departure, landed),
        now,
      ),
    ).toBe("Taxi In");
  });
});

describe("copied flight summary", () => {
  function cachedFlight(
    flightNumber: string,
    airline: UpcomingFlight["airline"],
  ): ReturnType<typeof projectMenuBarFlight> {
    const source = flight(
      "11111111-1111-4111-8111-111111111111",
      "2026-08-29T16:00:00Z",
      { flightNumber },
    );
    source.airline = airline;
    return JSON.parse(JSON.stringify(projectMenuBarFlight(source)));
  }

  it("keeps the airline ICAO code in the cached menu-bar flight", () => {
    const cached = cachedFlight("DLH459", {
      iata: "LH",
      icao: "DLH",
      name: "Lufthansa",
    });

    expect(cached.airline.icao).toBe("DLH");
    expect(flightSummary(cached).split("\n")[0]).toBe("LH 459 · DUB → JFK");
  });

  it("uses a cached ICAO code for an airline without IATA", () => {
    const cached = cachedFlight("459", {
      iata: null,
      icao: "DLH",
      name: "Lufthansa",
    });

    expect(flightSummary(cached).split("\n")[0]).toBe("DLH 459 · DUB → JFK");
  });

  it("still renders a flight cached before the ICAO code was kept", () => {
    const cached = cachedFlight("EI123", {
      iata: "EI",
      icao: "EIN",
      name: "Aer Lingus",
    });
    Reflect.deleteProperty(cached.airline, "icao");

    expect(flightSummary(cached).split("\n")[0]).toBe("EI 123 · DUB → JFK");
    expect(menuBarTitle(cached, new Date("2026-08-29T12:00:00Z"))).toBe(
      "New York in 4h",
    );
  });

  it.each(["123", "EI123", "ei 123"])(
    "names flight number %j once under the airline code",
    (flightNumber) => {
      const source = flight(
        "11111111-1111-4111-8111-111111111111",
        "2026-08-29T16:00:00Z",
        { flightNumber },
      );

      expect(flightSummary(projectMenuBarFlight(source)).split("\n")[0]).toBe(
        "EI 123 · DUB → JFK",
      );
    },
  );

  it("keeps a codeshare number under its own airline", () => {
    const source = flight(
      "11111111-1111-4111-8111-111111111111",
      "2026-08-29T16:00:00Z",
      { flightNumber: "BA5951" },
    );

    expect(flightSummary(projectMenuBarFlight(source)).split("\n")[0]).toBe(
      "BA 5951 · DUB → JFK",
    );
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

describe("menu-bar cache projection", () => {
  it("keeps operational data while excluding private and unrecognized fields", () => {
    const source = {
      ...flight("11111111-1111-4111-8111-111111111111", "2026-08-29T16:00:00Z"),
      bookingNumber: "PRIVATE-BOOKING",
      seatNumber: "PRIVATE-SEAT",
      seatCabinClass: "PRIVATE-CABIN",
      seatPosition: "PRIVATE-POSITION",
      privateFutureField: "PRIVATE-FUTURE",
    };
    Object.assign(source.flight, { privateFutureField: "PRIVATE-FLIGHT" });
    Object.assign(source.airline, { privateFutureField: "PRIVATE-AIRLINE" });
    Object.assign(source.departureAirport, {
      privateFutureField: "PRIVATE-AIRPORT",
    });
    const cached = JSON.parse(JSON.stringify(projectMenuBarFlight(source)));
    expect(JSON.stringify(cached)).not.toContain("PRIVATE-");
    for (const field of [
      "bookingNumber",
      "seatNumber",
      "seatCabinClass",
      "seatPosition",
      "privateFutureField",
    ]) {
      expect(cached).not.toHaveProperty(field);
    }
    expect(cached.flight).not.toHaveProperty("aircraftRegistration");
    expect(cached.departureAirport).not.toHaveProperty("name");
    expect(cached.departureAirport).not.toHaveProperty("city");
    expect(cached.arrivalAirport).toHaveProperty("city", "New York");
    expect(menuBarTitle(cached, new Date("2026-08-29T12:00:00Z"))).toBe(
      "New York in 4h",
    );
    expect(
      selectMenuBarFlight([cached], new Date("2026-08-29T12:00:00Z")),
    ).toEqual(cached);
    expect(flightSummary(cached)).not.toContain("Seat:");
    expect(flightSummary(cached)).not.toContain("PRIVATE-");
    expect(source.bookingNumber).toBe("PRIVATE-BOOKING");
  });

  it("supports a missing arrival airport", () => {
    const source = flight(
      "11111111-1111-4111-8111-111111111111",
      "2026-08-29T16:00:00Z",
    );
    source.arrivalAirport = null;
    expect(projectMenuBarFlight(source).arrivalAirport).toBeNull();
  });

  it("caches the brand the flight flies under alongside the airline", () => {
    const source = flight("brand", "2026-09-20T01:00:00Z");
    source.airline = {
      iata: "TW",
      name: "T'way Air",
      logoUrl: "https://cdn.withjumpseat.com/airline-logos/TWB/light.svg",
      logoDarkUrl: "https://cdn.withjumpseat.com/airline-logos/TWB/dark.svg",
    };
    source.flight.airlineBrand = {
      airlineId: "44444444-4444-4444-8444-444444444444",
      kind: "scheduled",
      name: "Trinity Airways",
      logoUrl: "https://cdn.withjumpseat.com/airline-logos/TW1/light.svg",
      logoDarkUrl: null,
    };
    Reflect.set(source.flight.airlineBrand, "brandId", "PRIVATE-FIELD");
    const projected = projectMenuBarFlight(source);
    expect(projected.flight.airlineBrand).toStrictEqual({
      airlineId: "44444444-4444-4444-8444-444444444444",
      kind: "scheduled",
      name: "Trinity Airways",
      logoUrl: "https://cdn.withjumpseat.com/airline-logos/TW1/light.svg",
      logoDarkUrl: null,
    });
    expect(flightAirline(projected)).toEqual({
      iata: "TW",
      name: "Trinity Airways",
      logoUrl: "https://cdn.withjumpseat.com/airline-logos/TW1/light.svg",
      logoDarkUrl: null,
    });
    expect(flightAirlineName(projected)).toBe("Trinity Airways");
  });

  it("omits the brand from the cache when the response has none", () => {
    const projected = projectMenuBarFlight(
      flight("plain", "2026-09-20T01:00:00Z"),
    );
    expect(projected.flight.airlineBrand).toBeUndefined();
    expect(JSON.parse(JSON.stringify(projected)).flight).not.toHaveProperty(
      "airlineBrand",
    );
    expect(flightAirlineName(projected)).toBe("Aer Lingus");
  });
});
