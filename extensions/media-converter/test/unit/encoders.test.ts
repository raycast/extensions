import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildAvifArgs, parseEncoderList, pickAvifEncoder } from "../../src/utils/encoders";

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
