import { describe, expect, it } from "vitest";
import {
  parseFriendUpcomingFlightsResponse,
  parseUpcomingFlightsResponse,
} from "./api-response";

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
