import { describe, it, expect, vi, beforeEach } from "vitest";
import { Video } from "../src/types";

const fetchTranscriptSegments = vi.fn();

vi.mock("../src/transcript.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/transcript.js")>();
  return { ...actual, fetchTranscriptSegments: (...args: unknown[]) => fetchTranscriptSegments(...args) };
});

const { loadVideoContext, slimVideo } = await import("../src/lib/context-cache");
const { NoTranscriptError } = await import("../src/transcript.js");

const video = {
  id: "abc",
  title: "A video",
  extractor_key: "Youtube",
  thumbnail: "https://i.ytimg.com/vi/abc/hq.jpg",
  thumbnails: [{ url: "https://i.ytimg.com/1.jpg" }],
  automatic_captions: { en: [] },
  formats: [
    { format_id: "18", ext: "mp4", url: "https://googlevideo.com/secret", height: 360, http_headers: { a: "b" } },
  ],
} as unknown as Video;

describe("slimVideo", () => {
  it("drops stream URLs and bulky fields but keeps what the chat reads", () => {
    const slim = slimVideo(video) as Video & Record<string, unknown>;
    expect(slim.title).toBe("A video");
    expect(slim.thumbnail).toBe(video.thumbnail);
    expect(slim.formats?.[0]).toMatchObject({ format_id: "18", height: 360 });
    expect(JSON.stringify(slim)).not.toContain("googlevideo");
    expect(slim.thumbnails).toBeUndefined();
    expect(slim.automatic_captions).toBeUndefined();
  });
});

describe("loadVideoContext", () => {
  beforeEach(() => {
    fetchTranscriptSegments.mockReset();
  });

  it("caches a loaded context, and refetches when forced", async () => {
    fetchTranscriptSegments.mockResolvedValue({ video, segments: [{ start: 0, text: "hi" }], language: "en" });
    const first = await loadVideoContext("https://youtu.be/cache-test");
    const second = await loadVideoContext("https://youtu.be/cache-test");
    expect(fetchTranscriptSegments).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
    expect(first.segments).toHaveLength(1);
    expect(first.language).toBe("en");

    await loadVideoContext("https://youtu.be/cache-test", { force: true });
    expect(fetchTranscriptSegments).toHaveBeenCalledTimes(2);
  });

  it("keys the cache by caption language", async () => {
    fetchTranscriptSegments.mockResolvedValue({ video, segments: [], language: "de" });
    await loadVideoContext("https://youtu.be/lang-test", { language: "en" });
    await loadVideoContext("https://youtu.be/lang-test", { language: "de" });
    expect(fetchTranscriptSegments).toHaveBeenCalledTimes(2);
    expect(fetchTranscriptSegments.mock.calls[1][1]).toBe("de");
  });

  it("still loads the video's details when it has no captions", async () => {
    fetchTranscriptSegments.mockRejectedValue(new NoTranscriptError("No subtitles", video));
    const ctx = await loadVideoContext("https://youtu.be/no-subs");
    expect(ctx.segments).toEqual([]);
    expect(ctx.video.title).toBe("A video");
    expect(ctx.transcriptNote).toBe("No subtitles");
    // Not cached, so captions added (or a rate limit lifted) show up next time.
    await loadVideoContext("https://youtu.be/no-subs");
    expect(fetchTranscriptSegments).toHaveBeenCalledTimes(2);
  });

  it("passes other errors through", async () => {
    fetchTranscriptSegments.mockRejectedValue(new Error("Video unavailable"));
    await expect(loadVideoContext("https://youtu.be/broken")).rejects.toThrow("Video unavailable");
  });
});
