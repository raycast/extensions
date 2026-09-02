import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchFlightRoute, fetchFlightSchedule } from "./airlabs";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

function mockFlightResponse(data: Record<string, unknown>[]) {
  return {
    ok: true,
    json: async () => ({ response: data }),
  };
}

function mockAirportResponse(iataCode: string, lat: number, lng: number) {
  return {
    ok: true,
    json: async () => ({
      response: [{ iata_code: iataCode, lat, lng }],
    }),
  };
}

describe("fetchFlightRoute", () => {
  it("returns full route with coordinates on success", async () => {
    // First call: flights endpoint
    mockFetch.mockResolvedValueOnce(
      mockFlightResponse([
        {
          hex: "abc123",
          flight_icao: "UAL745",
          flight_iata: "UA745",
          dep_icao: "KSFO",
          dep_iata: "SFO",
          arr_icao: "KEWR",
          arr_iata: "EWR",
        },
      ]),
    );
    // Second call: departure airport
    mockFetch.mockResolvedValueOnce(
      mockAirportResponse("SFO", 37.6213, -122.379),
    );
    // Third call: arrival airport
    mockFetch.mockResolvedValueOnce(
      mockAirportResponse("EWR", 40.6925, -74.1687),
    );

    const route = await fetchFlightRoute("UAL745", "test-key");

    expect(route).not.toBeNull();
    expect(route!.hex).toBe("abc123");
    expect(route!.depIata).toBe("SFO");
    expect(route!.arrIata).toBe("EWR");
    expect(route!.depLat).toBe(37.6213);
    expect(route!.arrLng).toBe(-74.1687);
  });

  it("resolves the arrival airport timezone from the bundled table", async () => {
    mockFetch.mockResolvedValueOnce(
      mockFlightResponse([
        {
          hex: "abc123",
          flight_icao: "UAL745",
          flight_iata: "UA745",
          dep_icao: "KSFO",
          dep_iata: "SFO",
          arr_icao: "KEWR",
          arr_iata: "EWR",
        },
      ]),
    );
    mockFetch.mockResolvedValueOnce(
      mockAirportResponse("SFO", 37.6213, -122.379),
    );
    mockFetch.mockResolvedValueOnce(
      mockAirportResponse("EWR", 40.6925, -74.1687),
    );

    const route = await fetchFlightRoute("UAL745", "test-key");
    expect(route!.arrTz).toBe("America/New_York");
  });

  it("sets arrTz to null for an airport not in the timezone table", async () => {
    mockFetch.mockResolvedValueOnce(
      mockFlightResponse([
        {
          hex: "abc123",
          flight_icao: "UAL745",
          flight_iata: "UA745",
          dep_icao: "KSFO",
          dep_iata: "SFO",
          arr_icao: "ZZZZ",
          arr_iata: "ZZZ",
        },
      ]),
    );
    mockFetch.mockResolvedValueOnce(
      mockAirportResponse("SFO", 37.6213, -122.379),
    );
    mockFetch.mockResolvedValueOnce(
      mockAirportResponse("ZZZ", 40.6925, -74.1687),
    );

    const route = await fetchFlightRoute("UAL745", "test-key");
    expect(route!.arrTz).toBeNull();
  });

  it("returns null when neither flights nor schedules has the flight", async () => {
    mockFetch.mockResolvedValueOnce(mockFlightResponse([])); // /flights empty
    mockFetch.mockResolvedValueOnce(mockFlightResponse([])); // /schedules empty

    const route = await fetchFlightRoute("UAL999", "test-key");
    expect(route).toBeNull();
  });

  it("falls back to /schedules for the route when /flights is empty", async () => {
    mockFetch.mockResolvedValueOnce(mockFlightResponse([])); // /flights empty
    // /schedules has the flight (no hex)
    mockFetch.mockResolvedValueOnce(
      mockFlightResponse([
        {
          dep_iata: "ATL",
          dep_icao: "KATL",
          arr_iata: "ORD",
          arr_icao: "KORD",
          status: "en-route",
        },
      ]),
    );
    mockFetch.mockResolvedValueOnce(
      mockAirportResponse("ATL", 33.6367, -84.428),
    );
    mockFetch.mockResolvedValueOnce(
      mockAirportResponse("ORD", 41.9786, -87.9048),
    );

    const route = await fetchFlightRoute("UAL745", "test-key");

    expect(route).not.toBeNull();
    expect(route!.hex).toBe(""); // no hex from schedules -> ADSB.lol by callsign
    expect(route!.depIata).toBe("ATL");
    expect(route!.arrIata).toBe("ORD");
    expect(route!.arrLng).toBe(-87.9048);
    expect(route!.arrTz).toBe("America/Chicago");
  });

  it("prefers an active schedule leg over a completed one in the fallback", async () => {
    mockFetch.mockResolvedValueOnce(mockFlightResponse([])); // /flights empty
    mockFetch.mockResolvedValueOnce(
      mockFlightResponse([
        { dep_iata: "ATL", arr_iata: "ORD", status: "landed" },
        { dep_iata: "SFO", arr_iata: "EWR", status: "en-route" },
      ]),
    );
    mockFetch.mockResolvedValueOnce(
      mockAirportResponse("SFO", 37.6213, -122.379),
    );
    mockFetch.mockResolvedValueOnce(
      mockAirportResponse("EWR", 40.6925, -74.1687),
    );

    const route = await fetchFlightRoute("UAL745", "test-key");
    expect(route!.depIata).toBe("SFO");
    expect(route!.arrIata).toBe("EWR");
  });

  it("returns null on flight API error", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

    const route = await fetchFlightRoute("UAL745", "bad-key");
    expect(route).toBeNull();
  });

  it("returns null when airport coordinates fail", async () => {
    mockFetch.mockResolvedValueOnce(
      mockFlightResponse([
        {
          hex: "abc123",
          flight_icao: "UAL745",
          flight_iata: "UA745",
          dep_icao: "KSFO",
          dep_iata: "SFO",
          arr_icao: "KEWR",
          arr_iata: "EWR",
        },
      ]),
    );
    // Both airport lookups fail
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const route = await fetchFlightRoute("UAL745", "test-key");
    expect(route).toBeNull();
  });

  it("returns null when fetch rejects (network error)", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network down"));

    const route = await fetchFlightRoute("UAL745", "test-key");
    expect(route).toBeNull();
  });

  it("returns null when airport coordinates are missing/non-numeric", async () => {
    mockFetch.mockResolvedValueOnce(
      mockFlightResponse([
        {
          hex: "abc123",
          flight_icao: "UAL745",
          flight_iata: "UA745",
          dep_icao: "KSFO",
          dep_iata: "SFO",
          arr_icao: "KEWR",
          arr_iata: "EWR",
        },
      ]),
    );
    // Departure coords OK, arrival record present but lat/lng null
    mockFetch.mockResolvedValueOnce(
      mockAirportResponse("SFO", 37.6213, -122.379),
    );
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: [{ iata_code: "EWR", lat: null, lng: null }],
      }),
    });

    const route = await fetchFlightRoute("UAL745", "test-key");
    expect(route).toBeNull();
  });

  it("includes API key in request URLs", async () => {
    mockFetch.mockResolvedValueOnce(mockFlightResponse([]));

    await fetchFlightRoute("UAL745", "my-secret-key");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("api_key=my-secret-key"),
      expect.anything(),
    );
  });
});

