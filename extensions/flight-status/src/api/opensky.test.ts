import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchFlightState } from "./opensky";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("fetchFlightState", () => {
  it("returns parsed state vector on success", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        time: 1706000000,
        states: [
          [
            "abc123",
            "UAL745  ",
            "United States",
            1706000000,
            1706000000,
            -122.4,
            37.8,
            10668.0,
            false,
            250.0,
            267.0,
            0.5,
            null,
            10972.8,
            "1200",
            false,
            0,
            0,
          ],
        ],
      }),
    });

    const state = await fetchFlightState("abc123");

    expect(state).not.toBeNull();
    expect(state!.icao24).toBe("abc123");
    expect(state!.callsign).toBe("UAL745");
    expect(state!.latitude).toBe(37.8);
    expect(state!.longitude).toBe(-122.4);
    expect(state!.baroAltitude).toBe(10668.0);
    expect(state!.onGround).toBe(false);
    expect(state!.velocity).toBe(250.0);
    expect(state!.trueTrack).toBe(267.0);
    expect(state!.verticalRate).toBe(0.5);
    expect(state!.geoAltitude).toBe(10972.8);
  });

  it("does not crash when callsign is null (allowed by OpenSky)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        time: 1706000000,
        states: [
          [
            "abc123",
            null, // callsign not being broadcast
            "United States",
            1706000000,
            1706000000,
            -122.4,
            37.8,
            10668.0,
            false,
            250.0,
            267.0,
            0.5,
            null,
            10972.8,
            "1200",
            false,
            0,
            0,
          ],
        ],
      }),
    });

    const state = await fetchFlightState("abc123");

    expect(state).not.toBeNull();
    expect(state!.callsign).toBe("");
    expect(state!.icao24).toBe("abc123");
  });

  it("returns null when no states are returned", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ time: 1706000000, states: null }),
    });

    const state = await fetchFlightState("abc123");
    expect(state).toBeNull();
  });

  it("returns null on API error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
    });

    const state = await fetchFlightState("abc123");
    expect(state).toBeNull();
  });

  it("returns null when fetch rejects (network error)", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network down"));

    const state = await fetchFlightState("abc123");
    expect(state).toBeNull();
  });

  it("returns null when response body is not JSON", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new SyntaxError("Unexpected token < in JSON");
      },
    });

    const state = await fetchFlightState("abc123");
    expect(state).toBeNull();
  });

  it("passes lowercase icao24 in URL", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ time: 1706000000, states: null }),
    });

    await fetchFlightState("ABC123");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://opensky-network.org/api/states/all?icao24=abc123",
      expect.anything(),
    );
  });

  it("sends a User-Agent header", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ time: 1706000000, states: null }),
    });

    await fetchFlightState("abc123");

    const init = mockFetch.mock.calls[0][1];
    expect(init.headers["User-Agent"]).toBeTruthy();
  });
});
