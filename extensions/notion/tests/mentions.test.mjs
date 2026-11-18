import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createLoader } from "./load-module.mjs";

const { parsePageMentionUri, propertyToText, toPageMentions, toPageMentionUri, toPageResource, MAX_CONTENT_LENGTH } =
  createLoader()(new URL("../src/utils/mentions.ts", import.meta.url).pathname);

const now = new Date("2026-11-03T12:00:00Z");
const page = (id, extra = {}) => ({
  object: "page",
  id,
  title: "Roadmap",
  icon_emoji: null,
  icon_file: null,
  icon_external: null,
  last_edited_time: new Date("2026-11-01T12:00:00Z").getTime(),
  ...extra,
});

describe("toPageMentions", () => {
  it("lists each page once with its icon and when it was edited, skipping databases", () => {
    const mentions = toPageMentions(
      [
        page("1234567812341234123412345678abcd", { icon_emoji: "🗺️" }),
        page("12345678-1234-1234-1234-12345678abcd"),
        page("aaaaaaaa-1234-1234-1234-12345678abcd", { object: "database" }),
        page("bbbbbbbb-1234-1234-1234-12345678abcd", { title: " ", icon_file: "https://files.example/icon.png" }),
        page("cccccccc-1234-1234-1234-12345678abcd", { last_edited_time: undefined }),
      ],
      "blank-document",
      now,
    );
    assert.deepEqual(mentions, [
      {
        title: "Roadmap",
        uri: "notion://pages/12345678-1234-1234-1234-12345678abcd",
        description: "Edited 2 days ago",
        icon: "🗺️",
      },
      {
        title: "Untitled",
        uri: "notion://pages/bbbbbbbb-1234-1234-1234-12345678abcd",
        description: "Edited 2 days ago",
        icon: "https://files.example/icon.png",
      },
      {
        title: "Roadmap",
        uri: "notion://pages/cccccccc-1234-1234-1234-12345678abcd",
        description: "Page",
        icon: "blank-document",
      },
    ]);
  });

  it("caps results at 50", () => {
    const many = Array.from({ length: 60 }, (_, i) =>
      page(`${String(i).padStart(8, "0")}-1234-1234-1234-12345678abcd`),
    );
    assert.equal(toPageMentions(many, "blank-document", now).length, 50);
  });
});

describe("parsePageMentionUri", () => {
  it("round-trips page IDs with or without dashes", () => {
    assert.equal(
      parsePageMentionUri(toPageMentionUri("1234567812341234123412345678ABCD")),
      "12345678-1234-1234-1234-12345678abcd",
    );
  });

  it("rejects other URIs", () => {
    for (const uri of [
      "linear://issues/12345678-1234-1234-1234-12345678abcd",
      "notion://pages/",
      "notion://pages/not-an-id",
      "notion://pages/12345678-1234-1234-1234-12345678abcd/extra",
    ]) {
      assert.throws(() => parsePageMentionUri(uri), /Invalid Notion page URI/);
    }
  });
});

describe("propertyToText", () => {
  it("reads values that need no further requests", () => {
    assert.equal(propertyToText({ type: "status", status: { name: "In progress" } }), "In progress");
    assert.equal(propertyToText({ type: "multi_select", multi_select: [{ name: "A" }, { name: "B" }] }), "A, B");
    assert.equal(
      propertyToText({ type: "date", date: { start: "2026-11-03", end: "2026-11-05" } }),
      "2026-11-03 → 2026-11-05",
    );
    assert.equal(propertyToText({ type: "checkbox", checkbox: false }), "No");
    assert.equal(propertyToText({ type: "people", people: [{ id: "1", name: "Ada" }, { id: "2" }] }), "Ada");
    assert.equal(propertyToText({ type: "unique_id", unique_id: { prefix: "TASK", number: 42 } }), "TASK-42");
    assert.equal(propertyToText({ type: "formula", formula: { type: "number", number: 0 } }), "0");
    assert.equal(propertyToText({ type: "relation", relation: [{ id: "1" }] }), undefined);
  });
});

describe("toPageResource", () => {
  const notionPage = {
    url: "https://www.notion.so/Roadmap-123",
    last_edited_time: "2026-11-01T12:00:00.000Z",
    properties: {
      Name: { type: "title", title: [{ plain_text: "Road" }, { plain_text: "map" }] },
      Status: { type: "status", status: { name: "Done" } },
      Notes: { type: "rich_text", rich_text: [{ plain_text: "line one\nline two" }] },
      Empty: { type: "rich_text", rich_text: [] },
    },
  };

  it("renders the title, link, properties, and content as Markdown", () => {
    assert.deepEqual(toPageResource(notionPage, "\n## Goals\nShip mentions\n"), {
      mimeType: "text/markdown",
      text: [
        "# Roadmap",
        "- URL: https://www.notion.so/Roadmap-123\n- Last edited: 2026-11-01T12:00:00.000Z\n- Status: Done\n- Notes: line one line two",
        "## Goals\nShip mentions",
      ].join("\n\n"),
    });
  });

  it("marks empty and truncated pages", () => {
    assert.match(toPageResource(notionPage, "  ").text, /\*Page is empty\*$/);
    const long = toPageResource(notionPage, "x".repeat(MAX_CONTENT_LENGTH + 10)).text;
    assert.match(long, /\*Content truncated\.\*$/);
    assert.ok(!long.includes("x".repeat(MAX_CONTENT_LENGTH + 1)));
  });
});
