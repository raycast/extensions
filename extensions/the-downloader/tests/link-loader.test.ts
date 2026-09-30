import { describe, it, expect, vi, beforeEach } from "vitest";
import { LinkContext } from "../src/lib/link-context";

vi.mock("../src/lib/sources/video", () => ({ loadVideoLink: vi.fn() }));
vi.mock("../src/lib/sources/post", () => ({ loadPostLink: vi.fn() }));
vi.mock("../src/lib/sources/page", () => ({ loadPageLink: vi.fn() }));

import { loadVideoLink } from "../src/lib/sources/video";
import { loadPostLink } from "../src/lib/sources/post";
import { loadPageLink } from "../src/lib/sources/page";
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

  it("says Spotify isn't supported yet", async () => {
    await expect(loadLinkContext("https://open.spotify.com/track/1")).rejects.toThrow(
      "Spotify links aren't supported in chat yet.",
    );
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
});
