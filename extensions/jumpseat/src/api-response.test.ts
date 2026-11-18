import { describe, expect, it } from "vitest";
import {
  parseFriendUpcomingFlightsResponse,
  parseOwnFlightsPage,
  parseUpcomingFlightsResponse,
} from "./api-response";
import { displayFlightNumber } from "./format";

function validFlight() {
  return {
    flight: {
      id: "11111111-1111-4111-8111-111111111111",
      flightNumber: "123",
      departureTime: "2026-09-01T10:00:00.000Z",
      arrivalTime: "2026-09-01T12:00:00.000Z",
      estimatedDepartureTime: null,
      estimatedArrivalTime: null,
      actualGateDepartureTime: null,
      actualTakeoffTime: null,
      actualLandingTime: null,
      actualGateArrivalTime: null,
      departureGate: "A1",
      arrivalGate: "B2",
      departureTerminal: "1",
      arrivalTerminal: "2",
      checkIn: "Desk 10",
      belt: "6",
      aircraftName: "Airbus A320",
      aircraftDisplayName: "Airbus A320",
      aircraftExactModelName: null,
      aircraftManufacturer: "Airbus",
      aircraftEquipmentCode: "320",
      aircraftResolvedEquipmentCode: "320",
      aircraftRegistration: "9V-ABC",
      aircraftShipName: null,
      flightState: "scheduled",
      boardState: null,
      flightPhase: null,
      onTimeStatus: "on_time",
    },
    airline: {
      iata: "SQ",
      name: "Singapore Airlines",
      logoUrl:
        "https://cdn.withjumpseat.com/airline-logos/SIA/light.svg?v=1234",
    },
    departureAirport: {
      iata: "SIN",
      icao: "WSSS",
      name: "Singapore Changi Airport",
      city: "Singapore",
      country: "Singapore",
      countryFlagUrl: "https://cdn.withjumpseat.com/country-flags/SG.svg",
      timeZoneRegionName: "Asia/Singapore",
    },
    arrivalAirport: {
      iata: "DUB",
      icao: "EIDW",
      name: "Dublin Airport",
      city: "Dublin",
      country: "Ireland",
      countryFlagUrl: "https://cdn.withjumpseat.com/country-flags/IE.svg",
      timeZoneRegionName: "Europe/Dublin",
    },
    seatNumber: "12A",
    seatCabinClass: "economy",
    seatPosition: "window",
    bookingNumber: "ABC123",
  };
}

function validFriendFlight() {
  const flight = validFlight();
  Reflect.deleteProperty(flight, "seatNumber");
  Reflect.deleteProperty(flight, "seatCabinClass");
  Reflect.deleteProperty(flight, "seatPosition");
  Reflect.deleteProperty(flight, "bookingNumber");
  return {
    ...flight,
    user: {
      id: "22222222-2222-4222-8222-222222222222",
      fullName: "Friend Flyer",
      handle: "friend",
      profilePictureUrl: null,
    },
    userFlightId: "33333333-3333-4333-8333-333333333333",
  };
}

