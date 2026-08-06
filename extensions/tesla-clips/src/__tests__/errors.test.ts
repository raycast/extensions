import { describe, expect, it } from "vitest";
import {
  FfmpegNotFoundError,
  OutputRootNotFoundError,
  OutputValidationError,
  SourceNotFoundError,
  getUserFriendlyMessage,
  isTeslaClipError,
} from "../lib/errors";

describe("errors", () => {
  it("identifies TeslaClipError instances", () => {
    expect(isTeslaClipError(new FfmpegNotFoundError("missing"))).toBe(true);
    expect(isTeslaClipError(new Error("plain"))).toBe(false);
  });

  it("returns user-friendly messages for typed errors", () => {
    const error = new SourceNotFoundError("missing", { paths: ["/tmp/missing"] });
    expect(getUserFriendlyMessage(error)).toBe("Source folder not found: /tmp/missing");
  });

  it("returns user-friendly messages for output root errors", () => {
    const error = new OutputRootNotFoundError("missing", { outputPath: "/tmp/output" });
    expect(getUserFriendlyMessage(error)).toBe("Output root folder does not exist: /tmp/output");
  });

  it("returns user-friendly messages for output validation errors", () => {
    const error = new OutputValidationError("Output file is empty: /tmp/out.mp4");
    expect(getUserFriendlyMessage(error)).toContain("Output validation failed");
  });

  it("falls back to Error.message for plain errors", () => {
    expect(getUserFriendlyMessage(new Error("boom"))).toBe("boom");
  });

  it("stringifies unknown values", () => {
    expect(getUserFriendlyMessage("oops")).toBe("oops");
  });
});
