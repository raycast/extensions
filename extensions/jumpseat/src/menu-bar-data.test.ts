import { describe, expect, it, vi } from "vitest";
import { flightAirline } from "./airline-brand";
import type { AirlineBrandSummary, UpcomingFlight } from "./api-response";
const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("./api", () => ({ fetchUpcomingFlights: mocks.fetch }));
import { fetchMenuBarFlights } from "./menu-bar-data";

describe("cached menu-bar fetch", () => {
  it("redacts the response before the promise resolves for caching", async () => {
    mocks.fetch.mockResolvedValue([
      {
        flight: {
          id: "flight",
          departureTime: "2026-09-15T12:00:00Z",
          secret: "PRIVATE-FLIGHT",
        },
        airline: { iata: "EI", secret: "PRIVATE-AIRLINE" },
        departureAirport: { iata: "DUB", secret: "PRIVATE-AIRPORT" },
        arrivalAirport: null,
        bookingNumber: "PRIVATE-BOOKING",
        seatNumber: "PRIVATE-SEAT",
        seatCabinClass: "PRIVATE-CABIN",
        seatPosition: "PRIVATE-POSITION",
      },
    ]);
    const result = await fetchMenuBarFlights();
    expect(result[0].flight.id).toBe("flight");
    expect(JSON.stringify(result)).not.toContain("PRIVATE-");
  });

  const TWAY_ID = "44444444-4444-4444-8444-444444444444";
  const tway = {
    airlineId: TWAY_ID,
    airline: {
      iata: "TW",
      name: "T'way Air",
      logoUrl: "https://cdn.withjumpseat.com/airline-logos/TWB/light.svg",
      logoDarkUrl: null,
    },
  };
  const jeju = {
    airlineId: "66666666-6666-4666-8666-666666666666",
    airline: {
      iata: "7C",
      name: "Jeju Air",
      logoUrl: "https://cdn.withjumpseat.com/airline-logos/JJA/light.svg",
      logoDarkUrl: null,
    },
  };
  const response = (
    airlineBrand?: AirlineBrandSummary,
    airline: Pick<UpcomingFlight["flight"], "airlineId"> &
      Pick<UpcomingFlight, "airline"> = tway,
  ): UpcomingFlight[] => [
    {
      flight: {
        id: "flight",
        airlineId: airline.airlineId,
        flightNumber: "201",
        departureTime: "2026-09-20T01:00:00.000Z",
        arrivalTime: "2026-09-20T03:00:00.000Z",
        estimatedDepartureTime: null,
        estimatedArrivalTime: null,
        departureGate: null,
        arrivalGate: null,
        departureTerminal: null,
        arrivalTerminal: null,
        aircraftName: null,
        aircraftRegistration: null,
        aircraftShipName: null,
        flightState: "scheduled",
        boardState: null,
        flightPhase: null,
        onTimeStatus: null,
        ...(airlineBrand ? { airlineBrand } : {}),
      },
      airline: airline.airline,
      departureAirport: {
        iata: "ICN",
        icao: "RKSI",
        name: "Incheon International Airport",
        city: "Seoul",
        country: "South Korea",
        timeZoneRegionName: "Asia/Seoul",
      },
      arrivalAirport: null,
      bookingNumber: null,
      seatNumber: null,
      seatCabinClass: null,
      seatPosition: null,
    },
  ];
  const scheduled: AirlineBrandSummary = {
    airlineId: TWAY_ID,
    kind: "scheduled",
    name: "Trinity Airways",
    logoUrl: "https://cdn.withjumpseat.com/airline-logos/TW1/light.svg",
    logoDarkUrl: null,
  };
  const shown = (flights: Awaited<ReturnType<typeof fetchMenuBarFlights>>) => {
    const airline = flightAirline(flights[0]);
    return [airline.name, airline.logoUrl];
  };

  it("keeps a flight's brand across refreshes that omit it until the brand is current", async () => {
    mocks.fetch.mockResolvedValueOnce(response(scheduled));
    const branded = await fetchMenuBarFlights(undefined);
    expect(shown(branded)).toEqual(["Trinity Airways", scheduled.logoUrl]);

    mocks.fetch.mockResolvedValueOnce(response());
    const omitted = await fetchMenuBarFlights(
      JSON.parse(JSON.stringify(branded)),
    );
    expect(shown(omitted)).toEqual(["Trinity Airways", scheduled.logoUrl]);

    mocks.fetch.mockResolvedValueOnce(
      response({
        airlineId: TWAY_ID,
        kind: "current",
        name: null,
        logoUrl: null,
        logoDarkUrl: null,
      }),
    );
    const current = await fetchMenuBarFlights(omitted);
    expect(shown(current)).toEqual([
      "T'way Air",
      "https://cdn.withjumpseat.com/airline-logos/TWB/light.svg",
    ]);

    mocks.fetch.mockResolvedValueOnce(response());
    expect(shown(await fetchMenuBarFlights(current))).toEqual([
      "T'way Air",
      "https://cdn.withjumpseat.com/airline-logos/TWB/light.svg",
    ]);
  });

  it("drops a brand cached before the flight moved to another airline", async () => {
    mocks.fetch.mockResolvedValueOnce(response(scheduled));
    const branded = await fetchMenuBarFlights(undefined);
    expect(shown(branded)).toEqual(["Trinity Airways", scheduled.logoUrl]);

    mocks.fetch.mockResolvedValueOnce(response(undefined, jeju));
    const moved = await fetchMenuBarFlights(
      JSON.parse(JSON.stringify(branded)),
    );
    expect(shown(moved)).toEqual(["Jeju Air", jeju.airline.logoUrl]);
    expect(moved[0].flight.airlineBrand).toBeUndefined();
  });
});