describe("upcoming flights response parsing", () => {
  it("accepts the fields rendered by the extension", () => {
    const flight = validFlight();
    expect(parseUpcomingFlightsResponse({ flights: [flight] })).toEqual([
      flight,
    ]);
  });

  it("rejects malformed nested records and invalid dates", () => {
    const missingAirline = validFlight();
    Reflect.deleteProperty(missingAirline, "airline");
    expect(
      parseUpcomingFlightsResponse({ flights: [missingAirline] }),
    ).toBeNull();

    const invalidDate = validFlight();
    invalidDate.flight.departureTime = "not-a-date";
    expect(parseUpcomingFlightsResponse({ flights: [invalidDate] })).toBeNull();

    const invalidActualDate = validFlight();
    Reflect.set(
      invalidActualDate.flight,
      "actualGateArrivalTime",
      "not-a-date",
    );
    expect(
      parseUpcomingFlightsResponse({ flights: [invalidActualDate] }),
    ).toBeNull();
  });

  it("keeps the airline ICAO code and accepts responses without one", () => {
    const flight = validFlight();
    expect(
      parseUpcomingFlightsResponse({ flights: [flight] })?.[0],
    ).not.toHaveProperty("airline.icao");

    const withIcao = validFlight();
    Reflect.set(withIcao.airline, "icao", "SIA");
    expect(
      parseUpcomingFlightsResponse({ flights: [withIcao] })?.[0]?.airline.icao,
    ).toBe("SIA");

    const withoutIcao = validFlight();
    Reflect.set(withoutIcao.airline, "icao", null);
    expect(
      parseUpcomingFlightsResponse({ flights: [withoutIcao] })?.[0]?.airline
        .icao,
    ).toBeNull();

    for (const icao of [459, "OVERLONGCODE"]) {
      const malformed = validFlight();
      Reflect.set(malformed.airline, "icao", icao);
      expect(parseUpcomingFlightsResponse({ flights: [malformed] })).toBeNull();
    }
  });

  it("shows an ICAO-prefixed number under the airline's IATA code", () => {
    const flight = validFlight();
    flight.flight.flightNumber = "DLH459";
    Object.assign(flight.airline, { iata: "LH", icao: "DLH" });

    const [parsed] = parseUpcomingFlightsResponse({ flights: [flight] }) ?? [];
    expect(parsed && displayFlightNumber(parsed)).toBe("LH 459");
  });

  it("accepts the airline brand a flight flies under", () => {
    const flight = {
      ...validFlight(),
      flight: {
        ...validFlight().flight,
        airlineBrand: {
          airlineId: "44444444-4444-4444-8444-444444444444",
          kind: "scheduled",
          brandId: "55555555-5555-4555-8555-555555555555",
          name: "Trinity Airways",
          localizedNames: null,
          logoAirlineCode: "TW1",
          logoUrl:
            "https://cdn.withjumpseat.com/airline-logos/TW1/light.svg?v=1",
          logoDarkUrl: null,
          dominantColor: null,
          dominantColorDark: null,
          dominantColorLight: null,
          accentColor: null,
          effectiveFrom: "2026-09-09T15:00:00.000Z",
          effectiveUntil: null,
        },
      },
    };
    expect(parseUpcomingFlightsResponse({ flights: [flight] })).toEqual([
      flight,
    ]);
  });

  it("rejects a malformed airline brand", () => {
    const flight = validFlight();
    Reflect.set(flight.flight, "airlineBrand", {
      kind: "past",
      name: 42,
      logoUrl: null,
      logoDarkUrl: null,
    });
    expect(parseUpcomingFlightsResponse({ flights: [flight] })).toBeNull();
  });

  it("rejects a malformed airline id on the flight or its brand", () => {
    const flight = validFlight();
    Reflect.set(flight.flight, "airlineId", "TW");
    expect(parseUpcomingFlightsResponse({ flights: [flight] })).toBeNull();

    const brand = validFlight();
    Reflect.set(brand.flight, "airlineBrand", {
      airlineId: 42,
      kind: "past",
      name: null,
      logoUrl: null,
      logoDarkUrl: null,
    });
    expect(parseUpcomingFlightsResponse({ flights: [brand] })).toBeNull();
  });

  it("rejects oversized result sets and invalid time zones", () => {
    expect(
      parseUpcomingFlightsResponse({
        flights: Array.from({ length: 101 }, validFlight),
      }),
    ).toBeNull();

    const invalidTimeZone = validFlight();
    invalidTimeZone.departureAirport.timeZoneRegionName = "Not/A_Time_Zone";
    expect(
      parseUpcomingFlightsResponse({ flights: [invalidTimeZone] }),
    ).toBeNull();
  });
});

