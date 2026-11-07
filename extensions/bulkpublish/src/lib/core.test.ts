import assert from "node:assert/strict";
import { test } from "node:test";
import {
  apiErrorMessage,
  buildPostBody,
  type Channel,
  countsFor,
  firstLine,
  parseChannel,
  parsePost,
  planTargets,
  platformLength,
} from "./core.ts";

const channel = (over: Partial<Record<string, unknown>> = {}) =>
  parseChannel({ id: 1, platform: "x", accountName: "Acme", isActive: true, tokenStatus: "valid", ...over }) as Channel;

test("parseChannel reads the fields the API returns", () => {
  const c = channel({ profileImage: "https://example.com/a.png" });
  assert.equal(c.name, "Acme");
  assert.equal(c.usable, true);
  assert.equal(c.profileImage, "https://example.com/a.png");
  assert.equal(parseChannel({ id: "x" }), null);
});

test("parseChannel explains why a channel can't be used", () => {
  assert.equal(channel({ needsReconnect: true }).problem, "Needs reconnecting");
  assert.equal(channel({ isActive: false }).problem, "Turned off in BulkPublish");
  assert.equal(channel({ platformAvailable: false, platformMessage: "Paused" }).problem, "Paused");
  assert.equal(channel({ tokenStatus: "expiring_soon", autoRenews: false }).warning, "Connection expires soon");
  assert.equal(channel({ tokenStatus: "expiring_soon", autoRenews: true }).warning, undefined);
});

test("parsePost maps destinations and media", () => {
  const p = parsePost({
    id: 7,
    content: "Hello",
    status: "partial",
    approvalStatus: "none",
    scheduledAt: null,
    publishedAt: "2026-11-01T10:00:00Z",
    postPlatforms: [
      { id: 1, channelId: 3, platform: "x", status: "published", platformUrl: "https://x.com/a/1" },
      { id: 2, channelId: 4, platform: "linkedin", status: "failed", errorMessage: "Token expired" },
    ],
    mediaFiles: [{ id: 9, fileName: "a.png", mimeType: "image/png", previewUrl: "https://cdn/a.webp" }],
    labels: [{ id: 2, name: "Launch", color: "#ff0000" }],
  });
  assert.ok(p);
  assert.equal(p.destinations[0].url, "https://x.com/a/1");
  assert.equal(p.destinations[1].error, "Token expired");
  assert.equal(p.media[0].previewUrl, "https://cdn/a.webp");
  assert.equal(p.labels[0].name, "Launch");
});

test("planTargets skips channels that need media", () => {
  const x = channel();
  const tiktok = channel({ id: 2, platform: "tiktok", accountName: "Clips" });
  const broken = channel({ id: 3, needsReconnect: true });
  const r = planTargets([x, tiktok, broken], [1, 2, 3], null);
  assert.deepEqual(
    r.targets.map((t) => t.id),
    [1],
  );
  assert.deepEqual(
    r.skipped.map((s) => s.reason),
    ["needs a video", "needs reconnecting"],
  );
  assert.equal(planTargets([tiktok], [2], "video").targets.length, 1);
});

test("buildPostBody schedules and sets post types for media", () => {
  const ig = channel({ id: 5, platform: "instagram" });
  const body = buildPostBody([ig], "Hi", [11], "video", { scheduledAt: "2026-12-01T09:00:00.000Z", timezone: "UTC" });
  assert.equal(body.status, "scheduled");
  assert.deepEqual(body.channels, [{ channelId: 5, platform: "instagram" }]);
  assert.deepEqual(body.mediaFiles, [11]);
  assert.deepEqual(body.postTypeOverrides, { instagram: "reel" });
  const draft = buildPostBody([ig], "Hi", [], null);
  assert.equal(draft.status, "draft");
  assert.equal("mediaFiles" in draft, false);
});

test("X counts links as 23 characters", () => {
  const text = "Read https://www.bulkpublish.com/blog/a-very-long-article-slug-that-goes-on";
  assert.equal(platformLength(text, "x"), 5 + 23);
  const [x] = countsFor("a".repeat(281), ["x"]);
  assert.equal(x.over, true);
});

test("firstLine skips blank lines and truncates", () => {
  assert.equal(firstLine("\n\n  Hello world  \nmore"), "Hello world");
  assert.equal(firstLine("word ".repeat(40), 20).endsWith("…"), true);
});

test("apiErrorMessage gives an actionable sentence", () => {
  assert.match(apiErrorMessage(401, null), /API key/);
  assert.match(apiErrorMessage(403, { error: { code: "APPROVAL_REQUIRED", message: "x" } }), /approval/);
  assert.equal(apiErrorMessage(400, { error: { message: "Bad date", code: "VALIDATION" } }), "Bad date");
  assert.match(apiErrorMessage(503, null), /trouble/);
});
