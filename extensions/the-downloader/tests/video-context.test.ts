import { describe, it, expect } from "vitest";
import {
  VideoContext,
  chunkSegments,
  dossierMarkdown,
  estimateTokens,
  isOverviewRequest,
  linkifyTimestamps,
  parseTimestamp,
  scoreChunks,
  selectChunks,
  timestampUrl,
  transcriptText,
  videoStats,
} from "../src/lib/video-context";
import { Video } from "../src/types";

const video: Video = {
  id: "abc123",
  title: "Build a Rocket",
  duration: 754,
  formats: [],
  extractor_key: "Youtube",
  uploader: "Space Channel",
  view_count: 100_000,
  like_count: 4_000,
  comment_count: 250,
  channel_follower_count: 1_200_000,
  upload_date: "20260901",
  chapters: [
    { start_time: 0, title: "Intro" },
    { start_time: 95, title: "Engines" },
  ],
  tags: ["rocket", "diy"],
  description: "We build a rocket.",
};

const ctx: VideoContext = {
  url: "https://youtu.be/abc123",
  video,
  segments: [
    { start: 0, text: "welcome to the channel" },
    { start: 30, text: "we talk about engines and fuel" },
    { start: 60, text: "the landing legs are made of aluminum" },
    { start: 95, text: "engines need liquid oxygen" },
  ],
  language: "en",
  fetchedAt: 0,
};

describe("videoStats", () => {
  it("derives age, views per day, like rate and comment rate", () => {
    const now = Date.UTC(2026, 8, 11); // 10 days after upload
    const s = videoStats(video, now);
    expect(s.ageDays).toBeCloseTo(10);
    expect(s.viewsPerDay).toBeCloseTo(10_000);
    expect(s.likeRate).toBeCloseTo(4);
    expect(s.commentsPer1kViews).toBeCloseTo(2.5);
  });

  it("leaves out what the site didn't report", () => {
    expect(videoStats({ title: "x", duration: 1, formats: [] })).toEqual({
      ageDays: undefined,
      viewsPerDay: undefined,
      likeRate: undefined,
      commentsPer1kViews: undefined,
    });
  });
});

describe("timestamps", () => {
  it("builds YouTube links and none for unknown sites", () => {
    expect(timestampUrl(ctx, 95.7)).toBe("https://www.youtube.com/watch?v=abc123&t=95s");
    expect(timestampUrl({ url: "https://x.com/v", video: { ...video, extractor_key: "Twitter" } }, 5)).toBeUndefined();
  });

  it("parses and links bare timestamps only", () => {
    expect(parseTimestamp("1:35")).toBe(95);
    expect(parseTimestamp("1:02:05")).toBe(3725);
    expect(parseTimestamp("99")).toBeUndefined();
    const out = linkifyTimestamps("At [1:35] and [0:30](https://keep.me) see [nope]", (s) => `https://y/${s}`);
    expect(out).toBe("At [1:35](https://y/95) and [0:30](https://keep.me) see [nope]");
  });

  it("renders the transcript as timestamped lines", () => {
    expect(transcriptText(ctx.segments.slice(0, 2))).toBe(
      "[0:00] welcome to the channel\n[0:30] we talk about engines and fuel",
    );
  });
});

describe("dossierMarkdown", () => {
  it("includes facts, statistics, chapters, tags and description", () => {
    const md = dossierMarkdown(ctx, Date.UTC(2026, 8, 11));
    expect(md).toContain("# Build a Rocket");
    expect(md).toContain("- Channel: Space Channel");
    expect(md).toContain("- Duration: 12:34");
    expect(md).toContain("## Statistics");
    expect(md).toContain("- Likes per 100 views: 4.00");
    expect(md).toContain("- [1:35] Engines");
    expect(md).toContain("rocket, diy");
    expect(md).toContain("We build a rocket.");
  });
});

describe("chunking and retrieval", () => {
  const chunks = chunkSegments(ctx.segments, 12);

  it("groups segments without splitting them and keeps time ranges", () => {
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].start).toBe(0);
    expect(chunks.map((c) => c.text).join("\n")).toBe(transcriptText(ctx.segments));
  });

  it("scores chunks that mention the question's terms", () => {
    const scores = scoreChunks(chunks, "What are the landing legs made of?");
    const best = chunks[scores.indexOf(Math.max(...scores))];
    expect(best.text).toContain("aluminum");
  });

  it("picks relevant chunks within budget, in video order", () => {
    const picked = selectChunks(chunks, "engines", estimateTokens(chunks[0].text) * 2);
    expect(picked.every((c, i) => i === 0 || c.start >= picked[i - 1].start)).toBe(true);
    expect(picked.some((c) => c.text.includes("engines"))).toBe(true);
  });

  it("samples across the video when nothing matches", () => {
    const picked = selectChunks(chunks, "zzz", 10_000);
    expect(picked.length).toBe(chunks.length);
  });
});

describe("isOverviewRequest", () => {
  it("spots summary-style questions", () => {
    expect(isOverviewRequest("Summarize the video")).toBe(true);
    expect(isOverviewRequest("What are the key takeaways?")).toBe(true);
    expect(isOverviewRequest("What is the landing gear made of?")).toBe(false);
  });
});
