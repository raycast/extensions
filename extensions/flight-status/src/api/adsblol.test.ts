import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchFlightStateByCallsign } from "./adsblol";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("fetchFlightStateByCallsign", () => {
  it("returns parsed state with unit conversions on success", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ac: [
          {
            hex: "abc123",
            flight: "UAL745  ",
            alt_baro: 35000,
            alt_geom: 36000,
            gs: 485,
            track: 267,
            baro_rate: 0,
            lat: 37.8,
            lon: -122.4,
            seen: 2,
            seen_pos: 5,
          },
        ],
        total: 1,
      }),
    });

    const state = await fetchFlightStateByCallsign("UAL745");

    expect(state).not.toBeNull();
    expect(state!.icao24).toBe("abc123");
    expect(state!.callsign).toBe("UAL745");
    expect(state!.latitude).toBe(37.8);
    expect(state!.longitude).toBe(-122.4);
    expect(state!.onGround).toBe(false);
    expect(state!.trueTrack).toBe(267);

    // Altitude: 35000 ft → meters (35000 / 3.28084 ≈ 10668.0)
    expect(state!.baroAltitude).toBeCloseTo(10668.0, 0);
    // Geo altitude: 36000 ft → meters
    expect(state!.geoAltitude).toBeCloseTo(10972.8, 0);
    // Speed: 485 knots → m/s (485 / 1.94384 ≈ 249.6)
    expect(state!.velocity).toBeCloseTo(249.6, 0);
    // Vertical rate: 0 ft/min → m/s
    expect(state!.verticalRate).toBeCloseTo(0, 2);
  });

  it("yields a null altitude (not NaN) for an unexpected alt_baro value", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ac: [
          {
            hex: "abc123",
            flight: "UAL745",
            alt_baro: "n/a", // off-spec, non-numeric, not "ground"
            gs: 485,
            track: 267,
            lat: 37.8,
            lon: -122.4,
            seen: 2,
            seen_pos: 5,
          },
        ],
        total: 1,
      }),
    });

    const state = await fetchFlightStateByCallsign("UAL745");

    expect(state).not.toBeNull();
    expect(state!.baroAltitude).toBeNull();
    expect(Number.isNaN(state!.baroAltitude as number)).toBe(false);
  });

  it("infers airborne from a fast ground speed when alt_baro is missing", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ac: [
          {
            hex: "abc123",
            flight: "UAL745",
            // alt_baro omitted (position-only record)
            gs: 420,
            track: 267,
            lat: 37.8,
            lon: -122.4,
            seen: 2,
            seen_pos: 5,
          },
        ],
        total: 1,
      }),
    });

    const state = await fetchFlightStateByCallsign("UAL745");

    expect(state).not.toBeNull();
    expect(state!.baroAltitude).toBeNull();
    expect(state!.onGround).toBe(false);
  });

  it("infers on-ground from a low ground speed when alt_baro is missing", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ac: [
          {
            hex: "abc123",
            flight: "UAL745",
            // alt_baro omitted, taxiing/parked speed
            gs: 12,
            track: 90,
            lat: 40.6,
            lon: -73.8,
            seen: 1,
          },
        ],
        total: 1,
      }),
    });

    const state = await fetchFlightStateByCallsign("UAL745");

    expect(state).not.toBeNull();
    expect(state!.onGround).toBe(true);
  });

  it("detects on-ground when alt_baro is 'ground'", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ac: [
          {
            hex: "abc123",
            flight: "UAL745  ",
            alt_baro: "ground",
            gs: 15,
            track: 90,
            lat: 40.6,
            lon: -73.8,
            seen: 1,
          },
        ],
        total: 1,
      }),
    });

    const state = await fetchFlightStateByCallsign("UAL745");

    expect(state).not.toBeNull();
    expect(state!.onGround).toBe(true);
    expect(state!.baroAltitude).toBe(0);
  });

  it("returns null when aircraft array is empty", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ac: [],
        total: 0,
      }),
    });

    const state = await fetchFlightStateByCallsign("UAL745");
    expect(state).toBeNull();
  });

  it("returns null when ac is null", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ac: null,
        total: 0,
      }),
    });

    const state = await fetchFlightStateByCallsign("UAL745");
    expect(state).toBeNull();
  });

  it("returns null on API error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const state = await fetchFlightStateByCallsign("UAL745");
    expect(state).toBeNull();
  });

  it("returns null on network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const state = await fetchFlightStateByCallsign("UAL745");
    expect(state).toBeNull();
  });

  it("returns null when response body is not JSON", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new SyntaxError("Unexpected token < in JSON");
      },
    });

    const state = await fetchFlightStateByCallsign("UAL745");
    expect(state).toBeNull();
  });

  it("passes callsign in URL", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ac: [],
        total: 0,
      }),
    });

    await fetchFlightStateByCallsign("UAL745");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.adsb.lol/v2/callsign/UAL745",
      expect.anything(),
    );
  });

  it("sends a User-Agent header (ADSB.lol 403s without one)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ac: [], total: 0 }),
    });

    await fetchFlightStateByCallsign("UAL745");

    const init = mockFetch.mock.calls[0][1];
    expect(init.headers["User-Agent"]).toBeTruthy();
  });
});
