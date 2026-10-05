/**
 * Hits threads.com. Excluded from `npm test`; run deliberately with `npm run test:live`.
 *
 * The posts live in `live-posts.json` so they can be edited without touching this file.
 * A failure here is usually a signal, not a code defect: either a post was deleted (swap in
 * another covering the same behaviour) or Threads changed the payload the parser reads. The
 * fixtures in `threads-post.test.ts` cover the parsing logic itself.
 */
import { describe, expect, it } from "vitest";
import livePosts from "./live-posts.json";
import { resolveThreadsPost } from "./threads-post";
import type { MediaKind } from "./threads-post";

type LivePost = {
  name: string;
  url: string;
  code: string;
  kinds: MediaKind[];
  covers: string;
};

const POSTS = livePosts.posts as LivePost[];

describe("live-posts.json", () => {
  // A malformed edit should fail here with a clear reason, not as a confusing resolve error.
  it("is a usable fixture list", () => {
    expect(POSTS.length).toBeGreaterThan(0);

    for (const post of POSTS) {
      expect(post.name, "every post needs a name").toBeTruthy();
      expect(post.covers, `${post.name}: say what behaviour it covers`).toBeTruthy();
      expect(post.url, `${post.name}: url must be a threads.com link`).toMatch(
        /^https:\/\/(www\.)?threads\.(com|net)\//,
      );
      expect(post.code, `${post.name}: code must be a shortcode`).toMatch(/^[A-Za-z0-9_-]+$/);
      for (const kind of post.kinds) {
        expect(["image", "video", "audio"], `${post.name}: unknown kind "${kind}"`).toContain(kind);
      }

      // The trap this schema invites: pasting the /share/ id into `code`. They are
      // different identifiers — /share/InQUBOY9S/ resolves to code DcTZYVBkhjU — and the
      // mistake otherwise surfaces as a confusing "expected X to be Y" on a live fetch.
      const shareId = post.url.match(/\/share\/([^/?#]+)/)?.[1];
      expect(post.code, `${post.name}: code is the /share/ id, not the resolved shortcode`).not.toBe(shareId);
    }

    // Two entries resolving to the same post is a copy-paste slip, not extra coverage.
    const codes = POSTS.map((post) => post.code);
    expect(new Set(codes).size, "duplicate code in live-posts.json").toBe(codes.length);
  });
});

describe("resolving real Threads links", () => {
  it.each(POSTS)("resolves $name", async ({ url, code, kinds }) => {
    const post = await resolveThreadsPost(url);

    expect(post.code).toBe(code);
    expect(post.media.map((item) => item.kind)).toEqual(kinds);

    for (const item of post.media) {
      expect(item.url).toMatch(/^https:\/\//);
      // A signed CDN URL 403s with "Bad URL hash" if truncated. Length proves nothing —
      // assert the signature parameters themselves survived to the end of the string.
      const params = new URL(item.url).searchParams;
      expect(params.get("oh")).toBeTruthy();
      expect(params.get("oe")).toBeTruthy();
    }
  });
});
