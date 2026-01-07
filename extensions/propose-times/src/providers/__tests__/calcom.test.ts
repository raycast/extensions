import { describe, it, expect, vi, beforeEach } from "vitest";
import { calcomProvider } from "../calcom";
import type { ProviderConfig, LinkInfo, TimeSlot } from "../../types";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("calcomProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.log during tests
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  describe("fetchSlots", () => {
    const config: ProviderConfig = {
      calcomUsername: "testuser",
      calcomEventSlug: "meeting",
    };
    const startDate = new Date("2026-01-07");
    const endDate = new Date("2026-01-10");

    // Helper to set up two-call mock (event type then slots)
    function mockEventTypeAndSlots(
      eventTypeResponse: unknown,
      slotsResponse: unknown,
      eventTypeOk = true,
      slotsOk = true,
    ) {
      mockFetch
        .mockResolvedValueOnce({
          ok: eventTypeOk,
          status: eventTypeOk ? 200 : 404,
          json: async () => eventTypeResponse,
        })
        .mockResolvedValueOnce({
          ok: slotsOk,
          status: slotsOk ? 200 : 404,
          text: async () => JSON.stringify(slotsResponse),
        });
    }

    it("parses Cal.com slots response correctly", async () => {
      const eventTypeResponse = {
        status: "success",
        data: [
          {
            id: 123,
            slug: "meeting",
            title: "Meeting",
            lengthInMinutes: 30,
            lengthInMinutesOptions: [25, 45],
          },
        ],
      };
      const slotsResponse = {
        status: "success",
        data: {
          "2026-01-07": [
            { start: "2026-01-07T10:00:00Z" },
            { start: "2026-01-07T11:00:00Z" },
          ],
          "2026-01-08": [{ start: "2026-01-08T14:00:00Z" }],
        },
      };

      mockEventTypeAndSlots(eventTypeResponse, slotsResponse);

      const result = await calcomProvider.fetchSlots(
        config,
        startDate,
        endDate,
      );

      expect(result.slots).toHaveLength(3);
      expect(result.slots[0].start_at).toBe("2026-01-07T10:00:00Z");
      expect(result.slots[1].start_at).toBe("2026-01-07T11:00:00Z");
      expect(result.slots[2].start_at).toBe("2026-01-08T14:00:00Z");
    });

    it("handles empty slots response", async () => {
      const eventTypeResponse = {
        status: "success",
        data: [
          {
            id: 123,
            slug: "meeting",
            title: "Meeting",
            lengthInMinutes: 30,
          },
        ],
      };
      const slotsResponse = {
        status: "success",
        data: {},
      };

      mockEventTypeAndSlots(eventTypeResponse, slotsResponse);

      const result = await calcomProvider.fetchSlots(
        config,
        startDate,
        endDate,
      );

      expect(result.slots).toHaveLength(0);
    });

    it("calculates end_at based on event type default duration", async () => {
      const eventTypeResponse = {
        status: "success",
        data: [
          {
            id: 123,
            slug: "meeting",
            title: "Meeting",
            lengthInMinutes: 45, // 45-minute meetings
          },
        ],
      };
      const slotsResponse = {
        status: "success",
        data: {
          "2026-01-07": [{ start: "2026-01-07T10:00:00Z" }],
        },
      };

      mockEventTypeAndSlots(eventTypeResponse, slotsResponse);

      const result = await calcomProvider.fetchSlots(
        config,
        startDate,
        endDate,
      );

      // End time should be 45 minutes after start
      expect(result.slots[0].end_at).toBe("2026-01-07T10:45:00.000Z");
    });

    it("returns LinkInfo with durations from event type", async () => {
      const eventTypeResponse = {
        status: "success",
        data: [
          {
            id: 456,
            slug: "meeting",
            title: "Meeting",
            lengthInMinutes: 25,
            lengthInMinutesOptions: [25, 45],
          },
        ],
      };
      const slotsResponse = {
        status: "success",
        data: { "2026-01-07": [{ start: "2026-01-07T10:00:00Z" }] },
      };

      mockEventTypeAndSlots(eventTypeResponse, slotsResponse);

      const result = await calcomProvider.fetchSlots(
        config,
        startDate,
        endDate,
      );

      expect(result.linkInfo.id).toBe("456");
      expect(result.linkInfo.slug).toBe("meeting");
      expect(result.linkInfo.durations).toEqual([25, 45]);
      expect(result.linkInfo.defaultDuration).toBe(25);
    });

    it("falls back to single duration when lengthInMinutesOptions not provided", async () => {
      const eventTypeResponse = {
        status: "success",
        data: [
          {
            id: 123,
            slug: "meeting",
            title: "Meeting",
            lengthInMinutes: 60,
            // No lengthInMinutesOptions
          },
        ],
      };
      const slotsResponse = {
        status: "success",
        data: { "2026-01-07": [{ start: "2026-01-07T10:00:00Z" }] },
      };

      mockEventTypeAndSlots(eventTypeResponse, slotsResponse);

      const result = await calcomProvider.fetchSlots(
        config,
        startDate,
        endDate,
      );

      expect(result.linkInfo.durations).toEqual([60]);
      expect(result.linkInfo.defaultDuration).toBe(60);
    });

    it("throws error when username is missing", async () => {
      const badConfig: ProviderConfig = {
        calcomEventSlug: "meeting",
      };

      await expect(
        calcomProvider.fetchSlots(badConfig, startDate, endDate),
      ).rejects.toThrow("Cal.com username and event slug are required");
    });

    it("throws error when event slug is missing", async () => {
      const badConfig: ProviderConfig = {
        calcomUsername: "testuser",
      };

      await expect(
        calcomProvider.fetchSlots(badConfig, startDate, endDate),
      ).rejects.toThrow("Cal.com username and event slug are required");
    });

    it("throws error on slots API failure", async () => {
      const eventTypeResponse = { status: "success", data: [] };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => eventTypeResponse,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          text: async () => "Not found",
        });

      await expect(
        calcomProvider.fetchSlots(config, startDate, endDate),
      ).rejects.toThrow("Cal.com API error: 404 - Not found");
    });

    it("throws error on invalid JSON response", async () => {
      const eventTypeResponse = { status: "success", data: [] };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => eventTypeResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => "not valid json",
        });

      await expect(
        calcomProvider.fetchSlots(config, startDate, endDate),
      ).rejects.toThrow("Invalid JSON from Cal.com");
    });

    it("fetches both event type and slots with correct headers", async () => {
      const eventTypeResponse = { status: "success", data: [] };
      const slotsResponse = { status: "success", data: {} };

      mockEventTypeAndSlots(eventTypeResponse, slotsResponse);

      await calcomProvider.fetchSlots(config, startDate, endDate);

      // Should make 2 fetch calls
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // First call is event type
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("/event-types"),
        expect.objectContaining({
          headers: expect.objectContaining({
            "cal-api-version": "2024-06-14",
          }),
        }),
      );

      // Second call is slots
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("/slots"),
        expect.objectContaining({
          headers: expect.objectContaining({
            "cal-api-version": "2024-09-04",
          }),
        }),
      );
    });
  });

  describe("generateBookingUrl", () => {
    const config: ProviderConfig = {
      calcomUsername: "testuser",
      calcomEventSlug: "meeting",
    };
    const linkInfo: LinkInfo = {
      id: "testuser/meeting",
      slug: "meeting",
      durations: [15, 30, 45, 60],
      defaultDuration: 30,
    };
    const slot: TimeSlot = {
      start_at: "2026-01-07T10:00:00Z",
      end_at: "2026-01-07T10:30:00Z",
    };

    it("generates booker URL when bookerUrl is provided", () => {
      const url = calcomProvider.generateBookingUrl(
        config,
        linkInfo,
        slot,
        "America/New_York",
        "https://booker.example.com",
        30,
      );

      expect(url).toContain("https://booker.example.com/book?");
      expect(url).toContain("provider=calcom");
      expect(url).toContain("username=testuser");
      expect(url).toContain("event_slug=meeting");
      expect(url).toContain("duration=30");
      expect(url).toContain("tz=America%2FNew_York");
    });

    it("generates direct Cal.com URL when bookerUrl is not provided", () => {
      const url = calcomProvider.generateBookingUrl(
        config,
        linkInfo,
        slot,
        "America/New_York",
        undefined,
        30,
      );

      expect(url).toContain("https://cal.com/testuser/meeting");
      expect(url).toContain("date=2026-01-07");
      expect(url).toContain("slot=");
    });
  });

  describe("getFallbackUrl", () => {
    it("returns direct Cal.com URL", () => {
      const config: ProviderConfig = {
        calcomUsername: "testuser",
        calcomEventSlug: "meeting",
      };

      const url = calcomProvider.getFallbackUrl(config);

      expect(url).toBe("https://cal.com/testuser/meeting");
    });
  });
});
