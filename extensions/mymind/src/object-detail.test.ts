import { strict as assert } from "node:assert";
import test from "node:test";
import { getObjectDetailMarkdown } from "./object-detail";
import { MyMindObject } from "./types";

function makeObject(overrides: Partial<MyMindObject>): MyMindObject {
  return {
    id: "object-1",
    tags: [],
    created: "2024-01-01T00:00:00Z",
    modified: "2024-01-01T00:00:00Z",
    bumped: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

test("link details omit the hostname from the markdown body", () => {
  const markdown = getObjectDetailMarkdown(
    makeObject({
      title: "Voice Agents on Vercel",
      url: "https://x.com/vercel/status/123",
      mainEntity: { name: "XPost", "@type": "SocialMediaPosting" },
    }),
    {},
  );

  assert.ok(markdown.includes("# Voice Agents on Vercel"));
  assert.ok(!markdown.includes("x.com"));
  assert.ok(!markdown.includes("## Main Entity"));
  assert.ok(!markdown.includes("XPost"));
  assert.ok(!markdown.includes("Saved as a"));
});

test("link details prefer thumbnail previews over screenshots", () => {
  const markdown = getObjectDetailMarkdown(
    makeObject({
      title: "Voice Agents on Vercel",
      url: "https://vercel.com/blog/voice-agents",
    }),
    {
      thumbnailUrl: "https://cdn.example.com/og.jpg",
      screenshotUrl: "https://cdn.example.com/screenshot.jpg",
    },
  );

  assert.ok(markdown.includes("![](https://cdn.example.com/og.jpg)"));
  assert.ok(!markdown.includes("https://cdn.example.com/screenshot.jpg"));
});
