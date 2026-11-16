import assert from "node:assert/strict";
import { test } from "node:test";
import { blocker, mediaOf, networksOf, outcomeOf, postBody } from "../src/postwire.ts";

test("networks: one per platform, needs normalised", () => {
  const n = networksOf({
    connections: [
      { platform: "telegram" },
      { platform: "telegram" },
      { platform: "tiktok", needs: "video" },
      { platform: "instagram", needs: "photo_or_video" },
      null,
    ],
  });
  assert.deepEqual(n, [
    { platform: "telegram", needs: "text" },
    { platform: "tiktok", needs: "video" },
    { platform: "instagram", needs: "photo_or_video" },
  ]);
  assert.deepEqual(networksOf({}), []);
});

test("media: video by extension, picture otherwise, none when not a link", () => {
  assert.equal(mediaOf("https://a.b/c.MP4?x=1").kind, "video");
  assert.equal(mediaOf(" https://a.b/c.jpg ").kind, "photo");
  assert.equal(mediaOf("hello").kind, "none");
  assert.equal(mediaOf("").kind, "none");
});

test("blocker and body", () => {
  const none = mediaOf("");
  const pic = mediaOf("https://a.b/c.png");
  const vid = mediaOf("https://a.b/c.mov");
  assert.ok(blocker({ platform: "tiktok", needs: "video" }, pic));
  assert.equal(blocker({ platform: "tiktok", needs: "video" }, vid), "");
  assert.ok(blocker({ platform: "instagram", needs: "photo_or_video" }, none));
  assert.equal(blocker({ platform: "telegram", needs: "text" }, none), "");
  assert.deepEqual(postBody(" hi ", ["telegram"], none), { platforms: ["telegram"], text: "hi" });
  assert.equal(postBody("hi", ["x"], pic).photo_url, "https://a.b/c.png");
  assert.equal(postBody("hi", ["x"], vid).video_url, "https://a.b/c.mov");
});

test("outcome", () => {
  const ok = outcomeOf({
    code: 200,
    body: {
      results: [
        { platform: "telegram", ok: true, url: "https://t.me/x/1" },
        { platform: "tiktok", ok: false, error: "needs video" },
      ],
    },
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.title, "Posted to Telegram");
  assert.equal(ok.url, "https://t.me/x/1");
  assert.match(ok.message, /TikTok: needs video/);
  assert.equal(outcomeOf({ code: 401, body: {} }).title, "PostWire did not accept the API key");
  assert.equal(outcomeOf({ code: 0, body: {} }).title, "Could not reach PostWire");
  assert.equal(outcomeOf({ code: 402, body: { upgrade_message: "Upgrade to post more" } }).message, "Upgrade to post more");
});
