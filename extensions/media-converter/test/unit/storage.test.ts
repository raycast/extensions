import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { LocalStorage } from "@raycast/api";
import { getBuiltInPresets, getUserPresets } from "../../src/utils/presets";
import { listHistory } from "../../src/utils/history";

beforeEach(async () => {
  await LocalStorage.clear();
});

describe("preset persistence validation", () => {
  it("accepts curated built-ins through runtime validation", () => {
    assert.ok(getBuiltInPresets().length >= 5);
  });

  it("drops malformed user presets while preserving valid ones", async () => {
    await LocalStorage.setItem(
      "user-presets",
      JSON.stringify({
        v: 1,
        presets: [
          { id: "bad", name: "Bad", mediaType: "image", outputFormat: ".jpg", quality: { ".jpg": 999 } },
          { id: "good", name: "Good", mediaType: "image", outputFormat: ".jpg", quality: { ".jpg": 80 } },
        ],
      }),
    );
    assert.deepEqual(
      (await getUserPresets()).map((preset) => preset.id),
      ["good"],
    );
  });

  it("rejects unsupported future schemas", async () => {
    await LocalStorage.setItem(
      "user-presets",
      JSON.stringify({
        v: 99,
        presets: [{ id: "future", name: "Future", mediaType: "image", outputFormat: ".jpg", quality: { ".jpg": 80 } }],
      }),
    );
    assert.deepEqual(await getUserPresets(), []);
  });
});

describe("history migration and validation", () => {
  it("migrates a valid v1 conversion entry to the current operation model", async () => {
    await LocalStorage.setItem(
      "conversion-history",
      JSON.stringify({
        v: 1,
        entries: [
          {
            id: "old",
            timestampMs: 1,
            inputs: ["/tmp/in.jpg"],
            outputs: ["/tmp/out.webp"],
            outputFormat: ".webp",
            quality: { ".webp": 80 },
            mediaType: "image",
            durationMs: 10,
            inputBytes: 100,
            outputBytes: 50,
          },
        ],
      }),
    );
    const entries = await listHistory();
    assert.equal(entries.length, 1);
    assert.equal(entries[0].operation, "convert");
  });

  it("drops corrupt entries instead of passing invalid settings downstream", async () => {
    await LocalStorage.setItem(
      "conversion-history",
      JSON.stringify({
        v: 2,
        entries: [{ id: "bad", timestampMs: "yesterday", inputs: "nope" }],
      }),
    );
    assert.deepEqual(await listHistory(), []);
  });
});
