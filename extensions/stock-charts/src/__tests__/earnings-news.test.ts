import { describe, it, expect, vi } from "vitest";
import { formatEarningsDate, generateIcs } from "../utils";

vi.mock("../yahoo-finance/client", () => ({
  get: vi.fn(),
  YahooFinanceError: class YahooFinanceError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.name = "YahooFinanceError";
      this.status = status;
    }
  },
}));

import { fetchNews } from "../yahoo-finance/news";
import { get } from "../yahoo-finance/client";

describe("formatEarningsDate", () => {
  it("formats a Unix timestamp to a readable date", () => {
    const ts = 1749744000; // Jun 12, 2025 12:00:00 UTC
    const result = formatEarningsDate(ts);
    expect(result).toContain("Jun");
    expect(result).toContain("12");
    expect(result).toContain("2025");
  });

  it("returns dash for undefined", () => {
    expect(formatEarningsDate(undefined)).toBe("—");
  });

  it("returns dash for 0", () => {
    expect(formatEarningsDate(0)).toBe("—");
  });

  it("formats a different date correctly", () => {
    const ts = 1706745600; // Feb 1, 2024 00:00:00 UTC
    const result = formatEarningsDate(ts);
    expect(result).toContain("2024");
  });
});

describe("generateIcs", () => {
  it("generates a valid ICS string", () => {
    const ts = 1749744000; // Jun 12, 2025 12:00:00 UTC
    const ics = generateIcs("AAPL", "Apple Inc.", ts);

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("SUMMARY:AAPL Earnings Call");
    expect(ics).toContain("DESCRIPTION:Earnings announcement for Apple Inc.");
    expect(ics).toContain("DTSTART:");
  });

  it("uses CRLF line endings per RFC 5545", () => {
    const ics = generateIcs("MSFT", "Microsoft Corp.", 1749744000);
    const lines = ics.split("\r\n");
    expect(lines.length).toBeGreaterThan(5);
  });

  it("formats DTSTART as UTC with Z suffix", () => {
    const ts = 1749744000;
    const ics = generateIcs("AAPL", "Apple Inc.", ts);
    const match = ics.match(/DTSTART:(\d{8}T\d{6}Z)/);
    expect(match).toBeTruthy();
    expect(match![1]).toMatch(/^\d{8}T\d{6}Z$/);
  });

  it("includes the correct UTC datetime", () => {
    const ts = 1749744000; // 2025-06-12T16:00:00Z
    const ics = generateIcs("AAPL", "Apple Inc.", ts);
    expect(ics).toContain("DTSTART:20250612T160000Z");
  });

  it("contains PRODID", () => {
    const ics = generateIcs("AAPL", "Apple Inc.", 1749744000);
    expect(ics).toContain("PRODID:-//Raycast Stock Charts//EN");
  });
});

describe("fetchNews", () => {
  it("parses news items from search response", async () => {
    const mockResponse = {
      news: [
        {
          title: "Apple reports record Q2 earnings",
          publisher: "Reuters",
          link: "https://example.com/article1",
          providerPublishTime: 1716120600,
        },
        {
          title: "iPhone 17 production ramp",
          publisher: "Bloomberg",
          link: "https://example.com/article2",
          providerPublishTime: 1716120000,
          thumbnail: {
            resolutions: [
              { url: "https://example.com/thumb.jpg", width: 140, height: 140 },
            ],
          },
        },
      ],
    };

    vi.mocked(get).mockResolvedValue(mockResponse);
    const items = await fetchNews("AAPL");

    expect(items).toHaveLength(2);
    expect(items[0].title).toBe("Apple reports record Q2 earnings");
    expect(items[0].publisher).toBe("Reuters");
    expect(items[0].link).toBe("https://example.com/article1");
    expect(items[1].thumbnail?.resolutions[0].url).toBe(
      "https://example.com/thumb.jpg",
    );
  });

  it("calls the search endpoint with correct params", async () => {
    vi.mocked(get).mockResolvedValue({ news: [] });

    await fetchNews("TSLA");

    expect(get).toHaveBeenCalledWith(
      "/v1/finance/search",
      {
        q: "TSLA",
        quotesCount: "0",
        newsCount: "5",
        listsCount: "0",
      },
      undefined,
    );
  });

  it("returns empty array when news is missing from response", async () => {
    vi.mocked(get).mockResolvedValue({});
    const items = await fetchNews("AAPL");
    expect(items).toEqual([]);
  });

  it("passes abort signal to get", async () => {
    vi.mocked(get).mockResolvedValue({ news: [] });
    const controller = new AbortController();

    await fetchNews("AAPL", controller.signal);

    expect(get).toHaveBeenCalledWith(
      "/v1/finance/search",
      expect.any(Object),
      controller.signal,
    );
  });
});
