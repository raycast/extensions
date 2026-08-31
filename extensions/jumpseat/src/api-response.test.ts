import { describe, expect, it } from "vitest";
import { parseUpcomingFlightsResponse } from "./api-response";

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
