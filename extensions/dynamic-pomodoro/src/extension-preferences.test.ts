import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("extension exposes completion sound as global dropdown preference", () => {
  const manifestPath = resolve(import.meta.dirname, "..", "package.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    preferences?: Array<{
      name: string;
      type?: string;
      default?: string;
      data?: Array<{ title: string; value: string }>;
    }>;
  };

  const completionSoundPreference = manifest.preferences?.find((item) => item.name === "completionSoundId");
  assert.ok(completionSoundPreference);
  assert.equal(completionSoundPreference.type, "dropdown");
  assert.equal(completionSoundPreference.default, "system-beep");
  assert.ok(completionSoundPreference.data?.some((item) => item.value === "system-beep"));
});
