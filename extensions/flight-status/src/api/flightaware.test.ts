import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchFlightStatus } from "./flightaware";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

function mockFlightsResponse(
  flights: Record<string, unknown>[],
): Partial<Response> {
  return {
    ok: true,
    json: async () => ({ flights }),
  };
}

describe("fetchFlightStatus", () => {
  it("returns status for an active flight", async () => {
    mockFetch.mockResolvedValueOnce(
      mockFlightsResponse([
        {
          status: "En Route / On Time",
          diverted: false,
          cancelled: false,
          progress_percent: 62,
          gate_destination: "B14",
          terminal_destination: "B",
          baggage_claim: "7",
          estimated_on: "2025-07-01T18:30:00Z",
          estimated_in: "2025-07-01T18:38:00Z",
          actual_on: null,
          actual_in: null,
        },
      ]),
    );

    const status = await fetchFlightStatus("UAL745", "test-key");

    expect(status).not.toBeNull();
    expect(status!.estimatedOn).toBe("2025-07-01T18:30:00Z");
    expect(status!.estimatedIn).toBe("2025-07-01T18:38:00Z");
    expect(status!.status).toBe("En Route / On Time");
    expect(status!.diverted).toBe(false);
    expect(status!.progressPercent).toBe(62);
    expect(status!.gateDestination).toBe("B14");
    expect(status!.terminalDestination).toBe("B");
    expect(status!.baggageClaim).toBe("7");
  });

  it("sends x-apikey header", async () => {
    mockFetch.mockResolvedValueOnce(mockFlightsResponse([]));

    await fetchFlightStatus("UAL745", "my-api-key");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/flights/UAL745"),
      expect.objectContaining({
        headers: expect.objectContaining({ "x-apikey": "my-api-key" }),
      }),
    );
  });

  it("returns null when flights array is empty", async () => {
    mockFetch.mockResolvedValueOnce(mockFlightsResponse([]));

    const status = await fetchFlightStatus("UAL999", "test-key");
    expect(status).toBeNull();
  });

  it("returns null on API error", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

    const status = await fetchFlightStatus("UAL745", "bad-key");
    expect(status).toBeNull();
  });

  it("returns null on network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const status = await fetchFlightStatus("UAL745", "test-key");
    expect(status).toBeNull();
  });

  it("returns null when response body is not JSON", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new SyntaxError("Unexpected token < in JSON");
      },
    });

    const status = await fetchFlightStatus("UAL745", "test-key");
    expect(status).toBeNull();
  });

  it("selects the active flight from multiple results", async () => {
    mockFetch.mockResolvedValueOnce(
      mockFlightsResponse([
        {
          status: "Arrived / Gate Arrival",
          diverted: false,
          cancelled: false,
          progress_percent: 100,
          gate_destination: "A5",
          terminal_destination: "A",
          baggage_claim: "3",
          estimated_on: "2025-07-01T14:00:00Z",
          estimated_in: "2025-07-01T14:10:00Z",
          actual_on: "2025-07-01T14:02:00Z",
          actual_in: "2025-07-01T14:08:00Z",
        },
        {
          status: "En Route / Delayed",
          diverted: false,
          cancelled: false,
          progress_percent: 45,
          gate_destination: "B14",
          terminal_destination: "B",
          baggage_claim: null,
          estimated_on: "2025-07-01T22:15:00Z",
          estimated_in: "2025-07-01T22:25:00Z",
          actual_on: null,
          actual_in: null,
        },
      ]),
    );

    const status = await fetchFlightStatus("UAL745", "test-key");

    expect(status).not.toBeNull();
    expect(status!.status).toBe("En Route / Delayed");
    expect(status!.progressPercent).toBe(45);
    expect(status!.estimatedOn).toBe("2025-07-01T22:15:00Z");
  });

  it("returns null when all flights have arrived", async () => {
    mockFetch.mockResolvedValueOnce(
      mockFlightsResponse([
        {
          status: "Arrived",
          diverted: false,
          cancelled: false,
          progress_percent: 100,
          gate_destination: "A5",
          terminal_destination: "A",
          baggage_claim: "3",
          estimated_on: "2025-07-01T14:00:00Z",
          estimated_in: "2025-07-01T14:10:00Z",
          actual_on: "2025-07-01T14:02:00Z",
          actual_in: "2025-07-01T14:08:00Z",
        },
      ]),
    );

    const status = await fetchFlightStatus("UAL745", "test-key");
    expect(status).toBeNull();
  });

  it("skips cancelled flights", async () => {
    mockFetch.mockResolvedValueOnce(
      mockFlightsResponse([
        {
          status: "Cancelled",
          diverted: false,
          cancelled: true,
          progress_percent: null,
          gate_destination: null,
          terminal_destination: null,
          baggage_claim: null,
          estimated_on: null,
          estimated_in: null,
          actual_on: null,
          actual_in: null,
        },
      ]),
    );

    const status = await fetchFlightStatus("UAL745", "test-key");
    expect(status).toBeNull();
  });

  it("skips a flight with the American 'Canceled' spelling", async () => {
    mockFetch.mockResolvedValueOnce(
      mockFlightsResponse([
        {
          status: "Canceled", // one 'l', and the cancelled boolean is false
          diverted: false,
          cancelled: false,
          progress_percent: null,
          gate_destination: null,
          terminal_destination: null,
          baggage_claim: null,
          estimated_on: "2026-02-02T01:09:00Z",
          estimated_in: "2026-02-02T01:19:00Z",
          actual_on: null,
          actual_in: null,
        },
      ]),
    );

    const status = await fetchFlightStatus("UAL745", "test-key");
    expect(status).toBeNull();
  });

  it("handles missing optional fields gracefully", async () => {
    mockFetch.mockResolvedValueOnce(
      mockFlightsResponse([
        {
          status: "En Route",
          diverted: false,
          cancelled: false,
          progress_percent: null,
          gate_destination: null,
          terminal_destination: null,
          baggage_claim: null,
          estimated_on: null,
          estimated_in: null,
          actual_on: null,
          actual_in: null,
        },
      ]),
    );

    const status = await fetchFlightStatus("UAL745", "test-key");

    expect(status).not.toBeNull();
    expect(status!.estimatedOn).toBeNull();
    expect(status!.estimatedIn).toBeNull();
    expect(status!.diverted).toBe(false);
    expect(status!.progressPercent).toBeNull();
    expect(status!.gateDestination).toBeNull();
    expect(status!.terminalDestination).toBeNull();
    expect(status!.baggageClaim).toBeNull();
  });

  it("prioritizes active diverted flight over other active flights", async () => {
    mockFetch.mockResolvedValueOnce(
      mockFlightsResponse([
        {
          status: "En Route",
          diverted: false,
          cancelled: false,
          progress_percent: 30,
          gate_destination: "B14",
          terminal_destination: "B",
          baggage_claim: null,
          estimated_on: "2026-02-02T01:09:00Z",
          estimated_in: "2026-02-02T01:19:00Z",
          actual_on: null,
          actual_in: null,
        },
        {
          status: "Diverted",
          diverted: true,
          cancelled: false,
          progress_percent: 50,
          gate_destination: "G6",
          terminal_destination: "1",
          baggage_claim: "14",
          estimated_on: "2026-01-30T23:05:31Z",
          estimated_in: "2026-01-30T23:36:00Z",
          actual_on: null,
          actual_in: null,
        },
      ]),
    );

    const status = await fetchFlightStatus("UAL745", "test-key");

    expect(status).not.toBeNull();
    expect(status!.diverted).toBe(true);
    expect(status!.status).toBe("Diverted");
    expect(status!.gateDestination).toBe("G6");
    expect(status!.baggageClaim).toBe("14");
  });

  it("skips completed diverted flight and selects active flight instead", async () => {
    // Mirrors real UA745 data: completed diversion + active repositioning flight
    mockFetch.mockResolvedValueOnce(
      mockFlightsResponse([
        {
          status: "En Route / Delayed",
          diverted: false,
          cancelled: false,
          progress_percent: 11,
          gate_destination: null,
          terminal_destination: null,
          baggage_claim: null,
          estimated_on: "2026-01-30T23:05:31Z",
          estimated_in: "2026-01-30T23:36:00Z",
          actual_on: null,
          actual_in: null,
        },
        {
          status: "Diverted",
          diverted: true,
          cancelled: true,
          progress_percent: 100,
          gate_destination: "G6",
          terminal_destination: "1",
          baggage_claim: "14",
          estimated_on: null,
          estimated_in: "2026-01-30T21:47:00Z",
          actual_on: null,
          actual_in: null,
        },
      ]),
    );

    const status = await fetchFlightStatus("UAL745", "test-key");

    expect(status).not.toBeNull();
    expect(status!.diverted).toBe(false);
    expect(status!.status).toBe("En Route / Delayed");
  });

  it("returns null when only result is a completed diversion", async () => {
    mockFetch.mockResolvedValueOnce(
      mockFlightsResponse([
        {
          status: "Diverted",
          diverted: true,
          cancelled: true,
          progress_percent: 100,
          gate_destination: "G6",
          terminal_destination: "1",
          baggage_claim: "14",
          estimated_on: null,
          estimated_in: "2026-01-30T21:47:00Z",
          actual_on: null,
          actual_in: null,
        },
      ]),
    );

    const status = await fetchFlightStatus("UAL745", "test-key");
    expect(status).toBeNull();
  });

  it("prefers en-route flight over future scheduled leg", async () => {
    mockFetch.mockResolvedValueOnce(
      mockFlightsResponse([
        {
          status: "Scheduled",
          diverted: false,
          cancelled: false,
          progress_percent: null,
          gate_destination: null,
          terminal_destination: null,
          baggage_claim: null,
          estimated_on: "2026-02-03T02:30:00Z",
          estimated_in: "2026-02-03T02:40:00Z",
          actual_on: null,
          actual_in: null,
        },
        {
          status: "En Route / On Time",
          diverted: false,
          cancelled: false,
          progress_percent: 35,
          gate_destination: "S8",
          terminal_destination: "S",
          baggage_claim: null,
          estimated_on: "2026-01-31T20:15:00Z",
          estimated_in: "2026-01-31T20:25:00Z",
          actual_on: null,
          actual_in: null,
        },
      ]),
    );

    const status = await fetchFlightStatus("DAL389", "test-key");

    expect(status).not.toBeNull();
    expect(status!.status).toBe("En Route / On Time");
    expect(status!.progressPercent).toBe(35);
    expect(status!.gateDestination).toBe("S8");
  });

  it("falls back to active flight when no diversion exists", async () => {
    mockFetch.mockResolvedValueOnce(
      mockFlightsResponse([
        {
          status: "Arrived / Gate Arrival",
          diverted: false,
          cancelled: false,
          progress_percent: 100,
          gate_destination: "47",
          terminal_destination: "B",
          baggage_claim: "7",
          estimated_on: "2025-07-01T14:00:00Z",
          estimated_in: "2025-07-01T14:10:00Z",
          actual_on: "2025-07-01T14:02:00Z",
          actual_in: "2025-07-01T14:08:00Z",
        },
        {
          status: "En Route / On Time",
          diverted: false,
          cancelled: false,
          progress_percent: 30,
          gate_destination: "B14",
          terminal_destination: "B",
          baggage_claim: null,
          estimated_on: "2025-07-01T22:15:00Z",
          estimated_in: "2025-07-01T22:25:00Z",
          actual_on: null,
          actual_in: null,
        },
      ]),
    );

    const status = await fetchFlightStatus("UAL745", "test-key");

    expect(status).not.toBeNull();
    expect(status!.diverted).toBe(false);
    expect(status!.status).toBe("En Route / On Time");
  });
});
