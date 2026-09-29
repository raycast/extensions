import { describe, it, expect } from "vitest";
import {
  cleanUpSrt,
  pickSubtitleFile,
  pickSubtitleTrack,
  srtToSegments,
  subLangsArg,
  subtitleLanguages,
} from "../src/transcript";
import { Video } from "../src/types";

const cue = (n: number, start: string, end: string, text: string) => `${n}\n${start} --> ${end}\n${text}\n`;

const SRT = [
  cue(1, "00:00:01,000", "00:00:03,000", "welcome back"),
  cue(2, "00:00:03,000", "00:00:05,000", "welcome back to the channel"),
  cue(3, "00:00:12,000", "00:00:14,000", "[Music]"),
  cue(4, "00:00:35,500", "00:00:38,000", "today we build a <i>rocket</i>"),
  cue(5, "00:01:10,000", "00:01:12,000", "and then we launch it"),
].join("\n");

describe("srtToSegments", () => {
  it("keeps start times, merges rolling captions and groups into windows", () => {
    expect(srtToSegments(SRT, 30)).toEqual([
      { start: 1, text: "welcome back to the channel" },
      { start: 35.5, text: "today we build a rocket" },
      { start: 70, text: "and then we launch it" },
    ]);
  });

  it("matches the plain transcript's words", () => {
    const joined = srtToSegments(SRT)
      .map((s) => s.text)
      .join(" ");
    // cleanUpSrt can leave a double space where it strips a cue; the words are the same.
    expect(joined).toBe(cleanUpSrt(SRT).replace(/\s+/g, " "));
  });

  it("starts a segment at its first spoken line, not at a dropped sound cue", () => {
    const srt = [
      cue(1, "00:01:05,000", "00:01:09,000", "[Music]"),
      cue(2, "00:01:10,000", "00:01:15,000", "thanks for watching"),
    ].join("\n");
    expect(srtToSegments(srt)).toEqual([{ start: 70, text: "thanks for watching" }]);
  });

  it("returns nothing for a cue-only track", () => {
    expect(srtToSegments(cue(1, "00:00:01,000", "00:00:02,000", "[Applause]"))).toEqual([]);
  });
});

describe("subtitle language helpers", () => {
  it("resolves auto to the video's language, then English", () => {
    expect(subtitleLanguages("auto", "cs")).toEqual(["cs", "en"]);
    expect(subtitleLanguages("auto", "en")).toEqual(["en"]);
    expect(subtitleLanguages("auto", undefined)).toEqual(["en"]);
    expect(subtitleLanguages("de", "cs")).toEqual(["de"]);
  });

  it("builds yt-dlp's --sub-langs value", () => {
    expect(subLangsArg(["cs", "en"])).toBe("cs,cs.*,en,en.*");
  });

  it("prefers the exact language, then a regional variant, in priority order", () => {
    const files = ["abc.en-orig.srt", "abc.cs.srt", "abc.en.srt", "abc.info.json"];
    expect(pickSubtitleFile(files, ["en", "cs"])).toBe("abc.en.srt");
    expect(pickSubtitleFile(["abc.en-US.srt", "abc.cs.srt"], ["en", "cs"])).toBe("abc.en-US.srt");
    expect(pickSubtitleFile(["abc.cs.srt"], ["en", "cs"])).toBe("abc.cs.srt");
    expect(pickSubtitleFile([], ["en"])).toBeUndefined();
  });
});

describe("pickSubtitleTrack", () => {
  const video = (subtitles: string[], automatic: string[]) =>
    ({
      title: "T",
      subtitles: Object.fromEntries(subtitles.map((l) => [l, []])),
      automatic_captions: Object.fromEntries(automatic.map((l) => [l, []])),
    }) as unknown as Video;

  it("prefers uploaded captions, then a regional variant", () => {
    expect(pickSubtitleTrack(video(["en", "de"], ["en-orig", "en"]), ["en"])).toBe("en");
    expect(pickSubtitleTrack(video(["en-GB"], ["en-orig"]), ["en"])).toBe("en-GB");
  });

  it("then the spoken-language transcription over a machine translation", () => {
    expect(pickSubtitleTrack(video([], ["cs-orig", "cs", "en", "de"]), ["cs", "en"])).toBe("cs-orig");
    expect(pickSubtitleTrack(video([], ["cs-orig", "en"]), ["en"])).toBe("en");
  });

  it("walks the wanted languages in order and ignores live chat", () => {
    expect(pickSubtitleTrack(video(["live_chat"], ["en"]), ["cs", "en"])).toBe("en");
    expect(pickSubtitleTrack(video(["live_chat"], []), ["en"])).toBeUndefined();
  });

  it("falls back to any spoken track only when asked to", () => {
    expect(pickSubtitleTrack(video(["de"], []), ["en"])).toBeUndefined();
    expect(pickSubtitleTrack(video(["de"], []), ["en"], { anyLanguage: true })).toBe("de");
    expect(pickSubtitleTrack(video([], ["fr", "ja-orig"]), ["en"], { anyLanguage: true })).toBe("ja-orig");
  });
});
