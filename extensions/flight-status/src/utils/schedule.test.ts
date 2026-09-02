import { describe, it, expect } from "vitest";
import { effectiveArrivalMs, isScheduleExpired } from "./schedule";
import { FlightSchedule } from "../types";

function makeSchedule(overrides: Partial<FlightSchedule> = {}): FlightSchedule {
  return {
    arrTimeTs: 1_700_000_000,
    arrEstimatedTs: null,
    duration: 120,
    status: "active",
    depGate: null,
    arrGate: null,
    arrTerminal: null,
    arrBaggage: null,
    arrDelayed: null,
    ...overrides,
  };
}

const BUFFER = 2 * 60 * 60 * 1000; // 2h

describe("effectiveArrivalMs", () => {
  it("converts arrTimeTs to ms", () => {
    expect(effectiveArrivalMs(makeSchedule({ arrTimeTs: 1000 }))).toBe(
      1_000_000,
    );
  });

  it("adds the delay (minutes) to the arrival time", () => {
    // 10 min delay = 600 s
    expect(
      effectiveArrivalMs(makeSchedule({ arrTimeTs: 1000, arrDelayed: 10 })),
    ).toBe((1000 + 600) * 1000);
  });
});

describe("isScheduleExpired", () => {
  const arrTimeTs = 1_700_000_000;
  const arrMs = arrTimeTs * 1000;

  it("is false for a null or zero schedule", () => {
    expect(isScheduleExpired(null, arrMs + BUFFER + 1, BUFFER, false)).toBe(
      false,
    );
    expect(
      isScheduleExpired(
        makeSchedule({ arrTimeTs: 0 }),
        Date.now(),
        BUFFER,
        false,
      ),
    ).toBe(false);
  });

  it("is true when arrival + buffer is in the past and not airborne", () => {
    const now = arrMs + BUFFER + 1;
    expect(
      isScheduleExpired(makeSchedule({ arrTimeTs }), now, BUFFER, false),
    ).toBe(true);
  });

  it("is false when still within the buffer window", () => {
    const now = arrMs + BUFFER - 1;
    expect(
      isScheduleExpired(makeSchedule({ arrTimeTs }), now, BUFFER, false),
    ).toBe(false);
  });

  it("is false while the aircraft is still airborne, even past the buffer", () => {
    // The failure scenario: delayed flight, schedule long past, but still flying.
    const now = arrMs + BUFFER + 10 * 60 * 1000;
    expect(
      isScheduleExpired(makeSchedule({ arrTimeTs }), now, BUFFER, true),
    ).toBe(false);
  });
});
