import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

vi.mock("../src/lib/safe-fetch", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/safe-fetch")>()),
  safeFetch: vi.fn(),
}));

import { HttpError, safeFetch } from "../src/lib/safe-fetch";
import { LinkLoadError, bodyText, dossierMarkdown } from "../src/lib/link-context";
import { availabilityUrl, loadArchivedPage, parseAvailability } from "../src/lib/sources/archive";

const fixture = (name: string) => fs.readFileSync(path.join(__dirname, "fixtures/links", name));
const json = (name: string) => JSON.parse(fixture(name).toString("utf8")) as unknown;
// Real Wayback Machine answers, recorded 2026-09-30.
const NASA = "https://www.nasa.gov/news-release/nasa-awards-orbital-safety-analysis-support-services-contract/";

describe("availabilityUrl", () => {
  it("asks the Wayback Machine about the exact URL", () => {
    expect(availabilityUrl("https://example.com/a?b=1&c=2")).toBe(
      "https://archive.org/wayback/available?url=https%3A%2F%2Fexample.com%2Fa%3Fb%3D1%26c%3D2",
    );
  });
});

describe("parseAvailability", () => {
  it("builds the raw snapshot URL (no Wayback toolbar) for the page asked about", () => {
    expect(parseAvailability(json("wayback-available.json"), NASA)).toEqual({
      rawUrl: `https://web.archive.org/web/20260929232004id_/${NASA}`,
      viewUrl: `https://web.archive.org/web/20260929232004/${NASA}`,
      savedOn: "2026-09-29",
    });
  });

  it("finds nothing when the page was never saved, or the copy is empty", () => {
    expect(parseAvailability(json("wayback-none.json"), "https://example.com/x")).toBeUndefined();
    // The FT article was saved with HTTP 204: no content.
    expect(parseAvailability(json("wayback-empty-snapshot.json"), "https://www.ft.com/content/x")).toBeUndefined();
  });

  it("ignores answers it doesn't understand", () => {
    const odd = { archived_snapshots: { closest: { status: "200", available: true, timestamp: "../../etc" } } };
    expect(parseAvailability(odd, NASA)).toBeUndefined();
    expect(parseAvailability("nonsense", NASA)).toBeUndefined();
  });
});

describe("loadArchivedPage", () => {
  beforeEach(() => vi.mocked(safeFetch).mockReset());

  it("reads the saved copy and says it's one", async () => {
    vi.mocked(safeFetch)
      .mockResolvedValueOnce({
        url: availabilityUrl(NASA),
        status: 200,
        contentType: "application/json",
        body: fixture("wayback-available.json"),
      })
      .mockResolvedValueOnce({
        url: `https://web.archive.org/web/20260929232004id_/${NASA}`,
        status: 200,
        contentType: "text/html; charset=UTF-8",
        body: fixture("wayback-snapshot.html"),
      });
    const ctx = await loadArchivedPage(NASA, {});
    // The chat stays the page's own: same URL and key as the live page.
    expect(ctx).toMatchObject({ kind: "page", url: NASA, key: NASA, site: "NASA" });
    expect(ctx.archive).toEqual({
      viewUrl: `https://web.archive.org/web/20260929232004/${NASA}`,
      savedOn: "2026-09-29",
    });
    expect(bodyText(ctx.body)).toContain("Omitron");
    expect(dossierMarkdown(ctx)).toContain("- Read from: the Internet Archive's copy saved 2026-09-29");
    expect(vi.mocked(safeFetch).mock.calls[1][0]).toBe(`https://web.archive.org/web/20260929232004id_/${NASA}`);
    // web.archive.org rate-limits a browser User-Agent over HTTP/1.1 (HTTP 429), so the reader names itself.
    for (const [, options] of vi.mocked(safeFetch).mock.calls) {
      expect(options?.userAgent).toMatch(/TheDownloader/);
    }
  });

  it("says when the Internet Archive has no copy", async () => {
    vi.mocked(safeFetch).mockResolvedValueOnce({
      url: "u",
      status: 200,
      contentType: "application/json",
      body: fixture("wayback-none.json"),
    });
    await expect(loadArchivedPage("https://example.com/x", {})).rejects.toThrow(
      new LinkLoadError("The Internet Archive has no saved copy of this page."),
    );
  });

  it("says the Internet Archive is busy when it rate-limits", async () => {
    vi.mocked(safeFetch).mockRejectedValueOnce(new HttpError(429, "web.archive.org"));
    await expect(loadArchivedPage(NASA, {})).rejects.toThrow(
      new LinkLoadError("The Internet Archive is busy right now (HTTP 429). Try again in a minute."),
    );
  });
});
