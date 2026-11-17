import { describe, expect, it } from "vitest";
import {
  aircraftName,
  displayFlightNumber,
  effectiveArrival,
  effectiveDeparture,
  flightNumberKeywords,
  formatCompactCountdown,
  formatCompactDuration,
  formatCountdown,
  formatFlightStatus,
  formatListDate,
  formatProgressBar,
} from "./format";

describe("list date formatting", () => {
  const now = new Date("2026-11-15T12:00:00.000Z");

  it("adds the year only outside the current year, in the airport's zone", () => {
    const sameYear = formatListDate(
      new Date("2026-11-28T10:00:00.000Z"),
      "Europe/Warsaw",
      now,
    );
    const otherYear = formatListDate(
      new Date("2025-02-01T10:00:00.000Z"),
      "Europe/Warsaw",
      now,
    );
    // Late evening UTC on 31 Dec is already the next year in Tokyo.
    const acrossMidnight = formatListDate(
      new Date("2025-12-31T20:00:00.000Z"),
      "Asia/Tokyo",
      now,
    );

    expect(sameYear).toContain("28");
    expect(sameYear).not.toContain("2026");
    expect(otherYear).toContain("2025");
    expect(acrossMidnight).not.toContain("2025");
    expect(acrossMidnight).not.toContain("2026");
  });
});

describe("in-flight duration and progress formatting", () => {
  it.each([
    [30_000, "1m"],
    [59 * 60_000, "59m"],
    [60 * 60_000, "1h"],
    [(2 * 60 + 40) * 60_000, "2h 40m"],
    [(2 * 60 + 39) * 60_000 + 1, "2h 40m"],
    [14 * 60 * 60_000, "14h"],
  ])("formats %d ms as %s", (milliseconds, expected) => {
    expect(formatCompactDuration(milliseconds)).toBe(expected);
  });

  it("fills a clamped progress bar", () => {
    expect(formatProgressBar(0)).toBe("▱▱▱▱▱▱▱▱▱▱");
    expect(formatProgressBar(0.62)).toBe("▰▰▰▰▰▰▱▱▱▱");
    expect(formatProgressBar(1.4)).toBe("▰▰▰▰▰▰▰▰▰▰");
    expect(formatProgressBar(-1, 4)).toBe("▱▱▱▱");
  });
});
import type { UpcomingFlight } from "./api";

describe("effective flight times", () => {
  it("prefers actual gate times over estimates and scheduled times", () => {
    const flight = {
      flight: {
        departureTime: "2026-08-28T10:00:00.000Z",
        estimatedDepartureTime: "2026-08-28T10:15:00.000Z",
        actualGateDepartureTime: "2026-08-28T10:21:00.000Z",
        arrivalTime: "2026-08-28T12:00:00.000Z",
        estimatedArrivalTime: "2026-08-28T12:12:00.000Z",
        actualGateArrivalTime: "2026-08-28T12:18:00.000Z",
      },
    } as UpcomingFlight;

    expect(effectiveDeparture(flight).toISOString()).toBe(
      "2026-08-28T10:21:00.000Z",
    );
    expect(effectiveArrival(flight)?.toISOString()).toBe(
      "2026-08-28T12:18:00.000Z",
    );
  });

  it("continues to use estimates until actual gate times exist", () => {
    const flight = {
      flight: {
        departureTime: "2026-08-28T10:00:00.000Z",
        estimatedDepartureTime: "2026-08-28T10:15:00.000Z",
        actualGateDepartureTime: null,
        arrivalTime: "2026-08-28T12:00:00.000Z",
        estimatedArrivalTime: "2026-08-28T12:12:00.000Z",
        actualGateArrivalTime: null,
      },
    } as UpcomingFlight;

    expect(effectiveDeparture(flight).toISOString()).toBe(
      "2026-08-28T10:15:00.000Z",
    );
    expect(effectiveArrival(flight)?.toISOString()).toBe(
      "2026-08-28T12:12:00.000Z",
    );
  });
});

