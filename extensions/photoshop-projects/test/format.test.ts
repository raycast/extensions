import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatBytes,
  formatDimensions,
  formatRelativeDate,
  isValidPhotoshopExtension,
  stripExtension,
} from "../src/utils/format";

describe("format utilities", () => {
  it("formats byte sizes correctly", () => {
    assert.equal(formatBytes(0), "0 B");
    assert.equal(formatBytes(-10), "0 B");
    assert.equal(formatBytes(512), "512 B");
    assert.equal(formatBytes(1024), "1.0 KB");
    assert.equal(formatBytes(1048576), "1.0 MB");
    assert.equal(formatBytes(1073741824), "1.0 GB");
  });

  it("identifies valid Photoshop file extensions", () => {
    assert.equal(isValidPhotoshopExtension("psd"), true);
    assert.equal(isValidPhotoshopExtension(".psd"), true);
    assert.equal(isValidPhotoshopExtension("psb"), true);
    assert.equal(isValidPhotoshopExtension(".psdt"), true);
    assert.equal(isValidPhotoshopExtension("pdd"), true);
    assert.equal(isValidPhotoshopExtension("jpg"), false);
    assert.equal(isValidPhotoshopExtension("png"), false);
    assert.equal(isValidPhotoshopExtension("exe"), false);
  });

  it("strips file extensions properly", () => {
    assert.equal(stripExtension("poster.psd"), "poster");
    assert.equal(stripExtension("my.complex.project.psb"), "my.complex.project");
    assert.equal(stripExtension("noextension"), "noextension");
  });

  it("formats document dimensions and DPI", () => {
    assert.equal(formatDimensions(undefined), "");
    assert.equal(formatDimensions({ width: 1920, height: 1080 }), "1920 × 1080 px");
    assert.equal(formatDimensions({ width: 3000, height: 2000, dpi: 300 }), "3000 × 2000 px (300 DPI)");
  });

  it("formats relative dates safely", () => {
    assert.equal(formatRelativeDate(undefined), "");
    assert.equal(formatRelativeDate(new Date(NaN)), "");
    const now = new Date();
    assert.equal(formatRelativeDate(now), "Just now");
  });
});
