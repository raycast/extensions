import { describe, expect, it } from "vitest";
import {
  flightAirline,
  flightAirlineKeywords,
  flightAirlineName,
  retainAirlineBrands,
} from "./airline-brand";
import type { AirlineBrandSummary, UpcomingFlight } from "./api-response";
import { trustedAirlineLogoSource } from "./assets";

const airline = {
  iata: "TW",
  name: "T'way Air",
  logoUrl: "https://cdn.withjumpseat.com/airline-logos/TWB/light.svg",
  logoDarkUrl: "https://cdn.withjumpseat.com/airline-logos/TWB/dark.svg",
};

const TWAY_ID = "44444444-4444-4444-8444-444444444444";
const JEJU_ID = "66666666-6666-4666-8666-666666666666";

const jeju = {
  iata: "7C",
  name: "Jeju Air",
  logoUrl: "https://cdn.withjumpseat.com/airline-logos/JJA/light.svg",
  logoDarkUrl: null,
};

function flight(
  airlineBrand?: AirlineBrandSummary,
): Pick<UpcomingFlight, "flight" | "airline"> {
  return {
    flight: {
      id: "11111111-1111-4111-8111-111111111111",
      airlineId: TWAY_ID,
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
      airlineBrand,
    },
    airline,
  };
}

const scheduled: AirlineBrandSummary = {
  airlineId: TWAY_ID,
  kind: "scheduled",
  name: "Trinity Airways",
  logoUrl: "https://cdn.withjumpseat.com/airline-logos/TW1/light.svg",
  logoDarkUrl: "https://cdn.withjumpseat.com/airline-logos/TW1/dark.svg",
};

describe("flight airline brand", () => {
  it("keeps the airline when the brand is absent, current or unknown", () => {
    expect(flightAirline(flight())).toBe(airline);
    const current = {
      kind: "current",
      name: null,
      logoUrl: null,
      logoDarkUrl: null,
    };
    expect(flightAirline(flight(current))).toBe(airline);
    expect(flightAirline(flight({ ...scheduled, kind: "future" }))).toBe(
      airline,
    );
  });

  it("uses a scheduled or past brand's name and logo", () => {
    expect(flightAirline(flight(scheduled))).toEqual({
      iata: "TW",
      name: "Trinity Airways",
      logoUrl: scheduled.logoUrl,
      logoDarkUrl: scheduled.logoDarkUrl,
    });
    expect(flightAirline(flight({ ...scheduled, kind: "past" })).name).toBe(
      "Trinity Airways",
    );
  });

  it("never falls back to the airline's current logo", () => {
    const withoutLogo = { ...scheduled, logoUrl: null, logoDarkUrl: null };
    expect(
      trustedAirlineLogoSource(flightAirline(flight(withoutLogo))),
    ).toBeUndefined();
  });

  it("keeps the airline name when the brand has none", () => {
    expect(flightAirline(flight({ ...scheduled, name: " " })).name).toBe(
      "T'way Air",
    );
  });

  it("makes the flight searchable by both the brand and the airline name", () => {
    expect(flightAirlineKeywords(flight(scheduled))).toEqual([
      "Trinity Airways",
      "T'way Air",
    ]);
    expect(flightAirlineKeywords(flight())).toEqual(["T'way Air"]);
  });

  it("names the airline or the brand the flight flies under", () => {
    expect(flightAirlineName(flight())).toBe("T'way Air");
    expect(flightAirlineName(flight(scheduled))).toBe("Trinity Airways");
    expect(
      flightAirlineName(
        flight({ ...scheduled, logoUrl: null, logoDarkUrl: null }),
      ),
    ).toBe("Trinity Airways");
  });
});

describe("airline brand retention", () => {
  const current: AirlineBrandSummary = {
    airlineId: TWAY_ID,
    kind: "current",
    name: null,
    logoUrl: null,
    logoDarkUrl: null,
  };

  it("keeps the last known brand while a refresh omits it", () => {
    const branded = [flight(scheduled)];
    const retained = retainAirlineBrands(branded, [flight()]);
    expect(retained[0].flight.airlineBrand).toBe(scheduled);
    expect(flightAirline(retained[0]).logoUrl).toBe(scheduled.logoUrl);
  });

  it("lets an explicit brand, including the current one, replace it", () => {
    const branded = [flight(scheduled)];
    const cleared = retainAirlineBrands(branded, [flight(current)]);
    expect(flightAirline(cleared[0])).toBe(airline);
    const past = { ...scheduled, kind: "past", name: "Air Trinity" };
    expect(
      retainAirlineBrands(branded, [flight(past)])[0].flight.airlineBrand,
    ).toBe(past);
    expect(flightAirline(retainAirlineBrands(cleared, [flight()])[0])).toBe(
      airline,
    );
  });

  it("only applies a brand to the same flight", () => {
    const other = flight();
    other.flight = {
      ...other.flight,
      id: "22222222-2222-4222-8222-222222222222",
    };
    const [retained] = retainAirlineBrands([flight(scheduled)], [other]);
    expect(retained).toBe(other);
    expect(retainAirlineBrands(undefined, [other])[0]).toBe(other);
  });

  it("drops the brand when the flight moves to another airline", () => {
    const moved = flight();
    moved.flight = { ...moved.flight, airlineId: JEJU_ID };
    moved.airline = jeju;
    const [retained] = retainAirlineBrands([flight(scheduled)], [moved]);
    expect(retained).toBe(moved);
    expect(flightAirline(retained)).toBe(jeju);
  });

  it("does not retain a brand without a known airline", () => {
    const unowned = { ...scheduled, airlineId: undefined };
    expect(
      retainAirlineBrands([flight(unowned)], [flight()])[0].flight.airlineBrand,
    ).toBeUndefined();
    const unknownAirline = flight();
    unknownAirline.flight = { ...unknownAirline.flight, airlineId: undefined };
    expect(
      retainAirlineBrands([flight(scheduled)], [unknownAirline])[0].flight
        .airlineBrand,
    ).toBeUndefined();
  });
});
