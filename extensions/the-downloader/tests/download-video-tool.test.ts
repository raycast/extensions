import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import dns from "node:dns";
import fs from "node:fs";

vi.mock("../src/lib/ytdlp", () => ({
  fetchVideoInfo: vi.fn(),
  isLiveStream: vi.fn(() => false),
  runVideoDownload: vi.fn(),
}));
vi.mock("../src/lib/history", () => ({ recordDownload: vi.fn() }));
// Every host resolves to a public address unless a test says otherwise; no real DNS in tests.
vi.mock("node:dns", () => ({
  default: { promises: { lookup: vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]) } },
}));

import { fetchVideoInfo, runVideoDownload } from "../src/lib/ytdlp";
import tool from "../src/tools/download-video";

const video = {
  title: "Clip",
  duration: 60,
  formats: [
    {
      format_id: "251",
      vcodec: "none",
      acodec: "opus",
      ext: "webm",
      video_ext: "none",
      protocol: "https",
      resolution: "audio only",
      tbr: 130,
    },
    {
      format_id: "313",
      vcodec: "vp9",
      acodec: "none",
      ext: "webm",
      video_ext: "webm",
      protocol: "https",
      resolution: "3840x2160",
      tbr: 16000,
    },
  ],
};

beforeEach(() => {
  vi.spyOn(fs, "existsSync").mockReturnValue(true);
  vi.mocked(fetchVideoInfo).mockResolvedValue(video as never);
  vi.mocked(runVideoDownload).mockResolvedValue({ filePath: "/Users/me/Downloads/Clip (abc).webm" });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(runVideoDownload).mockReset();
  vi.mocked(fetchVideoInfo).mockClear();
});

describe("download-video tool", () => {
  it("downloads through the shared runner, so WebM gets its mkv fallback", async () => {
    const result = await tool({ url: "https://www.youtube.com/watch?v=abc" });
    const [, options] = vi.mocked(runVideoDownload).mock.calls[0];
    expect(options.format).toBe("313+bestaudio#webm");
    expect(options.url).toBe("https://www.youtube.com/watch?v=abc");
    expect(options.outputTemplate).toMatch(/%\(title\)s \(%\(id\)s\)\.%\(ext\)s$/);
    expect(result).toMatchObject({
      downloadedPath: "/Users/me/Downloads/Clip (abc).webm",
      fileName: "Clip (abc).webm",
    });
  });

  it("tries sites it doesn't recognize, through yt-dlp's site extractors only", async () => {
    await tool({ url: "https://rumble.com/v12345-clip.html" });
    // The generic page reader would fetch whatever a page embeds or redirects to.
    expect(vi.mocked(fetchVideoInfo).mock.calls[0][4]).toMatchObject({ knownSitesOnly: true });
    expect(vi.mocked(runVideoDownload).mock.calls[0][1]).toMatchObject({ knownSitesOnly: true });
  });

  it("still sends galleries and Spotify links to the Download command", async () => {
    await expect(tool({ url: "https://www.instagram.com/p/abc/" })).rejects.toThrow(/Download.*command/);
    await expect(tool({ url: "https://open.spotify.com/track/abc" })).rejects.toThrow(/Download.*command/);
    expect(runVideoDownload).not.toHaveBeenCalled();
  });

  it("refuses anything that isn't an http(s) URL before it can reach yt-dlp as an option", async () => {
    await expect(tool({ url: "--batch-file=/etc/hosts" })).rejects.toThrow(/Invalid URL/);
    expect(fetchVideoInfo).not.toHaveBeenCalled();
    expect(runVideoDownload).not.toHaveBeenCalled();
  });

  it("refuses local and private addresses, as read-link does", async () => {
    await expect(tool({ url: "http://192.168.1.1/video.mp4" })).rejects.toThrow(/local or private network address/);
    await expect(tool({ url: "http://169.254.169.254/latest/meta-data/" })).rejects.toThrow(/local or private/);
    await expect(tool({ url: "http://nas.local/clip.mp4" })).rejects.toThrow(/local or private/);
    vi.mocked(dns.promises.lookup).mockResolvedValueOnce([{ address: "127.0.0.1", family: 4 }] as never);
    await expect(tool({ url: "https://looks-public.example/clip" })).rejects.toThrow(/local or private/);
    expect(fetchVideoInfo).not.toHaveBeenCalled();
    expect(runVideoDownload).not.toHaveBeenCalled();
  });

  it("adds the https:// a bare link is missing", async () => {
    await tool({ url: "youtube.com/watch?v=abc" });
    expect(vi.mocked(runVideoDownload).mock.calls[0][1].url).toBe("https://youtube.com/watch?v=abc");
  });

  it("explains a failed download", async () => {
    vi.mocked(runVideoDownload).mockRejectedValueOnce(new Error("HTTP Error 403: Forbidden"));
    await expect(tool({ url: "https://www.youtube.com/watch?v=abc" })).rejects.toThrow(
      "Failed to download video: HTTP Error 403: Forbidden",
    );
  });
});
