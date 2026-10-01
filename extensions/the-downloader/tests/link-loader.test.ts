import { describe, it, expect, vi, beforeEach } from "vitest";
import { LinkContext } from "../src/lib/link-context";

vi.mock("../src/lib/sources/video", () => ({ loadVideoLink: vi.fn() }));
vi.mock("../src/lib/sources/post", () => ({ loadPostLink: vi.fn() }));
vi.mock("../src/lib/sources/page", () => ({ loadPageLink: vi.fn() }));
vi.mock("../src/lib/sources/archive", () => ({ loadArchivedPage: vi.fn() }));

import { loadVideoLink } from "../src/lib/sources/video";
import { loadPostLink } from "../src/lib/sources/post";
import { loadPageLink } from "../src/lib/sources/page";
import { loadArchivedPage } from "../src/lib/sources/archive";
import { LinkLoadError } from "../src/lib/link-context";
import { linkKindOf, loadLinkContext } from "../src/lib/link-loader";

const ctx = (kind: LinkContext["kind"], withBody = true): LinkContext => ({
  url: "u",
  kind,
  key: "k",
  site: "s",
  title: "t",
  facts: [],
  stats: [],
  body: { type: "paragraphs", paragraphs: withBody ? ["text"] : [] },
  fetchedAt: Date.now(),
});

beforeEach(() => {
  vi.mocked(loadVideoLink).mockReset().mockResolvedValue(ctx("video"));
  vi.mocked(loadPostLink).mockReset().mockResolvedValue(ctx("post"));
  vi.mocked(loadPageLink).mockReset().mockResolvedValue(ctx("page"));
  vi.mocked(loadArchivedPage)
    .mockReset()
    .mockResolvedValue({
      ...ctx("page"),
      archive: { viewUrl: "https://web.archive.org/web/1/u", savedOn: "2026-09-29" },
    });
});

describe("linkKindOf", () => {
  it("routes videos, galleries and everything else", () => {
    expect(linkKindOf("https://www.youtube.com/watch?v=a")).toBe("video");
    expect(linkKindOf("https://vm.tiktok.com/x")).toBe("video");
    expect(linkKindOf("https://www.instagram.com/p/x/")).toBe("post");
    expect(linkKindOf("https://www.reddit.com/r/x/comments/1/")).toBe("post");
    expect(linkKindOf("https://example.com/news")).toBe("page");
    expect(linkKindOf("https://open.spotify.com/track/1")).toBe("spotify");
  });
});

