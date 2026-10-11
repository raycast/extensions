import { describe, it, expect } from "vitest";
import { formatCount, formatRows, formatUploadDate, qualityName, siteName } from "../src/lib/media-info";
import { Format, Video } from "../src/types";

const f = (p: Partial<Format> & { format_id: string }): Format => ({
  vcodec: "none",
  acodec: "none",
  ext: "mp4",
  video_ext: "mp4",
  protocol: "https",
  resolution: "",
  tbr: null,
  ...p,
});

describe("formatCount", () => {
  it("abbreviates large numbers and skips missing ones", () => {
    expect(formatCount(1_234_567)).toMatch(/1\.2\s?M/);
    expect(formatCount(950)).toBe("950");
    expect(formatCount(undefined)).toBeUndefined();
    expect(formatCount(null)).toBeUndefined();
  });
});

describe("formatUploadDate", () => {
  it("parses yt-dlp's YYYYMMDD", () => {
    expect(formatUploadDate("20260903")).toContain("2026");
    expect(formatUploadDate("2026-09-03")).toBeUndefined();
    expect(formatUploadDate(undefined)).toBeUndefined();
  });
});

describe("qualityName", () => {
  it("names the common tiers", () => {
    expect(qualityName(2160)).toBe("4K");
    expect(qualityName(4320)).toBe("8K");
    expect(qualityName(1080)).toBe("1080p");
    expect(qualityName(undefined)).toBeUndefined();
  });
});

describe("formatRows", () => {
  it("lists distinct video formats best first with sizes", () => {
    const video: Video = {
      title: "t",
      duration: 1,
      formats: [
        f({ format_id: "a", acodec: "mp4a", resolution: "audio only" }),
        f({ format_id: "b", vcodec: "avc1.4d", height: 720, fps: 30, filesize: 2_000_000 }),
        f({ format_id: "c", vcodec: "avc1.4d", height: 720, fps: 30 }),
        f({ format_id: "d", vcodec: "vp09.00", ext: "webm", height: 2160, fps: 60 }),
      ],
    };
    expect(formatRows(video)).toEqual([
      ["2160p", "60", "VP9", "WEBM", "—"],
      ["720p", "30", "H.264", "MP4", "2.00 MB"],
    ]);
  });
});

describe("siteName", () => {
  it("spells yt-dlp's extractor keys the way the sites do", () => {
    expect(siteName("Youtube")).toBe("YouTube");
    expect(siteName("YoutubeTab")).toBe("YouTube");
    expect(siteName("TikTok")).toBe("TikTok");
    expect(siteName("Twitter")).toBe("X");
    expect(siteName("TwitchVod")).toBe("Twitch");
    expect(siteName("SoundcloudSet")).toBe("SoundCloud");
  });

  it("keeps a key it doesn't know, and nothing stays nothing", () => {
    expect(siteName("Rumble")).toBe("Rumble");
    expect(siteName(undefined)).toBeUndefined();
    expect(siteName(null)).toBeUndefined();
  });
});