function mockScheduleResponse(data: Record<string, unknown>[]) {
  return {
    ok: true,
    json: async () => ({ response: data }),
  };
}

describe("fetchFlightSchedule", () => {
  it("returns schedule data for matching departure airport", async () => {
    mockFetch.mockResolvedValueOnce(
      mockScheduleResponse([
        {
          dep_iata: "ATL",
          arr_time_ts: 1769805000,
          arr_estimated_ts: 1769797740,
          duration: 135,
          status: "active",
          dep_gate: "T18",
          arr_gate: "G6",
          arr_terminal: "3",
          arr_baggage: "14",
          arr_delayed: 49,
        },
        {
          dep_iata: "ORD",
          arr_time_ts: 1769822340,
          duration: 134,
          status: "scheduled",
          dep_gate: "B9",
          arr_gate: "43",
          arr_terminal: "B",
          arr_baggage: "7",
          arr_delayed: null,
        },
      ]),
    );

    const schedule = await fetchFlightSchedule("UAL745", "test-key", "ATL");

    expect(schedule).not.toBeNull();
    expect(schedule!.arrTimeTs).toBe(1769805000);
    expect(schedule!.arrEstimatedTs).toBe(1769797740);
    expect(schedule!.duration).toBe(135);
    expect(schedule!.status).toBe("active");
    expect(schedule!.depGate).toBe("T18");
    expect(schedule!.arrGate).toBe("G6");
    expect(schedule!.arrTerminal).toBe("3");
    expect(schedule!.arrBaggage).toBe("14");
    expect(schedule!.arrDelayed).toBe(49);
  });

  it("selects the correct leg by departure airport", async () => {
    mockFetch.mockResolvedValueOnce(
      mockScheduleResponse([
        {
          dep_iata: "ATL",
          arr_time_ts: 1769805000,
          duration: 135,
          status: "active",
          dep_gate: null,
          arr_gate: null,
          arr_terminal: null,
          arr_baggage: null,
        },
        {
          dep_iata: "ORD",
          arr_time_ts: 1769822340,
          duration: 134,
          status: "scheduled",
          dep_gate: null,
          arr_gate: null,
          arr_terminal: null,
          arr_baggage: null,
        },
      ]),
    );

    const schedule = await fetchFlightSchedule("UAL745", "test-key", "ORD");

    expect(schedule).not.toBeNull();
    expect(schedule!.arrTimeTs).toBe(1769822340);
    expect(schedule!.duration).toBe(134);
    expect(schedule!.status).toBe("scheduled");
  });

  it("falls back to first leg when departure airport not found", async () => {
    mockFetch.mockResolvedValueOnce(
      mockScheduleResponse([
        {
          dep_iata: "ATL",
          arr_time_ts: 1769805000,
          duration: 135,
          status: "active",
          dep_gate: null,
          arr_gate: null,
          arr_terminal: null,
          arr_baggage: null,
        },
      ]),
    );

    const schedule = await fetchFlightSchedule("UAL745", "test-key", "SFO");

    expect(schedule).not.toBeNull();
    expect(schedule!.arrTimeTs).toBe(1769805000);
  });

  it("returns null when schedule is not found", async () => {
    mockFetch.mockResolvedValueOnce(mockScheduleResponse([]));

    const schedule = await fetchFlightSchedule("UAL999", "test-key", "ATL");
    expect(schedule).toBeNull();
  });

  it("returns null on API error", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const schedule = await fetchFlightSchedule("UAL745", "bad-key", "ATL");
    expect(schedule).toBeNull();
  });

  it("handles missing arr_delayed as null", async () => {
    mockFetch.mockResolvedValueOnce(
      mockScheduleResponse([
        {
          dep_iata: "ATL",
          arr_time_ts: 1769805000,
          duration: 135,
          status: "active",
          dep_gate: null,
          arr_gate: null,
          arr_terminal: null,
          arr_baggage: null,
        },
      ]),
    );

    const schedule = await fetchFlightSchedule("UAL745", "test-key", "ATL");

    expect(schedule).not.toBeNull();
    expect(schedule!.arrDelayed).toBeNull();
  });

  it("handles missing arr_estimated_ts gracefully", async () => {
    mockFetch.mockResolvedValueOnce(
      mockScheduleResponse([
        {
          dep_iata: "ORD",
          arr_time_ts: 1769822340,
          duration: 134,
          status: "scheduled",
          dep_gate: "B9",
          arr_gate: "43",
          arr_terminal: "B",
          arr_baggage: "7",
        },
      ]),
    );

    const schedule = await fetchFlightSchedule("UAL745", "test-key", "ORD");

    expect(schedule).not.toBeNull();
    expect(schedule!.arrEstimatedTs).toBeNull();
  });
});
