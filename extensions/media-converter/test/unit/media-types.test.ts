import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getMediaType,
  getOutputCategory,
  getDefaultQuality,
  OUTPUT_ALL_EXTENSIONS,
  type AllOutputExtension,
} from "../../src/types/media";
// We intentionally don't import `../../src/utils/presets` here — it imports
// `@raycast/api` at module load, which is only available inside Raycast.
// Instead we validate the built-in presets JSON directly against the
// schema contracts exposed by `../../src/types/media`.
import builtInPresetsFile from "../../src/config/built-in-presets.json";

type RawBuiltInPreset = {
  id: string;
  name: string;
  mediaType: "image" | "video" | "audio" | "gif";
  outputFormat: string;
  quality: Record<string, unknown>;
  stripMetadata?: boolean;
  description?: string;
};
const builtInPresets = (builtInPresetsFile as { presets: RawBuiltInPreset[] }).presets;

describe("getMediaType", () => {
  it("detects common video extensions", () => {
    assert.equal(getMediaType(".mp4"), "video");
    assert.equal(getMediaType(".MOV"), "video");
    assert.equal(getMediaType(".webm"), "video");
  });

  it("detects common audio extensions", () => {
    assert.equal(getMediaType(".mp3"), "audio");
    assert.equal(getMediaType(".flac"), "audio");
  });

  it("detects common image extensions", () => {
    assert.equal(getMediaType(".jpg"), "image");
    assert.equal(getMediaType(".png"), "image");
    assert.equal(getMediaType(".heic"), "image");
  });

  it("returns null for unknown extensions", () => {
    assert.equal(getMediaType(".xyz"), null);
    assert.equal(getMediaType(""), null);
  });
});

describe("getOutputCategory", () => {
  it("puts .gif in its own category (not image)", () => {
    assert.equal(getOutputCategory(".gif"), "gif");
  });

  it("recognises image outputs", () => {
    assert.equal(getOutputCategory(".jpg"), "image");
    assert.equal(getOutputCategory(".png"), "image");
    assert.equal(getOutputCategory(".webp"), "image");
  });

  it("recognises audio outputs", () => {
    assert.equal(getOutputCategory(".mp3"), "audio");
    assert.equal(getOutputCategory(".flac"), "audio");
  });

  it("recognises video outputs", () => {
    assert.equal(getOutputCategory(".mp4"), "video");
    assert.equal(getOutputCategory(".mkv"), "video");
  });
});

describe("getDefaultQuality", () => {
  // Minimal preferences object for simple-mode defaults.
  const basePrefs = {
    moreConversionSettings: false,
    defaultJpgQuality: "80",
    defaultWebpQuality: "80",
    defaultPngVariant: "png-24",
    defaultHeicQuality: "80",
    defaultTiffCompression: "deflate",
    defaultAvifQuality: "80",
  };

  it("returns a GIF quality shape for .gif", () => {
    const q = getDefaultQuality(".gif", { ...basePrefs }, "high") as {
      ".gif": { fps: string; width: string; loop: boolean };
    };
    assert.ok(q[".gif"]);
    assert.ok(["10", "15", "24", "30"].includes(q[".gif"].fps));
    assert.ok(["original", "480", "720", "1080"].includes(q[".gif"].width));
    assert.equal(typeof q[".gif"].loop, "boolean");
  });

  it("honours defaultGifFps and defaultGifWidth preferences for .gif", () => {
    const q = getDefaultQuality(".gif", { ...basePrefs, defaultGifFps: "24", defaultGifWidth: "720" }, "high") as {
      ".gif": { fps: string; width: string };
    };
    assert.equal(q[".gif"].fps, "24");
    assert.equal(q[".gif"].width, "720");
  });

  it("returns image quality based on preferences", () => {
    const q = getDefaultQuality(".jpg", { ...basePrefs, defaultJpgQuality: "70" }) as { ".jpg": number };
    assert.equal(q[".jpg"], 70);
  });

  it("returns simple-mode audio quality for .mp3", () => {
    const q = getDefaultQuality(".mp3", { ...basePrefs }, "high") as { ".mp3": { bitrate: string; vbr: boolean } };
    assert.ok(q[".mp3"]);
    assert.equal(typeof q[".mp3"].bitrate, "string");
    assert.equal(typeof q[".mp3"].vbr, "boolean");
  });

  it("returns simple-mode video quality for .mp4", () => {
    const q = getDefaultQuality(".mp4", { ...basePrefs }, "high") as { ".mp4": Record<string, unknown> };
    assert.ok(q[".mp4"]);
  });

  it("throws when simple-mode is used without a quality level", () => {
    assert.throws(() => getDefaultQuality(".mp4", { ...basePrefs }));
  });
});

describe("built-in-presets.json", () => {
  it("includes a non-empty set of curated presets", () => {
    assert.ok(builtInPresets.length >= 5, `expected >=5 built-in presets, got ${builtInPresets.length}`);
  });

  it("every preset points at a valid output extension", () => {
    for (const p of builtInPresets) {
      assert.ok(
        (OUTPUT_ALL_EXTENSIONS as readonly AllOutputExtension[]).includes(p.outputFormat as AllOutputExtension),
        `preset ${p.id} has invalid outputFormat ${p.outputFormat}`,
      );
    }
  });

  it("has unique preset ids", () => {
    const ids = builtInPresets.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length, "preset ids must be unique");
  });

  it("quality shape exists for the declared outputFormat", () => {
    for (const p of builtInPresets) {
      assert.ok(p.quality[p.outputFormat] !== undefined, `preset ${p.id} has no quality entry for ${p.outputFormat}`);
    }
  });

  it("mediaType is one of image|video|audio|gif", () => {
    for (const p of builtInPresets) {
      assert.ok(
        ["image", "video", "audio", "gif"].includes(p.mediaType),
        `preset ${p.id} has invalid mediaType ${p.mediaType}`,
      );
    }
  });

  it("gif presets declare the required fps/width/loop quality keys", () => {
    for (const p of builtInPresets) {
      if (p.outputFormat === ".gif") {
        const q = p.quality[".gif"] as Record<string, unknown>;
        assert.equal(typeof q.fps, "string", `preset ${p.id} .gif.fps must be a string`);
        assert.equal(typeof q.width, "string", `preset ${p.id} .gif.width must be a string`);
        assert.equal(typeof q.loop, "boolean", `preset ${p.id} .gif.loop must be a boolean`);
      }
    }
  });
});
