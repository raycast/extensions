import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildAvifArgs,
  formatQualityCrfHint,
  isCodecSupportedByNvenc,
  isNvencCodec,
  mapPresetToAomCpuUsed,
  mapPresetToNvenc,
  mapPresetToSvtAv1,
  parseEncoderList,
  pickAv1VideoEncoder,
  pickAvifEncoder,
  qualityPercentToCrf,
} from "../../src/utils/encoders";

// Trimmed from `ffmpeg -hide_banner -encoders` of Homebrew's ffmpeg 9.0.2,
// which has no libwebp or libaom-av1.
const HOMEBREW_ENCODERS = `Encoders:
 V..... = Video
 A..... = Audio
 S..... = Subtitle
 .F.... = Frame-level multithreading
 ..S... = Slice-level multithreading
 ...X.. = Codec is experimental
 ....B. = Supports draw_horiz_band
 .....D = Supports direct rendering method 1
 ------
 V....D a64multi             Multicolor charset for Commodore 64 (codec a64_multi)
 V..... libsvtav1            SVT-AV1(Scalable Video Technology for AV1) encoder (codec av1)
 V....D libx264              libx264 H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10 (codec h264)
 V....D png                  PNG (Portable Network Graphics) image
 A....D aac                  AAC (Advanced Audio Coding)
 S..... srt                  SubRip subtitle
`;

describe("parseEncoderList", () => {
  it("reads encoder names and skips the legend", () => {
    const encoders = parseEncoderList(HOMEBREW_ENCODERS);
    assert.deepEqual([...encoders], ["a64multi", "libsvtav1", "libx264", "png", "aac", "srt"]);
    assert.equal(encoders.has("libwebp"), false);
  });
});

describe("pickAvifEncoder", () => {
  it("falls back to libsvtav1 when libaom-av1 is missing", () => {
    assert.equal(pickAvifEncoder(parseEncoderList(HOMEBREW_ENCODERS)), "libsvtav1");
  });

  it("prefers libaom-av1, and keeps it when the encoder list is unknown", () => {
    assert.equal(pickAvifEncoder(new Set(["libaom-av1", "libsvtav1"])), "libaom-av1");
    assert.equal(pickAvifEncoder(null), "libaom-av1");
  });

  it("returns null when no AV1 encoder is available", () => {
    assert.equal(pickAvifEncoder(new Set(["libx264"])), null);
  });
});

describe("buildAvifArgs", () => {
  it("passes -still-picture to libaom-av1 only", () => {
    assert.deepEqual(buildAvifArgs("libaom-av1", 80), ["-c:v", "libaom-av1", "-crf", "13", "-still-picture", "1"]);
    assert.deepEqual(buildAvifArgs("libsvtav1", 80), ["-c:v", "libsvtav1", "-crf", "13"]);
  });

  it("maps quality 100 to CRF 0 and quality 0 to CRF 63", () => {
    assert.deepEqual(buildAvifArgs("libsvtav1", 100).slice(2), ["-crf", "0"]);
    assert.deepEqual(buildAvifArgs("libsvtav1", 0).slice(2), ["-crf", "63"]);
  });
});

describe("AV1 video encoder helpers", () => {
  it("picks explicit av1-nvenc and CPU av1 encoders when present", () => {
    const all = new Set(["av1_nvenc", "libsvtav1", "libaom-av1"]);
    assert.equal(pickAv1VideoEncoder("av1-nvenc", all), "av1_nvenc");
    assert.equal(pickAv1VideoEncoder("av1", all), "libsvtav1");
  });

  it("falls back from libsvtav1 -> libaom-av1 for CPU av1 without picking av1_nvenc", () => {
    assert.equal(pickAv1VideoEncoder("av1", new Set(["av1_nvenc", "libaom-av1"])), "libaom-av1");
    assert.equal(pickAv1VideoEncoder("av1", new Set(["av1_nvenc"])), null);
    assert.equal(pickAv1VideoEncoder("av1", new Set(["libx264"])), null);
    assert.equal(pickAv1VideoEncoder("av1-nvenc", new Set(["libsvtav1"])), null);
  });

  it("maps presets and quality hints cleanly", () => {
    assert.equal(mapPresetToNvenc("slow"), "p6");
    assert.equal(mapPresetToSvtAv1("medium"), "6");
    assert.equal(mapPresetToAomCpuUsed("slow"), "4");
    assert.equal(qualityPercentToCrf(40, 51), 31);
    assert.equal(qualityPercentToCrf(40, 63), 38);
    assert.equal(formatQualityCrfHint(40, "hevc"), "CRF 31");
    assert.equal(formatQualityCrfHint(30, "av1-nvenc"), "CQ 36");
    assert.equal(formatQualityCrfHint(30, "h264-nvenc"), "CQ 36");
    assert.equal(formatQualityCrfHint(100, "hevc-nvenc"), "Lossless");
    assert.equal(formatQualityCrfHint(45, "av1"), "CRF 35");
  });

  it("filters NVENC codecs by detected GPU capabilities", () => {
    assert.equal(isNvencCodec("h264"), false);
    assert.equal(isNvencCodec("h264-nvenc"), true);
    assert.equal(isNvencCodec("hevc-nvenc"), true);
    assert.equal(isNvencCodec("av1-nvenc"), true);

    const rtx30 = { h264: true, hevc: true, av1: false };
    assert.equal(isCodecSupportedByNvenc("h264", null), true);
    assert.equal(isCodecSupportedByNvenc("h264-nvenc", null), false);
    assert.equal(isCodecSupportedByNvenc("h264-nvenc", rtx30), true);
    assert.equal(isCodecSupportedByNvenc("hevc-nvenc", rtx30), true);
    assert.equal(isCodecSupportedByNvenc("av1-nvenc", rtx30), false);
  });
});
