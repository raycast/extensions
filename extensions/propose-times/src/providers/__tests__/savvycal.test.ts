import { describe, it, expect, vi, beforeEach } from "vitest";
import { savvycalProvider } from "../savvycal";
import type { ProviderConfig, LinkInfo, TimeSlot } from "../../types";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("savvycalProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.log during tests
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  describe("fetchSlots", () => {
    const config: ProviderConfig = {
      savvycalToken: "pt_secret_test",
      savvycalLink: "chat",
      savvycalUsername: "testuser",
    };
    const startDate = new Date("2026-01-07");
    const endDate = new Date("2026-01-10");

    // Helper to set up two-call mock (links then slots)
    function mockLinksAndSlots(
      linksResponse: unknown,
      slotsResponse: unknown,
      linksOk = true,
      slotsOk = true,
    ) {
      mockFetch
        .mockResolvedValueOnce({
          ok: linksOk,
          status: linksOk ? 200 : 400,
          text: async () => JSON.stringify(linksResponse),
        })
        .mockResolvedValueOnce({
          ok: slotsOk,
          status: slotsOk ? 200 : 400,
          text: async () => JSON.stringify(slotsResponse),
        });
    }

    it("fetches link info then slots", async () => {
      const linksResponse = {
        data: [
          {
            id: "link_123",
            slug: "chat",
            name: "Chat",
            durations: [15, 25, 30],
            default_duration: 25,
          },
        ],
      };
      const slotsResponse = [
        { start_at: "2026-01-07T10:00:00Z", end_at: "2026-01-07T10:30:00Z" },
        { start_at: "2026-01-07T11:00:00Z", end_at: "2026-01-07T11:30:00Z" },
      ];

      mockLinksAndSlots(linksResponse, slotsResponse);

      await savvycalProvider.fetchSlots(config, startDate, endDate);

      // Verify both API calls were made
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        "https://api.savvycal.com/v1/links",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer pt_secret_test",
          }),
        }),
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("/v1/links/link_123/slots"),
        expect.any(Object),
      );
    });

    it("parses slots response correctly", async () => {
      const linksResponse = {
        data: [{ id: "link_123", slug: "chat", name: "Chat" }],
      };
      const slotsResponse = [
        { start_at: "2026-01-07T10:00:00Z", end_at: "2026-01-07T10:30:00Z" },
        { start_at: "2026-01-08T14:00:00Z", end_at: "2026-01-08T14:30:00Z" },
      ];

      mockLinksAndSlots(linksResponse, slotsResponse);

      const result = await savvycalProvider.fetchSlots(
        config,
        startDate,
        endDate,
      );

      expect(result.slots).toHaveLength(2);
      expect(result.slots[0]).toEqual({
        start_at: "2026-01-07T10:00:00Z",
        end_at: "2026-01-07T10:30:00Z",
      });
    });

    it("handles nested data structure in slots response", async () => {
      const linksResponse = {
        data: [{ id: "link_123", slug: "chat", name: "Chat" }],
      };
      const slotsResponse = {
        data: [
          { start_at: "2026-01-07T10:00:00Z", end_at: "2026-01-07T10:30:00Z" },
        ],
      };

      mockLinksAndSlots(linksResponse, slotsResponse);

      const result = await savvycalProvider.fetchSlots(
        config,
        startDate,
        endDate,
      );

      expect(result.slots).toHaveLength(1);
    });

    it("handles entries key in links response", async () => {
      const linksResponse = {
        entries: [{ id: "link_456", slug: "chat", name: "Chat" }],
      };
      const slotsResponse = [
        { start_at: "2026-01-07T10:00:00Z", end_at: "2026-01-07T10:30:00Z" },
      ];

      mockLinksAndSlots(linksResponse, slotsResponse);

      const result = await savvycalProvider.fetchSlots(
        config,
        startDate,
        endDate,
      );

      expect(result.linkInfo.id).toBe("link_456");
    });

    it("returns LinkInfo with durations from API", async () => {
      const linksResponse = {
        data: [
          {
            id: "link_123",
            slug: "chat",
            name: "Chat",
            durations: [15, 25, 45],
            default_duration: 25,
          },
        ],
      };
      const slotsResponse: unknown[] = [];

      mockLinksAndSlots(linksResponse, slotsResponse);

      const result = await savvycalProvider.fetchSlots(
        config,
        startDate,
        endDate,
      );

      expect(result.linkInfo.durations).toEqual([15, 25, 45]);
      expect(result.linkInfo.defaultDuration).toBe(25);
    });

    it("defaults durations when not provided", async () => {
      const linksResponse = {
        data: [{ id: "link_123", slug: "chat", name: "Chat" }],
      };
      const slotsResponse: unknown[] = [];

      mockLinksAndSlots(linksResponse, slotsResponse);

      const result = await savvycalProvider.fetchSlots(
        config,
        startDate,
        endDate,
      );

      expect(result.linkInfo.durations).toEqual([30]);
      expect(result.linkInfo.defaultDuration).toBe(30);
    });

    it("throws error when token is missing", async () => {
      const badConfig: ProviderConfig = {
        savvycalLink: "chat",
      };

      await expect(
        savvycalProvider.fetchSlots(badConfig, startDate, endDate),
      ).rejects.toThrow("SavvyCal token and link slug are required");
    });

    it("throws error when link slug is missing", async () => {
      const badConfig: ProviderConfig = {
        savvycalToken: "pt_secret_test",
      };

      await expect(
        savvycalProvider.fetchSlots(badConfig, startDate, endDate),
      ).rejects.toThrow("SavvyCal token and link slug are required");
    });

    it("throws error when link not found", async () => {
      const linksResponse = {
        data: [{ id: "link_other", slug: "other", name: "Other" }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(linksResponse),
      });

      await expect(
        savvycalProvider.fetchSlots(config, startDate, endDate),
      ).rejects.toThrow('No scheduling link found with slug "chat"');
    });

    it("throws error on links API failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => "Unauthorized",
      });

      await expect(
        savvycalProvider.fetchSlots(config, startDate, endDate),
      ).rejects.toThrow("SavvyCal API error fetching links: 401");
    });
  });

  describe("generateBookingUrl", () => {
    const config: ProviderConfig = {
      savvycalToken: "pt_secret_test",
      savvycalLink: "chat",
      savvycalUsername: "testuser",
    };
    const linkInfo: LinkInfo = {
      id: "link_123",
      slug: "chat",
      durations: [15, 25, 30],
      defaultDuration: 25,
    };
    const slot: TimeSlot = {
      start_at: "2026-01-07T10:00:00Z",
      end_at: "2026-01-07T10:30:00Z",
    };

    it("generates booker URL when bookerUrl is provided", () => {
      const url = savvycalProvider.generateBookingUrl(
        config,
        linkInfo,
        slot,
        "America/New_York",
        "https://booker.example.com",
        25,
      );

      expect(url).toContain("https://booker.example.com/book?");
      expect(url).toContain("provider=savvycal");
      expect(url).toContain("link_id=link_123");
      expect(url).toContain("duration=25");
      expect(url).toContain("tz=America%2FNew_York");
    });

    it("generates direct SavvyCal URL when bookerUrl is not provided", () => {
      const url = savvycalProvider.generateBookingUrl(
        config,
        linkInfo,
        slot,
        "America/New_York",
        undefined,
        25,
      );

      expect(url).toContain("https://savvycal.com/testuser/chat");
      expect(url).toContain("from=2026-01-07");
      expect(url).toContain("time_zone=America%2FNew_York");
    });
  });

  describe("getFallbackUrl", () => {
    it("returns direct SavvyCal URL", () => {
      const config: ProviderConfig = {
        savvycalUsername: "testuser",
        savvycalLink: "chat",
      };

      const url = savvycalProvider.getFallbackUrl(config);

      expect(url).toBe("https://savvycal.com/testuser/chat");
    });
  });
});
