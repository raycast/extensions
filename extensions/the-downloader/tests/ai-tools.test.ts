import { describe, it, expect, vi, beforeEach } from "vitest";
import { Video } from "../src/types";

const loadVideoContext = vi.fn();
const fetchVideoInfo = vi.fn();

vi.mock("../src/lib/context-cache.js", () => ({
  loadVideoContext: (...args: unknown[]) => loadVideoContext(...args),
}));
vi.mock("../src/lib/ytdlp.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/ytdlp.js")>()),
  fetchVideoInfo: (...args: unknown[]) => fetchVideoInfo(...args),
}));
vi.mock("../src/utils.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/utils.js")>()),
  getytdlPath: () => process.execPath, // any file that exists
  getDenoPath: () => "/nonexistent/deno",
}));

const { default: extractTranscript } = await import("../src/tools/extract-transcript");
const { default: getVideoInfo } = await import("../src/tools/get-video-info");
const { captionLanguages } = await import("../src/lib/video-context");
const { transcriptForAI, videoInfoForAI } = await import("../src/lib/video-chat");

const video = {
  id: "abc",
  title: "Rockets",
  duration: 125,
  formats: [],
  extractor_key: "Youtube",
  uploader: "Space Channel",
  view_count: 12_000,
  like_count: 600,
  upload_date: "20260101",
  subtitles: { de: [], live_chat: [] },
  automatic_captions: { en: [], "en-orig": [], fr: [] },
} as unknown as Video;

beforeEach(() => {
  loadVideoContext.mockReset();
  fetchVideoInfo.mockReset();
});

describe("captionLanguages", () => {
  it("lists uploaded tracks and only the spoken automatic track, not YouTube's translations", () => {
    expect(captionLanguages(video)).toEqual({ uploaded: ["de"], automatic: ["en-orig"] });
    expect(captionLanguages({ ...video, subtitles: null, automatic_captions: { en: [] } })).toEqual({
      uploaded: [],
      automatic: ["en"],
    });
  });
});

describe("AI tool output", () => {
  const now = Date.UTC(2026, 0, 11);

  it("gives the transcript with timestamps and how to link a moment", () => {
    const text = transcriptForAI(
      { url: "https://youtu.be/abc", video, segments: [{ start: 65, text: "liftoff" }], fetchedAt: 0 },
      now,
    );
    expect(text).toContain("# Rockets");
    expect(text).toContain("- Views per day: 1.2K");
    expect(text).toContain("## Transcript\n[1:05] liftoff");
    expect(text).toContain("[4:05](https://www.youtube.com/watch?v=abc&t=245s)");
  });

  it("says why the transcript is missing", () => {
    const text = transcriptForAI(
      { url: "https://youtu.be/abc", video, segments: [], transcriptNote: "HTTP Error 429", fetchedAt: 0 },
      now,
    );
    expect(text).toContain("Not available: HTTP Error 429");
  });

  it("gives video info with caption languages and no link hint for sites without one", () => {
    const text = videoInfoForAI({ url: "https://example.com/v", video: { ...video, extractor_key: "Generic" } }, now);
    expect(text).toContain("- Uploaded captions: de");
    expect(text).toContain("- Automatic captions: en-orig");
    expect(text).not.toContain("Link to a moment");
  });
});

describe("extract-transcript tool", () => {
  it("loads the shared context in the video's own language by default", async () => {
    loadVideoContext.mockResolvedValue({ url: "https://youtu.be/abc", video, segments: [], fetchedAt: 0 });
    await extractTranscript({ url: "https://youtu.be/abc" });
    expect(loadVideoContext).toHaveBeenCalledWith("https://youtu.be/abc", { language: "auto" });
    await extractTranscript({ url: "https://youtu.be/abc", language: "pt-BR" });
    expect(loadVideoContext).toHaveBeenLastCalledWith("https://youtu.be/abc", { language: "pt-BR" });
    await extractTranscript({ url: "https://youtu.be/abc", language: "../../etc" });
    expect(loadVideoContext).toHaveBeenLastCalledWith("https://youtu.be/abc", { language: "auto" });
  });

  it("rejects non-URLs before running anything", async () => {
    await expect(extractTranscript({ url: "--exec=rm" })).rejects.toThrow("Invalid URL");
    expect(loadVideoContext).not.toHaveBeenCalled();
  });
});

describe("get-video-info tool", () => {
  it("fetches metadata only and renders it", async () => {
    fetchVideoInfo.mockResolvedValue(video);
    const text = await getVideoInfo({ url: "https://youtu.be/abc" });
    expect(fetchVideoInfo).toHaveBeenCalledTimes(1);
    expect(fetchVideoInfo.mock.calls[0][1]).toBe("https://youtu.be/abc");
    expect(fetchVideoInfo.mock.calls[0][3]).toBeUndefined(); // no Deno installed
    expect(text).toContain("# Rockets");
    expect(text).toContain("- Views: 12K");
  });

  it("notes live streams", async () => {
    fetchVideoInfo.mockResolvedValue({ ...video, live_status: "is_live" });
    expect(await getVideoInfo({ url: "https://youtu.be/abc" })).toContain("live or upcoming stream");
  });

  it("rejects non-URLs", async () => {
    await expect(getVideoInfo({ url: "file:///etc/passwd" })).rejects.toThrow("Invalid URL");
    expect(fetchVideoInfo).not.toHaveBeenCalled();
  });
});
