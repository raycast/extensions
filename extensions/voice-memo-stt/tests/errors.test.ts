import { describe, expect, test } from "bun:test";
import { describeFailure, stderrMessage, VmtError } from "../src/errors";

describe("stderrMessage", () => {
  test("picks the reported error out of surrounding output", () => {
    const stderr = ["Error: no transcript found for \"a.m4a\"", "", "Usage:", "  vmt preview <recording>"].join("\n");
    expect(stderrMessage(stderr)).toBe('no transcript found for "a.m4a"');
  });

  test("falls back to the first non-empty line", () => {
    expect(stderrMessage("\n  something broke\n")).toBe("something broke");
  });

  test("survives empty output", () => {
    expect(stderrMessage("")).toBe("");
  });
});

describe("describeFailure", () => {
  test("answers a Full Disk Access denial with the fix, not the message", () => {
    const stderr =
      "Error: macOS denied access to the Voice Memos database — grant Full Disk Access to the app running vmt";
    const error = describeFailure("list", stderr);
    expect(error).toBeInstanceOf(VmtError);
    expect(error.message).toBe("Raycast cannot read Voice Memos");
    expect(error.detail).toContain("System Settings");
  });

  test("passes any other error through verbatim", () => {
    const error = describeFailure("transcribe", "Error: ElevenLabs API key not set");
    expect(error.message).toBe("ElevenLabs API key not set");
  });

  test("names the command when vmt said nothing at all", () => {
    expect(describeFailure("list", "").message).toBe("vmt list failed");
  });
});
