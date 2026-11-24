import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSiteName, parseSiteName } from "./fetch-site-name";

describe("parseSiteName", () => {
  it("prefers og:site_name", () => {
    expect(
      parseSiteName(
        `<meta property="og:site_name" content="SendTestEmail"><title>Free Test Email | Something Else</title>`,
      ),
    ).toBe("SendTestEmail");
  });

  it("reads the attributes in either order and with single quotes", () => {
    expect(parseSiteName(`<meta content='AccuWeather' property='og:site_name'>`)).toBe("AccuWeather");
  });

  it("falls back to application-name", () => {
    expect(parseSiteName(`<meta name="application-name" content="Apollo">`)).toBe("Apollo");
  });

  it("reads the site end of the title across every separator", () => {
    expect(parseSiteName(`<title>Free Test Email | SendTestEmail.com</title>`)).toBe("SendTestEmail");
    expect(parseSiteName(`<title>Watch Later - YouTube</title>`)).toBe("YouTube");
    expect(parseSiteName(`<title>Article – The Guardian</title>`)).toBe("The Guardian");
    expect(parseSiteName(`<title>Article — The Guardian</title>`)).toBe("The Guardian");
    expect(parseSiteName(`<title>Video · YouTube</title>`)).toBe("YouTube");
  });

  it("keeps a title that names only the site", () => {
    expect(parseSiteName(`<title>Netflix</title>`)).toBe("Netflix");
  });

  it("decodes entities", () => {
    expect(parseSiteName(`<meta property="og:site_name" content="Fish &amp; Chips">`)).toBe("Fish & Chips");
    expect(parseSiteName(`<title>Tom&#39;s Diner | Dine&#x2d;Out</title>`)).toBe("Dine-Out");
  });

  it("stays quiet when nothing names the site", () => {
    expect(parseSiteName(`<title></title>`)).toBeUndefined();
    expect(parseSiteName(`<p>No metadata here</p>`)).toBeUndefined();
    expect(parseSiteName(`<meta property="og:site_name" content="  "><title></title>`)).toBeUndefined();
  });
});

describe("fetchSiteName", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("never fetches a target that is not a web URL", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    await expect(fetchSiteName("~/Downloads")).resolves.toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reads the name off the page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(`<title>Free Test Email | SendTestEmail.com</title>`),
      }),
    );

    await expect(fetchSiteName("https://sendtestemail.com/")).resolves.toBe("SendTestEmail");
  });

  it("treats a failed or unreadable page as no name", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, text: () => Promise.resolve("") }));
    await expect(fetchSiteName("https://example.com/")).resolves.toBeUndefined();

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(fetchSiteName("https://example.com/")).resolves.toBeUndefined();
  });

  it("ignores a name that sits past the head of the page", async () => {
    const padding = " ".repeat(70 * 1024);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(`${padding}<title>Late Name</title>`) }),
    );

    await expect(fetchSiteName("https://example.com/")).resolves.toBeUndefined();
  });
});
