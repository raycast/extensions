import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { clampPercent, resolveQualitySettings } from "../../src/utils/qualityResolver";

describe("resolveQualitySettings", () => {
  it("clamps percentage overrides", () => {
    assert.equal(clampPercent(120), 100);
    assert.equal(clampPercent(-4), 0);
  });

  it("builds image, audio, and video settings from one resolver", () => {
    assert.deepEqual(resolveQualitySettings("image", ".jpg", undefined, { imageQualityPercent: 72 }), { ".jpg": 72 });
    assert.equal(
      (resolveQualitySettings("audio", ".mp3", "high") as { ".mp3": { bitrate: string } })[".mp3"].bitrate,
      "256",
    );
    assert.equal(
      (resolveQualitySettings("video", ".mp4", "high") as { ".mp4": { encodingMode: string } })[".mp4"].encodingMode,
      "crf",
    );
  });

  it("uses preset quality as the base while allowing explicit overrides", () => {
    const preset = { ".jpg": 35 } as never;
    assert.deepEqual(resolveQualitySettings("image", ".jpg", undefined, {}, preset), { ".jpg": 35 });
    assert.deepEqual(resolveQualitySettings("image", ".jpg", undefined, { imageQualityPercent: 90 }, preset), {
      ".jpg": 90,
    });
  });
});
