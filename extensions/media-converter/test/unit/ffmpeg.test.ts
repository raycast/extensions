import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MIN_FFMPEG_HEIC_INPUT_VERSION, supportsHeicInput } from "../../src/utils/ffmpeg";

describe("supportsHeicInput", () => {
  it("always allows HEIC input on macOS regardless of FFmpeg version", () => {
    assert.equal(supportsHeicInput(6.0, "darwin"), true);
    assert.equal(supportsHeicInput(null, "darwin"), true);
    assert.equal(supportsHeicInput(undefined, "darwin"), true);
  });

  it("allows HEIC input on Windows and Linux when FFmpeg is 7.0 or newer", () => {
    assert.equal(supportsHeicInput(MIN_FFMPEG_HEIC_INPUT_VERSION, "win32"), true);
    assert.equal(supportsHeicInput(7.1, "win32"), true);
    assert.equal(supportsHeicInput(99.0, "win32"), true);
    assert.equal(supportsHeicInput(7.0, "linux"), true);
  });

  it("rejects HEIC input on Windows and Linux when FFmpeg is older than 7.0 or unknown", () => {
    assert.equal(supportsHeicInput(6.1, "win32"), false);
    assert.equal(supportsHeicInput(6.9, "linux"), false);
    assert.equal(supportsHeicInput(null, "win32"), false);
    assert.equal(supportsHeicInput(undefined, "win32"), false);
  });
});
