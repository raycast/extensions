import { describe, it, expect } from "vitest";
import { formatNumber, formatDate, getFreshnessLabel, extractAuthor, getAuthorUrl, shortenTransport } from "./utils";

describe("formatNumber", () => {
  it("returns '0' for null or undefined", () => {
    expect(formatNumber(null)).toBe("0");
    expect(formatNumber(undefined)).toBe("0");
  });

  it("returns number as string for small numbers", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(1)).toBe("1");
    expect(formatNumber(999)).toBe("999");
  });

  it("formats thousands with K suffix", () => {
    expect(formatNumber(1000)).toBe("1K");
    expect(formatNumber(1500)).toBe("1.5K");
    expect(formatNumber(5800)).toBe("5.8K");
    expect(formatNumber(99999)).toBe("100K");
  });

  it("rounds 100K+ to nearest K without decimals", () => {
    expect(formatNumber(100000)).toBe("100K");
    expect(formatNumber(869000)).toBe("869K");
    expect(formatNumber(999999)).toBe("1000K");
  });

  it("formats millions with M suffix", () => {
    expect(formatNumber(1000000)).toBe("1M");
    expect(formatNumber(1500000)).toBe("1.5M");
    expect(formatNumber(5822857)).toBe("5.8M");
  });
});

describe("formatDate", () => {
  it("returns null for undefined", () => {
    expect(formatDate(undefined)).toBe(null);
  });

  it("formats date as DD.MM.YYYY", () => {
    expect(formatDate("2025-12-22T01:18:49Z")).toBe("22.12.2025");
    expect(formatDate("2025-01-05T00:00:00Z")).toBe("05.01.2025");
    expect(formatDate("2024-06-15T12:30:00Z")).toBe("15.06.2024");
  });
});

describe("getFreshnessLabel", () => {
  it("returns null for undefined", () => {
    expect(getFreshnessLabel(undefined)).toBe(null);
  });

  it("returns 'Updated<3M' for dates within 3 months", () => {
    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    expect(getFreshnessLabel(oneMonthAgo.toISOString())).toBe("Updated<3M");
  });

  it("returns 'Updated>3M' for dates 3-6 months old", () => {
    const now = new Date();
    const fourMonthsAgo = new Date(now.getTime() - 4 * 30 * 24 * 60 * 60 * 1000);
    expect(getFreshnessLabel(fourMonthsAgo.toISOString())).toBe("Updated>3M");
  });

  it("returns 'Updated>6M' for dates older than 6 months", () => {
    const now = new Date();
    const sevenMonthsAgo = new Date(now.getTime() - 7 * 30 * 24 * 60 * 60 * 1000);
    expect(getFreshnessLabel(sevenMonthsAgo.toISOString())).toBe("Updated>6M");
  });
});

describe("extractAuthor", () => {
  it("returns null when no inputs provided", () => {
    expect(extractAuthor(undefined, undefined)).toBe(null);
  });

  it("extracts author from GitHub URL", () => {
    expect(extractAuthor("https://github.com/upstash/context7", undefined)).toBe("upstash");
    expect(extractAuthor("https://github.com/modelcontextprotocol/servers", undefined)).toBe("modelcontextprotocol");
  });

  it("extracts author from server name as fallback", () => {
    expect(extractAuthor(undefined, "io.github.upstash/context7")).toBe("io.github.upstash");
    // The regex extracts the first segment before /
    expect(extractAuthor(undefined, "com.pulsemcp.mirror/author-package")).toBe("com.pulsemcp.mirror");
  });

  it("prefers GitHub URL over server name", () => {
    expect(extractAuthor("https://github.com/upstash/context7", "io.github.other/name")).toBe("upstash");
  });
});

describe("getAuthorUrl", () => {
  it("returns null when no author can be extracted", () => {
    expect(getAuthorUrl(undefined, undefined)).toBe(null);
  });

  it("returns GitHub URL for author", () => {
    expect(getAuthorUrl("https://github.com/upstash/context7", undefined)).toBe("https://github.com/upstash");
  });
});

describe("shortenTransport", () => {
  it("shortens streamable-http to HTTP", () => {
    expect(shortenTransport("streamable-http")).toBe("HTTP");
    expect(shortenTransport("Streamable-HTTP")).toBe("HTTP");
  });

  it("shortens sse to HTTP", () => {
    expect(shortenTransport("sse")).toBe("HTTP");
    expect(shortenTransport("SSE")).toBe("HTTP");
  });

  it("keeps other transport types as-is", () => {
    expect(shortenTransport("stdio")).toBe("stdio");
    expect(shortenTransport("websocket")).toBe("websocket");
  });
});