describe("loadLinkContext", () => {
  it("refuses anything that isn't an http(s) link before any tool runs", async () => {
    for (const bad of ["--batch-file=/etc/hosts", "file:///etc/passwd", "javascript:alert(1)", ""]) {
      await expect(loadLinkContext(bad)).rejects.toThrow("Invalid URL — provide an http(s) link.");
    }
    expect(loadVideoLink).not.toHaveBeenCalled();
    expect(loadPostLink).not.toHaveBeenCalled();
    expect(loadPageLink).not.toHaveBeenCalled();
  });

  it("adds a missing https:// before handing the link on", async () => {
    await loadLinkContext("instagram.com/p/norm-1/", { force: true });
    expect(vi.mocked(loadPostLink).mock.calls[0][0]).toBe("https://instagram.com/p/norm-1/");
  });

  it("sends each kind to its reader, with the language only for videos", async () => {
    await loadLinkContext("https://www.youtube.com/watch?v=route", { language: "de", force: true });
    expect(vi.mocked(loadVideoLink).mock.calls[0][1]).toMatchObject({ language: "de" });
    await loadLinkContext("https://example.com/route", { force: true });
    expect(loadPageLink).toHaveBeenCalled();
  });

  it("says Spotify isn't supported yet, pointing to Download instead of a retry", async () => {
    await expect(loadLinkContext("https://open.spotify.com/track/1")).rejects.toMatchObject({
      name: "LinkLoadError",
      message: "Spotify links aren't supported in chat yet. You can still download them.",
      fix: "download",
    });
  });

  it("caches a link with a body, and reads again when forced", async () => {
    const first = await loadLinkContext("https://example.com/cached");
    const second = await loadLinkContext("https://example.com/cached");
    expect(loadPageLink).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
    await loadLinkContext("https://example.com/cached", { force: true });
    expect(loadPageLink).toHaveBeenCalledTimes(2);
  });

  it("keys video caches by caption language", async () => {
    await loadLinkContext("https://youtu.be/lang", { language: "en" });
    await loadLinkContext("https://youtu.be/lang", { language: "de" });
    await loadLinkContext("https://youtu.be/lang", { language: "de" });
    expect(loadVideoLink).toHaveBeenCalledTimes(2);
  });

  it("doesn't cache a link without a body, so captions or a login show up next time", async () => {
    vi.mocked(loadPageLink).mockResolvedValue(ctx("page", false));
    await loadLinkContext("https://example.com/empty");
    await loadLinkContext("https://example.com/empty");
    expect(loadPageLink).toHaveBeenCalledTimes(2);
  });

  it("reads the Internet Archive's copy when asked, and caches it apart from the live page", async () => {
    const archived = await loadLinkContext("https://example.com/archived", { archived: true });
    expect(archived.archive?.savedOn).toBe("2026-09-29");
    expect(loadPageLink).not.toHaveBeenCalled();
    await loadLinkContext("https://example.com/archived", { archived: true });
    expect(loadArchivedPage).toHaveBeenCalledTimes(1);
    await loadLinkContext("https://example.com/archived");
    expect(loadPageLink).toHaveBeenCalledTimes(1);
  });

  it("falls back to the archived copy for the AI tools when a page refuses or has no text", async () => {
    vi.mocked(loadPageLink).mockRejectedValueOnce(new LinkLoadError("blocked", "archive"));
    expect((await loadLinkContext("https://example.com/f1", { archiveFallback: true })).archive).toBeDefined();
    vi.mocked(loadPageLink).mockResolvedValueOnce(ctx("page", false));
    expect((await loadLinkContext("https://example.com/f2", { archiveFallback: true })).archive).toBeDefined();

    // The chat, reading the live page, doesn't get the tools' archived copy from the cache.
    vi.mocked(loadPageLink).mockResolvedValueOnce(ctx("page"));
    expect((await loadLinkContext("https://example.com/f1")).archive).toBeUndefined();
  });

  it("keeps the live page's own answer when the archive has nothing either", async () => {
    vi.mocked(loadArchivedPage).mockRejectedValue(
      new LinkLoadError("The Internet Archive has no saved copy of this page."),
    );
    vi.mocked(loadPageLink).mockRejectedValueOnce(new LinkLoadError("blocked", "archive"));
    await expect(loadLinkContext("https://example.com/f3", { archiveFallback: true })).rejects.toThrow("blocked");
    vi.mocked(loadPageLink).mockResolvedValueOnce(ctx("page", false));
    const unreadable = await loadLinkContext("https://example.com/f4", { archiveFallback: true });
    expect(unreadable.archive).toBeUndefined();
  });

  it("never falls back for a login, a paywall or a legal block", async () => {
    vi.mocked(loadPageLink).mockRejectedValueOnce(
      new LinkLoadError("example.com asks for payment to read this page (HTTP 402). Open it in your browser."),
    );
    await expect(loadLinkContext("https://example.com/f6", { archiveFallback: true })).rejects.toThrow("HTTP 402");
    expect(loadArchivedPage).not.toHaveBeenCalled();
  });

  it("never falls back for a refusal of a local address", async () => {
    vi.mocked(loadPageLink).mockRejectedValueOnce(
      new Error("Won't read router.local: it's a local or private network address."),
    );
    await expect(loadLinkContext("https://example.com/f5", { archiveFallback: true })).rejects.toThrow("local");
    expect(loadArchivedPage).not.toHaveBeenCalled();
  });
});
