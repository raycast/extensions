import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { firstLine, metricName, platformName, postText, variantSlots, writtenVariants } from "../src/lib/format.ts";
import type { Post, TextGeneration } from "../src/lib/types.ts";

function generation(overrides: Partial<TextGeneration>): TextGeneration {
  return { id: "wgen_4Tz8", status: "running", platform: "x", mode: "variants", variants: [], ...overrides };
}

function post(overrides: Partial<Post>): Post {
  return {
    id: "post_2bX9",
    status: "published",
    caption: "Launch day is here",
    parts: [{ content: "Launch day is here", media_urls: [] }],
    media_urls: [],
    scheduled_at: "2026-09-20T08:30:00Z",
    published_at: "2026-09-20T08:31:04Z",
    release_url: "https://example.com/status/1",
    failure_code: null,
    metrics: { likes: 12, impressions: 340 },
    metrics_synced_at: "2026-09-20T10:00:00Z",
    channel_id: "sacc_3kP9",
    provider: "x",
    ...overrides,
  };
}

const finishedThread = generation({
  status: "succeeded",
  variants: [
    { status: "succeeded", parts: ["Launch day is here.", "Here is what changed."], violation: null },
    { status: "failed", reason: "over the limit" },
    {
      status: "succeeded",
      parts: ["We shipped the new editor!"],
      violation: "uses an exclamation mark the brand avoids",
    },
  ],
});

describe("variantSlots", () => {
  it("shows three pending slots while nothing is written", () => {
    assert.deepEqual(variantSlots(generation({ variants: [] })), [
      { status: "pending" },
      { status: "pending" },
      { status: "pending" },
    ]);
    assert.equal(variantSlots(undefined).length, 3);
  });

  it("keeps written variants in place and pads the rest", () => {
    const slots = variantSlots(
      generation({ variants: [{ status: "succeeded", parts: ["Hello"], violation: null }, { status: "pending" }] }),
    );

    assert.deepEqual(
      slots.map((slot) => slot.status),
      ["succeeded", "pending", "pending"],
    );
  });

  it("treats an empty slot of a running generation as pending", () => {
    const slots = variantSlots(generation({ variants: [null, { status: "succeeded", parts: ["Hi"] }] }));

    assert.deepEqual(
      slots.map((slot) => slot.status),
      ["pending", "succeeded", "pending"],
    );
  });

  it("shows only what a finished generation wrote", () => {
    assert.equal(variantSlots(finishedThread).length, 3);
  });

  it("drops empty slots of a finished generation", () => {
    const slots = variantSlots(
      generation({ status: "succeeded", variants: [null, { status: "succeeded", parts: ["One"] }, null] }),
    );

    assert.deepEqual(slots, [{ status: "succeeded", parts: ["One"] }]);
  });
});

describe("writtenVariants", () => {
  it("joins the parts of a thread, keeps the style violation and drops failed variants", () => {
    assert.deepEqual(writtenVariants(finishedThread), [
      { text: "Launch day is here.\n\nHere is what changed." },
      { text: "We shipped the new editor!", violation: "uses an exclamation mark the brand avoids" },
    ]);
  });

  it("skips empty slots", () => {
    assert.deepEqual(
      writtenVariants(generation({ status: "succeeded", variants: [null, { status: "succeeded", parts: ["One"] }] })),
      [{ text: "One" }],
    );
  });
});

describe("postText", () => {
  it("joins the content of every part of a thread", () => {
    const thread = post({
      parts: [
        { content: "Launch day is here", media_urls: ["https://example.com/video.mp4"] },
        { content: "Here is what changed", media_urls: [] },
      ],
    });

    assert.equal(postText(thread), "Launch day is here\n\nHere is what changed");
  });

  it("reads the single part the server builds from a caption", () => {
    const captionOnly = post({ caption: "Autumn menu", parts: [{ content: "Autumn menu", media_urls: [] }] });

    assert.equal(postText(captionOnly), "Autumn menu");
  });

  it("is empty for a post with no caption", () => {
    assert.equal(postText(post({ caption: null, parts: [{ content: null, media_urls: [] }] })), "");
  });

  it("falls back to the caption when there are no parts", () => {
    assert.equal(postText(post({ caption: "Caption", parts: undefined })), "Caption");
  });
});

describe("formatting", () => {
  it("names platforms and metrics", () => {
    assert.equal(platformName("tiktok"), "TikTok");
    assert.equal(platformName("mastodon"), "mastodon");
    assert.equal(metricName("video_views"), "Video Views");
  });

  it("titles a post by its first non-empty line", () => {
    assert.equal(firstLine("\n  Launch day  \nMore", "Untitled"), "Launch day");
    assert.equal(firstLine("", "Untitled"), "Untitled");
  });
});
