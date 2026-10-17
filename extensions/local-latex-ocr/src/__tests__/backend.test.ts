import { describe, expect, it } from "vitest";
import { backendCandidates } from "../lib/inference";

describe("inference backend selection", () => {
  it("prefers the measured native CPU backend on Apple Silicon", () => {
    expect(backendCandidates("auto", "darwin", "arm64")).toEqual(["cpu", "coreml", "wasm"]);
  });

  it("keeps Core ML and WASM fallbacks when Core ML is requested", () => {
    expect(backendCandidates("coreml", "darwin", "arm64")).toEqual(["coreml", "cpu", "wasm"]);
  });

  it("uses the portable backend elsewhere", () => {
    expect(backendCandidates("auto", "linux", "x64")).toEqual(["wasm"]);
  });
});
