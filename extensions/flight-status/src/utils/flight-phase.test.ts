import { describe, it, expect } from "vitest";
import { deriveFlightPhase, isAirborne } from "./flight-phase";
import { FlightPhase, OpenSkyState } from "../types";

function makeState(overrides: Partial<OpenSkyState> = {}): OpenSkyState {
  return {
    icao24: "abc123",
    callsign: "UAL745",
    originCountry: "United States",
    timePosition: 1706000000,
    lastContact: 1706000000,
    longitude: -100.0,
    latitude: 40.0,
    baroAltitude: 10668, // ~35,000 ft
    onGround: false,
    velocity: 250,
    trueTrack: 267,
    verticalRate: 0,
    geoAltitude: 10972,
    ...overrides,
  };
}

describe("deriveFlightPhase", () => {
  it("returns OnGround when on_ground is true and never was airborne", () => {
    const state = makeState({ onGround: true });
    expect(deriveFlightPhase(state, [], false)).toBe(FlightPhase.OnGround);
  });

  it("returns Landed when on_ground is true and was previously airborne", () => {
    const state = makeState({ onGround: true });
    expect(deriveFlightPhase(state, [], true)).toBe(FlightPhase.Landed);
  });

  it("returns Cruising when altitude is high and stable", () => {
    const state = makeState({ baroAltitude: 10668 }); // ~35,000 ft
    const history = [10660, 10670]; // Stable within threshold
    expect(deriveFlightPhase(state, history, true)).toBe(FlightPhase.Cruising);
  });

  it("returns Climbing when altitude is increasing", () => {
    const state = makeState({ baroAltitude: 8000 }); // ~26,000 ft
    const history = [6000, 7000]; // Increasing
    expect(deriveFlightPhase(state, history, true)).toBe(FlightPhase.Climbing);
  });

  it("returns Descending when altitude is decreasing", () => {
    const state = makeState({ baroAltitude: 5000 }); // ~16,000 ft
    const history = [10000, 7000]; // Decreasing
    expect(deriveFlightPhase(state, history, true)).toBe(
      FlightPhase.Descending,
    );
  });

  it("returns Climbing with insufficient altitude history", () => {
    const state = makeState({ baroAltitude: 3000 }); // ~9,800 ft
    expect(deriveFlightPhase(state, [], true)).toBe(FlightPhase.Climbing);
  });

  it("returns Cruising with insufficient history but high altitude", () => {
    const state = makeState({ baroAltitude: 10668 }); // ~35,000 ft
    expect(deriveFlightPhase(state, [10668], true)).toBe(FlightPhase.Cruising);
  });

  it("returns Climbing when altitude is null (airborne)", () => {
    const state = makeState({ baroAltitude: null });
    expect(deriveFlightPhase(state, [], true)).toBe(FlightPhase.Climbing);
  });

  // Production shape: the caller appends the current reading to the history
  // before deriving, so the current altitude IS the last history element.
  it("detects descent when the history includes the current reading (past a peak)", () => {
    const state = makeState({ baroAltitude: 10000 }); // meters, ~32,808 ft
    // climbed to 10200 m, now descending through 10000 m (current == last)
    const history = [9900, 10200, 10000];
    expect(deriveFlightPhase(state, history, true)).toBe(
      FlightPhase.Descending,
    );
  });

  it("detects climb when the history includes the current reading", () => {
    const state = makeState({ baroAltitude: 8000 }); // meters
    const history = [6000, 7000, 8000]; // current == last
    expect(deriveFlightPhase(state, history, true)).toBe(FlightPhase.Climbing);
  });
});

describe("isAirborne", () => {
  it("is true for in-flight phases", () => {
    expect(isAirborne(FlightPhase.Climbing)).toBe(true);
    expect(isAirborne(FlightPhase.Cruising)).toBe(true);
    expect(isAirborne(FlightPhase.Descending)).toBe(true);
  });

  it("is false on the ground and after landing", () => {
    expect(isAirborne(FlightPhase.OnGround)).toBe(false);
    expect(isAirborne(FlightPhase.Landed)).toBe(false);
  });

  it("is false when there is no telemetry (null phase)", () => {
    // No phase means no live state, so ETA must not be shown next to
    // a "Not Active" status.
    expect(isAirborne(null)).toBe(false);
  });
});
