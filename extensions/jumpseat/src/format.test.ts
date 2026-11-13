import { describe, expect, it } from "vitest";
import {
  aircraftName,
  effectiveArrival,
  effectiveDeparture,
  formatCompactCountdown,
  formatCountdown,
  formatFlightStatus,
} from "./format";
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
