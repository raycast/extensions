import { describe, it, expect } from "vitest";
import { haversineDistanceNm, estimateEta } from "./eta";

describe("haversineDistanceNm", () => {
  it("calculates SFO to EWR distance (~2230 nm)", () => {
    // SFO: 37.6213, -122.379 | EWR: 40.6925, -74.1687
    const distance = haversineDistanceNm(37.6213, -122.379, 40.6925, -74.1687);
    expect(distance).toBeGreaterThan(2150);
    expect(distance).toBeLessThan(2300);
  });

  it("returns 0 for same point", () => {
    const distance = haversineDistanceNm(40.0, -74.0, 40.0, -74.0);
    expect(distance).toBeCloseTo(0, 5);
  });

  it("calculates LAX to JFK distance (~2145 nm)", () => {
    const distance = haversineDistanceNm(33.9425, -118.408, 40.6413, -73.7781);
    expect(distance).toBeGreaterThan(2100);
    expect(distance).toBeLessThan(2250);
  });
});

describe("estimateEta", () => {
  it("estimates ~5.5 hours for SFO to EWR at cruise speed", () => {
    // 450 knots = ~231.5 m/s
    const eta = estimateEta(37.6213, -122.379, 40.6925, -74.1687, 231.5);
    expect(eta).not.toBeNull();
    // With approach phase modeled, should be longer than naive calc
    expect(eta!).toBeGreaterThan(4.5);
    expect(eta!).toBeLessThan(6.5);
  });

  it("models the approach slowdown (longer than a naive cruise-only estimate)", () => {
    const distNm = haversineDistanceNm(37.6213, -122.379, 40.6925, -74.1687);
    const naiveHours = distNm / (231.5 * 1.94384);
    const eta = estimateEta(37.6213, -122.379, 40.6925, -74.1687, 231.5)!;
    expect(eta).toBeGreaterThan(naiveHours);
  });

  it("estimates a short ETA when close to the destination", () => {
    const eta = estimateEta(41.9, -87.8, 41.97959, -87.90446, 100);
    expect(eta).not.toBeNull();
    expect(eta!).toBeGreaterThan(0);
    expect(eta!).toBeLessThan(0.5); // Should be very short
  });

  it("returns null when speed is 0", () => {
    const eta = estimateEta(37.6213, -122.379, 40.6925, -74.1687, 0);
    expect(eta).toBeNull();
  });

  it("returns null when speed is negative", () => {
    const eta = estimateEta(37.6213, -122.379, 40.6925, -74.1687, -100);
    expect(eta).toBeNull();
  });

  it("returns null for a tiny (near-zero) ground speed", () => {
    // ~1 kt of transient bad telemetry must not yield a multi-thousand-hour ETA.
    const eta = estimateEta(37.6213, -122.379, 40.6925, -74.1687, 0.5);
    expect(eta).toBeNull();
  });

  it("returns null for a non-finite ground speed (NaN/Infinity)", () => {
    expect(estimateEta(37.6213, -122.379, 40.6925, -74.1687, NaN)).toBeNull();
    expect(
      estimateEta(37.6213, -122.379, 40.6925, -74.1687, Infinity),
    ).toBeNull();
  });

  it("returns smaller ETA when closer to destination", () => {
    const etaFull = estimateEta(37.6213, -122.379, 40.6925, -74.1687, 231.5);
    const etaHalf = estimateEta(40.0, -98.0, 40.6925, -74.1687, 231.5);
    expect(etaHalf!).toBeLessThan(etaFull!);
  });

  it("estimates ~57 min for ATL→ORD scenario (195 nm at 382 kts)", () => {
    // Real scenario: UAL745, ATL→ORD — 382 kts = ~196.5 m/s, 195 nm to go.
    // FlightAware showed 57 min remaining.
    const eta = estimateEta(39.46, -85.18, 41.97959, -87.90446, 196.5);
    expect(eta).not.toBeNull();
    const minutes = eta! * 60;
    expect(minutes).toBeGreaterThan(40);
    expect(minutes).toBeLessThan(70);
  });

  it("is continuous across the 80 nm approach boundary", () => {
    // Two points on the same meridian ~79 nm and ~81 nm from the destination
    // (1 deg latitude = 60 nm). Crossing the boundary must not jump the ETA.
    const speed = 231.5; // ~450 kts
    const eta79 = estimateEta(41.3167, -74.0, 40.0, -74.0, speed)!;
    const eta81 = estimateEta(41.35, -74.0, 40.0, -74.0, speed)!;
    // 2 nm of travel at any modeled speed is well under a minute; the old
    // blended-vs-two-phase discontinuity produced an ~8-9 minute jump.
    expect(Math.abs(eta81 - eta79) * 60).toBeLessThan(2);
  });

  it("increases monotonically with distance across the boundary", () => {
    const speed = 231.5;
    const dists = [40, 60, 80, 100, 140];
    const etas = dists.map(
      (nm) => estimateEta(40.0 + nm / 60, -74.0, 40.0, -74.0, speed)!,
    );
    for (let i = 1; i < etas.length; i++) {
      expect(etas[i]).toBeGreaterThan(etas[i - 1]);
    }
  });
});