describe("past flights page parsing", () => {
  const cursor = {
    departureTime: "2026-03-01T10:00:00.000Z",
    flightId: "11111111-1111-4111-8111-111111111111",
  };

  it("accepts a page and its next cursor", () => {
    const flight = validFlight();
    expect(
      parseOwnFlightsPage({
        flights: [flight],
        hasMore: true,
        nextCursor: cursor,
      }),
    ).toEqual({ flights: [flight], hasMore: true, nextCursor: cursor });
    expect(
      parseOwnFlightsPage({ flights: [], hasMore: false, nextCursor: null }),
    ).toEqual({ flights: [], hasMore: false, nextCursor: null });
  });

  it("rejects a page that cannot advance or has a malformed cursor", () => {
    expect(
      parseOwnFlightsPage({ flights: [], hasMore: true, nextCursor: null }),
    ).toBeNull();
    expect(
      parseOwnFlightsPage({
        flights: [],
        hasMore: true,
        nextCursor: { ...cursor, flightId: "not-a-uuid" },
      }),
    ).toBeNull();
    expect(parseOwnFlightsPage({ flights: [] })).toBeNull();
  });
});

describe("friends' upcoming flights response parsing", () => {
  it("accepts crew flights and adds private booking fields as empty", () => {
    const flight = validFriendFlight();
    expect(
      parseFriendUpcomingFlightsResponse({
        flights: [flight],
        nextCursor: null,
        hasMore: false,
      }),
    ).toEqual({
      flights: [
        {
          flight: flight.flight,
          airline: flight.airline,
          departureAirport: flight.departureAirport,
          arrivalAirport: flight.arrivalAirport,
          seatNumber: null,
          seatCabinClass: null,
          seatPosition: null,
          bookingNumber: null,
          friend: flight.user,
          userFlightId: flight.userFlightId,
        },
      ],
      nextCursor: null,
      hasMore: false,
    });
  });

  it("shows a bare number under the ICAO code of an airline without IATA", () => {
    const flight = validFriendFlight();
    flight.flight.flightNumber = "459";
    Object.assign(flight.airline, { iata: null, icao: "DLH" });

    const parsed = parseFriendUpcomingFlightsResponse({
      flights: [flight],
      nextCursor: null,
      hasMore: false,
    });
    expect(parsed?.flights[0]?.airline.icao).toBe("DLH");
    expect(parsed?.flights[0] && displayFlightNumber(parsed.flights[0])).toBe(
      "DLH 459",
    );
  });

  it("preserves a valid next cursor", () => {
    const nextCursor = {
      departureTime: "2026-09-01T10:00:00.000Z",
      flightId: "11111111-1111-4111-8111-111111111111",
      userFlightId: "33333333-3333-4333-8333-333333333333",
    };
    expect(
      parseFriendUpcomingFlightsResponse({
        flights: [validFriendFlight()],
        nextCursor,
        hasMore: true,
      }),
    ).toMatchObject({ nextCursor, hasMore: true });
  });

  it("rejects malformed friend identity and pagination metadata", () => {
    const missingFriend = validFriendFlight();
    Reflect.deleteProperty(missingFriend, "user");
    expect(
      parseFriendUpcomingFlightsResponse({
        flights: [missingFriend],
        nextCursor: null,
        hasMore: false,
      }),
    ).toBeNull();

    const malformedProfilePicture = validFriendFlight();
    Reflect.set(malformedProfilePicture.user, "profilePictureUrl", 42);
    expect(
      parseFriendUpcomingFlightsResponse({
        flights: [malformedProfilePicture],
        nextCursor: null,
        hasMore: false,
      }),
    ).toBeNull();

    expect(
      parseFriendUpcomingFlightsResponse({
        flights: [validFriendFlight()],
        nextCursor: null,
      }),
    ).toBeNull();

    expect(
      parseFriendUpcomingFlightsResponse({
        flights: [validFriendFlight()],
        nextCursor: null,
        hasMore: true,
      }),
    ).toBeNull();
  });
});
