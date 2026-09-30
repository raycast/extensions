import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

vi.mock("../src/transcript", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/transcript")>()),
  fetchTranscriptSegments: vi.fn(),
}));

import { NoTranscriptError, fetchTranscriptSegments } from "../src/transcript";
import { dossierMarkdown } from "../src/lib/link-context";
import {
  captionLanguages,
  loadVideoLink,
  slimVideo,
  timestampUrl,
  videoStats,
  videoToLink,
} from "../src/lib/sources/video";
import { Video } from "../src/types";

// A real `yt-dlp -J` of a TED talk, trimmed to the fields the chat reads.
const ted = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/links/youtube-video.json"), "utf8")) as Video;
const NOW = Date.UTC(2026, 8, 30);
const segments = [
  { start: 0, text: "so in college I was a government major" },
  { start: 95, text: "the instant gratification monkey" },
];

describe("videoToLink", () => {
  it("keeps the chat key saved chats already use", () => {
    const ctx = videoToLink("https://youtu.be/arj7oStGLkU", ted, { segments, language: "en" }, NOW);
    expect(ctx.key).toBe("youtube:arj7oStGLkU");
    expect(ctx).toMatchObject({
      kind: "video",
      site: "YouTube",
      title: "Inside the Mind of a Master Procrastinator | Tim Urban | TED",
      author: "TED",
      authorVerified: true,
      publishedAt: "2016-04-06",
      language: "en",
      body: { type: "segments", segments },
    });
    expect(ctx.video?.id).toBe("arj7oStGLkU");
  });

  it("lists facts and derived statistics", () => {
    const ctx = videoToLink("https://youtu.be/arj7oStGLkU", ted, { segments, language: "en" }, NOW);
    expect(ctx.facts).toEqual(
      expect.arrayContaining([
        { label: "Duration", value: "14:04" },
        { label: "Spoken language", value: "en" },
        { label: "Transcript language", value: "en" },
        { label: "Categories", value: "People & Blogs" },
        { label: "Uploaded captions", value: expect.stringMatching(/^ar, hy, bg, .*, …$/) },
      ]),
    );
    const stats = Object.fromEntries(ctx.stats.map((s) => [s.label, s.value]));
    expect(stats).toMatchObject({ Views: "62M", Likes: "2.1M", Comments: "79K", "Channel subscribers": "27.9M" });
    expect(stats["Views per day"]).toBeDefined();
    expect(stats["Likes per 100 views"]).toBe("3.32");
  });

  it("renders the same dossier the chat used to send", () => {
    const md = dossierMarkdown(videoToLink("https://youtu.be/arj7oStGLkU", ted, { segments }, NOW));
    expect(md).toContain("- Channel: TED (verified)");
    expect(md).toContain("- Duration: 14:04");
    expect(md).toContain("## Chapters\n- [0:00]");
    expect(md).toContain("## Tags");
  });

  it("stays usable without captions and says why", () => {
    const ctx = videoToLink("u", ted, { note: "This video has no captions.", reason: "none" }, NOW);
    expect(ctx.body).toEqual({ type: "segments", segments: [] });
    expect(ctx).toMatchObject({ note: "This video has no captions.", noteReason: "none" });
  });

  it("falls back to the URL for a key and the host for a site", () => {
    const bare: Video = { title: "Clip", duration: 5, formats: [] };
    expect(videoToLink("https://rumble.com/v1", bare, { segments: [] }, NOW)).toMatchObject({
      key: "https://rumble.com/v1",
      site: "rumble.com",
    });
  });
});

describe("loadVideoLink", () => {
  it("maps a video that has no captions instead of failing", async () => {
    vi.mocked(fetchTranscriptSegments).mockRejectedValueOnce(
      new NoTranscriptError("This video has no German captions.", ted, "language"),
    );
    const ctx = await loadVideoLink("https://youtu.be/arj7oStGLkU", { language: "de" });
    expect(ctx).toMatchObject({ kind: "video", noteReason: "language", body: { segments: [] } });
    expect(ctx.video?.formats?.[0]).not.toHaveProperty("url");
  });

  it("passes other errors on", async () => {
    vi.mocked(fetchTranscriptSegments).mockRejectedValueOnce(new Error("Video unavailable"));
    await expect(loadVideoLink("https://youtu.be/x", {})).rejects.toThrow("Video unavailable");
  });
});

describe("video helpers", () => {
  it("links moments on YouTube and Vimeo only", () => {
    expect(timestampUrl({ url: "https://youtu.be/arj7oStGLkU", video: ted }, 95.7)).toBe(
      "https://www.youtube.com/watch?v=arj7oStGLkU&t=95s",
    );
    expect(timestampUrl({ url: "https://x.com/v", video: { ...ted, extractor_key: "Twitter" } }, 5)).toBeUndefined();
    expect(timestampUrl({ url: "https://example.com/a" }, 5)).toBeUndefined();
  });

  it("derives engagement from the counts", () => {
    const video: Video = {
      title: "x",
      duration: 1,
      formats: [],
      view_count: 100_000,
      like_count: 4_000,
      comment_count: 250,
      upload_date: "20260901",
    };
    const s = videoStats(video, Date.UTC(2026, 8, 11));
    expect(s.ageDays).toBeCloseTo(10);
    expect(s.viewsPerDay).toBeCloseTo(10_000);
    expect(s.likeRate).toBeCloseTo(4);
    expect(s.commentsPer1kViews).toBeCloseTo(2.5);
  });

  it("lists the spoken caption tracks, not YouTube's translations", () => {
    const langs = captionLanguages({
      ...ted,
      subtitles: { en: [], live_chat: [] },
      automatic_captions: { "en-orig": [], de: [], fr: [] },
    });
    expect(langs).toEqual({ uploaded: ["en"], automatic: ["en-orig"] });
  });

  it("drops stream URLs and bulky fields before caching", () => {
    const slim = slimVideo({ ...ted, formats: [{ ...ted.formats[0], url: "https://stream" } as never] });
    expect(slim.formats[0]).not.toHaveProperty("url");
    expect(slim).not.toHaveProperty("automatic_captions");
  });
});
