import { describe, it, expect } from "vitest";
import {
  LinkContext,
  bodyText,
  chunkBody,
  dossierMarkdown,
  estimateTokens,
  hasBody,
  isOverviewRequest,
  selectChunks,
} from "../src/lib/link-context";

const page = (paragraphs: string[], extra: Partial<LinkContext> = {}): LinkContext => ({
  url: "https://example.com/a",
  kind: "page",
  key: "https://example.com/a",
  site: "example.com",
  title: "An article",
  facts: [{ label: "Reading time", value: "3 min" }],
  stats: [],
  body: { type: "paragraphs", paragraphs },
  fetchedAt: 0,
  ...extra,
});

describe("dossierMarkdown", () => {
  it("renders facts and statistics for any kind of link", () => {
    const md = dossierMarkdown(
      page(["x"], {
        author: "Jana Nováková",
        publishedAt: "2026-09-01",
        stats: [{ label: "Likes", value: "1.2K" }],
        tags: ["news"],
        description: "What happened.",
      }),
    );
    expect(md).toContain("# An article");
    expect(md).toContain("- Author: Jana Nováková");
    expect(md).toContain("- URL: https://example.com/a");
    expect(md).toContain("- Site: example.com");
    expect(md).toContain("- Published: 2026-09-01");
    expect(md).toContain("- Reading time: 3 min");
    expect(md).toContain("## Statistics\n- Likes: 1.2K");
    expect(md).toContain("## Tags\nnews");
    expect(md).toContain("## Description\nWhat happened.");
  });

  it("calls a video's author the channel and shows its chapters", () => {
    const md = dossierMarkdown({
      ...page([]),
      kind: "video",
      author: "Space Channel",
      authorVerified: true,
      body: { type: "segments", segments: [] },
      chapters: [{ start_time: 95, title: "Engines" }],
    });
    expect(md).toContain("- Channel: Space Channel (verified)");
    expect(md).toContain("## Chapters\n- [1:35] Engines");
  });

  it("writes a fact without a label as a plain line", () => {
    expect(dossierMarkdown(page([], { facts: [{ label: "", value: "Originally a live stream" }] }))).toContain(
      "\n- Originally a live stream",
    );
  });

  it("shortens a long description", () => {
    const md = dossierMarkdown(page([], { description: "d".repeat(50) }), 10);
    expect(md).toContain(`## Description\n${"d".repeat(10)}…`);
  });
});

describe("the body", () => {
  it("is timestamped lines for a video and paragraphs for anything else", () => {
    expect(bodyText({ type: "segments", segments: [{ start: 65, text: "hi" }] })).toBe("[1:05] hi");
    expect(bodyText({ type: "paragraphs", paragraphs: ["One.", "Two."] })).toBe("One.\n\nTwo.");
  });

  it("knows when there is none", () => {
    expect(hasBody(page([]))).toBe(false);
    expect(hasBody(page(["text"]))).toBe(true);
  });

  it("chunks paragraphs by position, without timestamps", () => {
    const chunks = chunkBody(
      { type: "paragraphs", paragraphs: ["a ".repeat(300), "b ".repeat(300), "c ".repeat(300)] },
      200,
    );
    expect(chunks.map((c) => c.start)).toEqual([0, 1, 2]);
    expect(chunks[0].text).not.toMatch(/\[\d+:\d{2}\]/);
  });

  it("splits one very long paragraph at sentences, so it still fits a small budget", () => {
    const long = Array.from({ length: 200 }, (_, i) => `Sentence number ${i} is here.`).join(" ");
    const chunks = chunkBody({ type: "paragraphs", paragraphs: [long] }, 150);
    expect(chunks.length).toBeGreaterThan(3);
    expect(Math.max(...chunks.map((c) => estimateTokens(c.text)))).toBeLessThanOrEqual(150);
    expect(selectChunks(chunks, "number 150", 150)).not.toEqual([]);
  });

  it("splits text without sentence breaks too (e.g. Chinese)", () => {
    const chunks = chunkBody({ type: "paragraphs", paragraphs: ["酵母需要新鲜的面粉".repeat(200)] }, 100);
    expect(chunks.length).toBeGreaterThan(5);
    expect(Math.max(...chunks.map((c) => estimateTokens(c.text)))).toBeLessThanOrEqual(100);
  });

  it("keeps a picked article in reading order", () => {
    const chunks = chunkBody(
      { type: "paragraphs", paragraphs: ["alpha intro", "beta engines", "gamma engines", "delta outro"] },
      5,
    );
    const picked = selectChunks(chunks, "engines", 1_000);
    expect(picked.map((c) => c.text)).toEqual(["alpha intro", "beta engines", "gamma engines", "delta outro"]);
  });
});

describe("isOverviewRequest", () => {
  it("covers articles and posts as well as videos", () => {
    expect(isOverviewRequest("What is this article about?")).toBe(true);
    expect(isOverviewRequest("what is the post about")).toBe(true);
    expect(isOverviewRequest("Summarize the page")).toBe(true);
    expect(isOverviewRequest("Who wrote this?")).toBe(false);
  });
});
