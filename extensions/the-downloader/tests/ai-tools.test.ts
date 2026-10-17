import { describe, it, expect, vi, beforeEach } from "vitest";
import { Video } from "../src/types";
import { LinkContext } from "../src/lib/link-context";

const loadLinkContext = vi.fn();
const fetchVideoInfo = vi.fn();

vi.mock("../src/lib/link-loader.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/link-loader.js")>()),
  loadLinkContext: (...args: unknown[]) => loadLinkContext(...args),
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

const { default: readLink } = await import("../src/tools/read-link");
const { default: getLinkInfo } = await import("../src/tools/get-link-info");
const { videoToLink } = await import("../src/lib/sources/video");

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

const article: LinkContext = {
  url: "https://example.com/news/bridges",
  kind: "page",
  key: "https://example.com/news/bridges",
  site: "Example News",
  title: "Bridges reopen",
  facts: [{ label: "Reading time", value: "2 min" }],
  stats: [],
  body: { type: "paragraphs", paragraphs: ["The main bridge was rebuilt with steel cables."] },
  fetchedAt: 0,
};

beforeEach(() => {
  loadLinkContext.mockReset();
  fetchVideoInfo.mockReset();
});

describe("read-link tool", () => {
  it("reads a video's transcript in its own language by default", async () => {
    loadLinkContext.mockResolvedValue(
      videoToLink("https://youtu.be/abc", video, { segments: [{ start: 65, text: "liftoff" }] }),
    );
    const text = await readLink({ url: "https://youtu.be/abc" });
    expect(loadLinkContext).toHaveBeenCalledWith("https://youtu.be/abc", { language: "auto", archiveFallback: true });
    expect(text).toContain("## Transcript\n[1:05] liftoff");
    expect(text).toContain("[4:05](https://www.youtube.com/watch?v=abc&t=245s)");
    await readLink({ url: "https://youtu.be/abc", language: "pt-BR" });
    expect(loadLinkContext).toHaveBeenLastCalledWith("https://youtu.be/abc", {
      language: "pt-BR",
      archiveFallback: true,
    });
    await readLink({ url: "https://youtu.be/abc", language: "../../etc" });
    expect(loadLinkContext).toHaveBeenLastCalledWith("https://youtu.be/abc", {
      language: "auto",
      archiveFallback: true,
    });
  });

  it("reads an article without moment links", async () => {
    loadLinkContext.mockResolvedValue(article);
    const text = await readLink({ url: "https://example.com/news/bridges" });
    expect(text).toContain("## Article text\nThe main bridge was rebuilt with steel cables.");
    expect(text).not.toContain("point to a moment");
  });

  it("leaves rejecting non-URLs to the loader, which runs nothing for them", async () => {
    loadLinkContext.mockRejectedValue(new Error("Invalid URL — provide an http(s) link."));
    await expect(readLink({ url: "--batch-file=/etc/hosts" })).rejects.toThrow("Invalid URL");
  });
});

describe("get-link-info tool", () => {
  it("reads only a video's metadata, with its caption languages", async () => {
    fetchVideoInfo.mockResolvedValue(video);
    const text = await getLinkInfo({ url: "https://youtu.be/abc" });
    expect(fetchVideoInfo).toHaveBeenCalledTimes(1);
    expect(fetchVideoInfo.mock.calls[0][1]).toBe("https://youtu.be/abc");
    expect(fetchVideoInfo.mock.calls[0][3]).toBeUndefined(); // no Deno installed
    expect(loadLinkContext).not.toHaveBeenCalled();
    expect(text).toContain("# Rockets");
    expect(text).toContain("- Views: 12K");
    expect(text).toContain("- Uploaded captions: de");
    expect(text).toContain("- Automatic captions: en-orig");
  });

  it("notes live streams", async () => {
    fetchVideoInfo.mockResolvedValue({ ...video, live_status: "is_live" });
    expect(await getLinkInfo({ url: "https://youtu.be/abc" })).toContain("live or upcoming stream");
  });

  it("describes a page without its text", async () => {
    loadLinkContext.mockResolvedValue(article);
    const text = await getLinkInfo({ url: "example.com/news/bridges" });
    expect(loadLinkContext).toHaveBeenCalledWith("https://example.com/news/bridges", { archiveFallback: true });
    expect(text).toContain("A web page on Example News.");
    expect(text).not.toContain("steel cables");
  });

  it("rejects non-URLs before running anything", async () => {
    await expect(getLinkInfo({ url: "file:///etc/passwd" })).rejects.toThrow("Invalid URL");
    await expect(getLinkInfo({ url: "--batch-file=/etc/hosts" })).rejects.toThrow("Invalid URL");
    expect(fetchVideoInfo).not.toHaveBeenCalled();
    expect(loadLinkContext).not.toHaveBeenCalled();
  });
});
