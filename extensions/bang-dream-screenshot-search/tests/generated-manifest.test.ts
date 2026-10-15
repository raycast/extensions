import { describe, expect, it } from "vitest";
import manifestData from "../src/data/screenshots.json";
import type { ScreenshotManifest } from "../src/types";

const manifest = manifestData as ScreenshotManifest;

describe("generated screenshot manifest", () => {
  it("contains the expected series and unique screenshots", () => {
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.series.map((series) => series.id)).toEqual(["mygo", "ave-mujica"]);
    expect(manifest.screenshots.length).toBeGreaterThan(2_000);
    expect(new Set(manifest.screenshots.map((screenshot) => screenshot.id)).size).toBe(manifest.screenshots.length);
  });

  it("pins every remote URL to the recorded source commit", () => {
    expect(manifest.sourceCommit).toMatch(/^[0-9a-f]{40}$/);
    for (const screenshot of manifest.screenshots) {
      expect(screenshot.previewUrl).toContain(`/${manifest.sourceCommit}/`);
      expect(screenshot.previewUrl.endsWith(".webp")).toBe(true);
      expect(screenshot.copyUrl).toContain(`/${manifest.sourceCommit}/`);
      expect(screenshot.copyUrl.endsWith(".jpg")).toBe(true);
    }
  });
});
