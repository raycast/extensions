import { describe, expect, it } from "vitest";
import { extractPostMedia } from "./instagram-post";

/**
 * Synthetic stand-ins for the payload Instagram embeds in a post page's <script> tags. The
 * shapes follow captured pages; every code, id and URL is fake.
 */
const CODE = "AbCdEfGhIjK";
const NOW = Date.UTC(2026, 9, 28) / 1000;
// Signed CDN links in captured pages were valid for days.
const LATER = (NOW + 86400).toString(16).toUpperCase();

const cdn = (name: string, expires = LATER) => `https://scontent.example/v/${name}?stp=dst-jpg&oh=00_sig&oe=${expires}`;
const image = (name: string, expires?: string) => ({
  candidates: [
    { url: cdn(`${name}-1080.jpg`, expires), width: 1080, height: 1350 },
    { url: cdn(`${name}-640.jpg`, expires), width: 640, height: 800 },
  ],
});

// Carousel children carry codes of their own, never the parent's.
const photo = (id: string) => ({ id, code: `Child_${id}`, media_type: 1, image_versions2: image(id) });
const video = (id: string) => ({
  id,
  media_type: 2,
  image_versions2: image(`${id}-poster`),
  video_versions: [
    { url: cdn(`${id}-480.mp4`), width: 480, height: 854 },
    { url: cdn(`${id}-720.mp4`), width: 720, height: 1280 },
  ],
});

/** The 30-key feed stub a page carries for a post it has not loaded in full. */
const reelStub = { code: CODE, media_type: 2, product_type: "clips", image_versions2: image("stub-poster") };
const fullReel = { code: CODE, product_type: "clips", ...video("reel") };

function page(...nodes: unknown[]): string {
  const scripts = nodes
    .map(
      (node) => `<script type="application/json">{"require":[["Bbox",{"items":[${JSON.stringify(node)}]}]]}</script>`,
    )
    .join("\n");
  // A stray quote in body text BEFORE the scripts must not derail the brace scan.
  return `<!doctype html><html><body><p>A 5" ruler</p>${scripts}</body></html>`;
}

const run = (html: string) => extractPostMedia(html, CODE, NOW);

describe("extractPostMedia", () => {
  it("takes the full reel node over the stub that comes first, and returns the video", () => {
    expect(run(page(reelStub, fullReel))).toEqual({
      ok: true,
      media: [{ url: cdn("reel-720.mp4"), kind: "video" }],
    });
  });

  it("refuses a page that only has the stub — never the poster in place of the video", () => {
    expect(run(page(reelStub))).toEqual({ ok: false, reason: "incomplete" });
  });

  it("returns every carousel item in order, video items as video", () => {
    const carousel = {
      code: CODE,
      media_type: 8,
      carousel_media_count: 3,
      carousel_media: [photo("a"), video("b"), photo("c")],
    };
    expect(run(page(carousel))).toEqual({
      ok: true,
      media: [
        { url: cdn("a-1080.jpg"), kind: "image" },
        { url: cdn("b-720.mp4"), kind: "video" },
        { url: cdn("c-1080.jpg"), kind: "image" },
      ],
    });
  });

  it("refuses a carousel with fewer items than it declares", () => {
    const partial = { code: CODE, media_type: 8, carousel_media_count: 3, carousel_media: [photo("a"), photo("b")] };
    expect(run(page(partial))).toEqual({ ok: false, reason: "incomplete" });
  });

  it("refuses a carousel stub whose items carry no type", () => {
    const stub = {
      code: CODE,
      media_type: 8,
      carousel_media_count: 2,
      carousel_media: [
        { id: "a", image_versions2: image("a") },
        { id: "b", image_versions2: image("b") },
      ],
    };
    expect(run(page(stub))).toEqual({ ok: false, reason: "incomplete" });
  });

  it("refuses a carousel whose video item has no video file", () => {
    const { video_versions: _dropped, ...posterOnly } = video("b");
    void _dropped;
    const carousel = { code: CODE, media_type: 8, carousel_media_count: 2, carousel_media: [photo("a"), posterOnly] };
    expect(run(page(carousel))).toEqual({ ok: false, reason: "incomplete" });
  });

  it("refuses candidates whose URLs are not usable https URLs", () => {
    const bad = {
      code: CODE,
      media_type: 1,
      image_versions2: { candidates: [{ url: "http://scontent.example/a.jpg" }, { url: "https://" }] },
    };
    expect(run(page(bad))).toEqual({ ok: false, reason: "incomplete" });
  });

  it.each([
    ["already expired", NOW - 10],
    ["expiring before a long carousel could finish", NOW + 30 * 60],
  ])("refuses a node whose links are %s", (_, expiry) => {
    const stale = { code: CODE, media_type: 1, image_versions2: image("a", expiry.toString(16)) };
    expect(run(page(stale))).toEqual({ ok: false, reason: "expired" });
  });

  it.each([
    ["missing", undefined],
    ["null", null],
    ["a string", "2"],
  ])("refuses a carousel whose declared count is %s", (_, count) => {
    const carousel = { code: CODE, media_type: 8, carousel_media_count: count, carousel_media: [photo("a")] };
    expect(run(page(carousel))).toEqual({ ok: false, reason: "incomplete" });
  });

  it("picks the first candidate when none carries dimensions", () => {
    const bare = {
      code: CODE,
      media_type: 1,
      image_versions2: { candidates: [{ url: cdn("big.jpg") }, { url: cdn("small.jpg") }] },
    };
    expect(run(page(bare))).toEqual({ ok: true, media: [{ url: cdn("big.jpg"), kind: "image" }] });
  });

  it("calls two complete nodes that disagree ambiguous rather than guessing", () => {
    const one = { ...photo("one"), code: CODE };
    const other = { ...photo("other"), code: CODE };
    expect(run(page(one, other))).toEqual({ ok: false, reason: "ambiguous" });
  });

  it("uses a fresh copy of the post when an earlier copy's links are stale", () => {
    const stale = { code: CODE, media_type: 1, image_versions2: image("same", (NOW - 10).toString(16)) };
    const fresh = { code: CODE, media_type: 1, image_versions2: image("same") };
    expect(run(page(stale, fresh))).toEqual({ ok: true, media: [{ url: cdn("same-1080.jpg"), kind: "image" }] });
  });

  it("accepts two complete copies of the same post", () => {
    const one = { ...photo("same"), code: CODE };
    expect(run(page(one, one))).toEqual({ ok: true, media: [{ url: cdn("same-1080.jpg"), kind: "image" }] });
  });

  it("ignores other posts, including carousel children with their own codes", () => {
    const otherPost = { ...photo("other"), code: "ZzZzZzZzZzZ" };
    expect(run(page(otherPost))).toEqual({ ok: false, reason: "not-found" });
  });

  it("is not thrown off by braces and quotes inside captions", () => {
    const captioned = { caption: { text: 'a "quoted" {brace} \\ caption' }, ...photo("a"), code: CODE };
    expect(run(page(captioned))).toEqual({ ok: true, media: [{ url: cdn("a-1080.jpg"), kind: "image" }] });
  });

  it("reports not-found for a page with no scripts at all", () => {
    expect(run("<html><body>Login</body></html>")).toEqual({ ok: false, reason: "not-found" });
  });
});