describe("departure countdown formatting", () => {
  const now = new Date("2026-08-28T12:00:00.000Z");

  it("shows complete days, hours, and minutes", () => {
    const departure = new Date("2026-08-31T16:05:00.000Z");

    expect(formatCountdown(departure, now)).toBe(
      "Departing in 3 days, 4 hours, 5 minutes",
    );
    expect(formatCompactCountdown(departure, now)).toBe("3d");
  });

  it("uses hours as the compact unit when departure is less than a day away", () => {
    const departure = new Date("2026-08-28T14:17:00.000Z");

    expect(formatCountdown(departure, now)).toBe(
      "Departing in 2 hours, 17 minutes",
    );
    expect(formatCompactCountdown(departure, now)).toBe("2h");
  });

  it("shows minutes as the only compact unit when departure is less than an hour away", () => {
    const departure = new Date("2026-08-28T12:47:00.000Z");

    expect(formatCompactCountdown(departure, now)).toBe("47m");
  });

  it("uses a now label around the departure time", () => {
    const justDeparted = new Date("2026-08-28T11:55:00.000Z");

    expect(formatCountdown(justDeparted, now)).toBe("Departing now");
    expect(formatCompactCountdown(justDeparted, now)).toBe("Now");
  });
});

describe("flight number display", () => {
  function numbered(
    iata: string | null,
    flightNumber: string,
    icao?: string | null,
  ) {
    return { airline: { iata, icao }, flight: { flightNumber } };
  }

  it.each([
    ["LH", "459", "LH 459"],
    ["LH", "LH459", "LH 459"],
    ["LH", "lh 459", "LH 459"],
    ["lh", "LH459A", "LH 459A"],
    ["LO", "LH459", "LH 459"],
    [null, "LH459", "LH 459"],
    [null, "459", "459"],
    ["LH", "N123AB", "N123AB"],
    ["LH", "  ", ""],
  ])("shows %s with %j as %j", (iata, flightNumber, expected) => {
    expect(displayFlightNumber(numbered(iata, flightNumber))).toBe(expected);
  });

  it.each([
    ["LH", "DLH", "DLH459", "LH 459"],
    [null, "DLH", "459", "DLH 459"],
    [null, "DLH", "DLH459", "DLH 459"],
    ["BA", "BAW", "BAW117", "BA 117"],
  ])("shows %s/%s with %j as %j", (iata, icao, flightNumber, expected) => {
    expect(displayFlightNumber(numbered(iata, flightNumber, icao))).toBe(
      expected,
    );
  });

  it("finds a flight by its spaced and compact designators and bare number", () => {
    for (const flightNumber of ["459", "LH459", "lh 459"]) {
      expect(flightNumberKeywords(numbered("LH", flightNumber))).toEqual([
        "LH 459",
        "LH459",
        "459",
      ]);
    }
  });

  it("finds a flight without an airline code by its number alone", () => {
    expect(flightNumberKeywords(numbered(null, "459"))).toEqual(["459"]);
    expect(flightNumberKeywords(numbered("LH", " "))).toEqual([]);
  });
});

describe("aircraft name formatting", () => {
  it("shows the manufacturer followed by the display model", () => {
    expect(
      aircraftName({
        flight: {
          aircraftDisplayName: "787-9",
          aircraftExactModelName: null,
          aircraftManufacturer: "Boeing",
          aircraftName: null,
        },
      }),
    ).toBe("Boeing 787-9");
  });

  it("does not repeat a manufacturer already present in the model", () => {
    expect(
      aircraftName({
        flight: {
          aircraftDisplayName: "Airbus A320neo",
          aircraftExactModelName: null,
          aircraftManufacturer: "Airbus",
          aircraftName: null,
        },
      }),
    ).toBe("Airbus A320neo");
  });
});

describe("flight status formatting", () => {
  it("shows scheduled instead of an unknown upcoming status", () => {
    expect(
      formatFlightStatus({
        onTimeStatus: "unknown",
        boardState: null,
        flightPhase: "countdown",
        flightState: "scheduled",
      }),
    ).toBe("Scheduled");
  });

  it("does not replace an unknown primary status with a secondary status", () => {
    expect(
      formatFlightStatus({
        onTimeStatus: "unknown",
        boardState: "last call",
        flightPhase: "boarding",
        flightState: "scheduled",
      }),
    ).toBe("Scheduled");
  });

  it("keeps meaningful operational statuses", () => {
    expect(
      formatFlightStatus({
        onTimeStatus: "onTime",
        boardState: null,
        flightPhase: "countdown",
        flightState: "scheduled",
      }),
    ).toBe("On time");
  });
});
