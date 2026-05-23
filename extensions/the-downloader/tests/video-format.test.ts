import { describe, it, expect } from "vitest";
import { videoFormatSelector, composeVideoFormat } from "../src/lib/video-format";

describe("videoFormatSelector", () => {
  // For mp4 we steer yt-dlp toward H.264 (avc1) video + AAC (m4a) audio so the
  // streams remux losslessly into a QuickTime-playable mp4 (no re-encode). The
  // filter is on the *codec*, not the container: YouTube ships AV1 inside mp4
  // too, and AV1 won't reliably play in QuickTime — so [ext=mp4] is not enough,
  // it must be [vcodec^=avc1]. H.264 caps at 1080p on YouTube, the accepted
  // tradeoff for "an mp4 that always opens".
  describe("mp4 container — prefers H.264/AAC by codec, with progressive fallbacks", () => {
    it("maps 'best' to an avc1-preferring selector ending in a best-anything fallback", () => {
      expect(videoFormatSelector("best", "mp4")).toBe(
        "bestvideo[vcodec^=avc1]+bestaudio[ext=m4a]/best[vcodec^=avc1]/bestvideo+bestaudio/best",
      );
    });

    it("applies the height cap to every alternative in the mp4 selector", () => {
      expect(videoFormatSelector("1080", "mp4")).toBe(
        "bestvideo[height<=1080][vcodec^=avc1]+bestaudio[ext=m4a]/best[height<=1080][vcodec^=avc1]/bestvideo[height<=1080]+bestaudio/best[height<=1080]",
      );
    });

    it("maps 'smallest' to a worst-quality avc1-preferring selector", () => {
      expect(videoFormatSelector("smallest", "mp4")).toBe(
        "worstvideo[vcodec^=avc1]+worstaudio[ext=m4a]/worst[vcodec^=avc1]/worstvideo+worstaudio/worst",
      );
    });
  });

  // Non-mp4 containers (mkv, webm) impose no codec constraint, so we keep the
  // simple best-streams selector and let --merge-output-format set the box.
  describe("non-mp4 containers — codec-agnostic best streams", () => {
    it("maps 'best' to an uncapped selector", () => {
      expect(videoFormatSelector("best", "mkv")).toBe("bestvideo+bestaudio/best");
    });

    it("maps '1080' to a 1080-capped selector", () => {
      expect(videoFormatSelector("1080", "webm")).toBe("bestvideo[height<=1080]+bestaudio/best[height<=1080]");
    });

    it("maps 'smallest' to a worst-quality selector", () => {
      expect(videoFormatSelector("smallest", "mkv")).toBe("worstvideo+worstaudio/worst");
    });

    it("falls back to the uncapped selector for an unrecognised quality token", () => {
      expect(videoFormatSelector("360", "mkv")).toBe("bestvideo+bestaudio/best");
    });
  });
});

describe("composeVideoFormat", () => {
  it("composes an mp4 video format with the avc1-preferring selector and mp4 merge container", () => {
    expect(composeVideoFormat({ mediaType: "video", quality: "best", container: "mp4", audioFormat: "mp3" })).toBe(
      "bestvideo[vcodec^=avc1]+bestaudio[ext=m4a]/best[vcodec^=avc1]/bestvideo+bestaudio/best#mp4",
    );
  });

  it("composes a non-mp4 video format as '<selector>#<container>' with the quality cap", () => {
    expect(composeVideoFormat({ mediaType: "video", quality: "1080", container: "mkv", audioFormat: "mp3" })).toBe(
      "bestvideo[height<=1080]+bestaudio/best[height<=1080]#mkv",
    );
  });

  it("composes an audio format as 'bestaudio#<audioFormat>', ignoring quality and container", () => {
    expect(composeVideoFormat({ mediaType: "audio", quality: "1080", container: "mp4", audioFormat: "opus" })).toBe(
      "bestaudio#opus",
    );
  });

  it("passes the chosen audio format through", () => {
    expect(composeVideoFormat({ mediaType: "audio", quality: "best", container: "mp4", audioFormat: "m4a" })).toBe(
      "bestaudio#m4a",
    );
  });
});
