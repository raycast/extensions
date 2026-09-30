import { describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("./api", () => ({ fetchUpcomingFlights: mocks.fetch }));
import { fetchMenuBarFlights } from "./menu-bar-data";

describe("cached menu-bar fetch", () => {
  it("redacts the response before the promise resolves for caching", async () => {
    mocks.fetch.mockResolvedValue([
      {
        flight: {
          id: "flight",
          departureTime: "2026-09-15T12:00:00Z",
          secret: "PRIVATE-FLIGHT",
        },
        airline: { iata: "EI", secret: "PRIVATE-AIRLINE" },
        departureAirport: { iata: "DUB", secret: "PRIVATE-AIRPORT" },
        arrivalAirport: null,
        bookingNumber: "PRIVATE-BOOKING",
        seatNumber: "PRIVATE-SEAT",
        seatCabinClass: "PRIVATE-CABIN",
        seatPosition: "PRIVATE-POSITION",
      },
    ]);
    const result = await fetchMenuBarFlights();
    expect(result[0].flight.id).toBe("flight");
    expect(JSON.stringify(result)).not.toContain("PRIVATE-");
  });
});
