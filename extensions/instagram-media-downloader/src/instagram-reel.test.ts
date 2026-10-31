import { describe, expect, it } from "vitest";
import { extractReelMedia } from "./instagram-reel";

/**
 * Synthetic stand-ins for the reels payload in story and highlight pages. The shapes follow
 * captured pages; every id, name and URL is fake.
 */
const NOW = Date.UTC(2026, 9, 28) / 1000;
const LATER = (NOW + 86400).toString(16).toUpperCase();
const cdn = (name: string, expires = LATER) => `https://scontent.example/v/${name}?oh=00_sig&oe=${expires}`;
const candidates = (name: string, expires?: string) => ({
  candidates: [
    { url: cdn(`${name}-1080.jpg`, expires), width: 1080, height: 1920 },
    { url: cdn(`${name}-640.jpg`, expires), width: 640, height: 1136 },
  ],
});

const photo = (pk: string, expires?: string) => ({ pk, media_type: 1, image_versions2: candidates(pk, expires) });
// Story videos carry `type` but no dimensions; every type is the same encode.
const video = (pk: string) => ({
  pk,
  media_type: 2,
  image_versions2: candidates(`${pk}-poster`),
  video_versions: [
    { type: 101, url: cdn(`${pk}-a.mp4`) },
    { type: 102, url: cdn(`${pk}-b.mp4`) },
  ],
});
const posterOnly = (pk: string) => ({ pk, media_type: 2, image_versions2: candidates(`${pk}-poster`) });

function page(data: unknown): string {
  const block = JSON.stringify({ require: [["Relay", { __bbox: { result: { data } } }]] });
  return `<!doctype html><p>A 5" ruler</p><script type="application/json">${block}</script>`;
}

const highlightPage = (items: unknown[], id = "111") =>
  page({
    xdt_api__v1__feed__reels_media__connection: {
      edges: [{ node: { id: `highlight:${id}`, reel_type: "highlight_reel", items } }],
      page_info: { has_next_page: false },
    },
  });

const storyPage = (items: unknown[], username = "example_user") =>
  page({
    xdt_api__v1__feed__reels_media: {
      reels_media: [{ id: "999", reel_type: "user_reel", user: { username }, items }],
    },
  });

describe("extractReelMedia", () => {
  it("returns every highlight item in order, videos as video, each with a thumbnail", () => {
    const result = extractReelMedia(
      highlightPage([photo("1"), video("2")]),
      { kind: "highlight", highlightId: "111" },
      NOW,
    );
    expect(result).toEqual({
      ok: true,
      items: [
        { id: "1", url: cdn("1-1080.jpg"), kind: "image", thumbnail: cdn("1-1080.jpg") },
        { id: "2", url: cdn("2-a.mp4"), kind: "video", thumbnail: cdn("2-poster-1080.jpg") },
      ],
    });
  });

  it("ignores a different highlight on the same page", () => {
    const result = extractReelMedia(highlightPage([photo("1")], "222"), { kind: "highlight", highlightId: "111" }, NOW);
    expect(result).toEqual({ ok: false, reason: "not-found" });
  });

  it("refuses a highlight with a video item that has no video file — never the poster instead", () => {
    const result = extractReelMedia(
      highlightPage([photo("1"), posterOnly("2")]),
      { kind: "highlight", highlightId: "111" },
      NOW,
    );
    expect(result).toEqual({ ok: false, reason: "incomplete" });
  });

  it("picks the requested story by id from that user's reel", () => {
    const ref = { kind: "story" as const, user: "Example_User", storyId: "2" };
    expect(extractReelMedia(storyPage([photo("1"), video("2")]), ref, NOW)).toEqual({
      ok: true,
      items: [{ id: "2", url: cdn("2-a.mp4"), kind: "video", thumbnail: cdn("2-poster-1080.jpg") }],
    });
  });

  it("misses when the requested story is not on the page, or the reel is someone else's", () => {
    const ref = { kind: "story" as const, user: "example_user", storyId: "3" };
    expect(extractReelMedia(storyPage([photo("1")]), ref, NOW)).toEqual({ ok: false, reason: "not-found" });
    const other = { kind: "story" as const, user: "someone_else" };
    expect(extractReelMedia(storyPage([photo("1")]), other, NOW)).toEqual({ ok: false, reason: "not-found" });
  });

  it("uses a fresh copy of the reel when another copy on the page is stale", () => {
    const stale = (NOW + 60).toString(16);
    const html = page({
      first: { id: "highlight:111", reel_type: "highlight_reel", items: [photo("1", stale)] },
      second: { id: "highlight:111", reel_type: "highlight_reel", items: [photo("1")] },
    });
    const result = extractReelMedia(html, { kind: "highlight", highlightId: "111" }, NOW);
    expect(result).toMatchObject({ ok: true, items: [{ id: "1", url: cdn("1-1080.jpg") }] });
  });

  it("never settles for a partial copy of a highlight when the full one is stale", () => {
    const stale = (NOW + 60).toString(16);
    const html = page({
      full: { id: "highlight:111", reel_type: "highlight_reel", items: [photo("1", stale), photo("2", stale)] },
      partial: { id: "highlight:111", reel_type: "highlight_reel", items: [photo("1")] },
    });
    expect(extractReelMedia(html, { kind: "highlight", highlightId: "111" }, NOW)).toEqual({
      ok: false,
      reason: "expired",
    });
  });

  it("judges only the first story when the link names none, not the stories after it", () => {
    const result = extractReelMedia(
      storyPage([photo("1"), posterOnly("2")]),
      { kind: "story", user: "example_user" },
      NOW,
    );
    expect(result).toMatchObject({ ok: true, items: [{ id: "1" }] });
  });

  it("refuses links that expire before the set could finish", () => {
    const stale = (NOW + 60).toString(16);
    const result = extractReelMedia(highlightPage([photo("1", stale)]), { kind: "highlight", highlightId: "111" }, NOW);
    expect(result).toEqual({ ok: false, reason: "expired" });
  });

  it("reports not-found for a page without a reel", () => {
    expect(extractReelMedia("<html>Log in</html>", { kind: "highlight", highlightId: "111" }, NOW)).toEqual({
      ok: false,
      reason: "not-found",
    });
  });
});
