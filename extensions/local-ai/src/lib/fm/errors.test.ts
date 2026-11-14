import { describe, expect, it } from "vitest";
import { LICENSE_MESSAGE, mapFmFailure, SETUP_ERROR_KINDS, tooLongMessage } from "./errors";

describe("mapFmFailure", () => {
  it("maps context overflow", () => {
    const error = mapFmFailure({
      exitCode: 1,
      stderr: "Error: The session's transcript exceeded the model's context size.",
    });
    expect(error.kind).toBe("contextOverflow");
    expect(error.message).toBe("Text is too long for the on-device model");
  });

  it("maps an invalid model", () => {
    const error = mapFmFailure({
      exitCode: 64,
      stderr: "Error: The value 'pcc' is invalid for '-m <model>'. Please provide one of 'system'.\nHelp: ...",
      model: "pcc",
    });
    expect(error.kind).toBe("invalidModel");
    expect(error.message).toBe('Model "pcc" is not available on this Mac. Edit the command and pick another model.');
  });

  it("maps exit 69 to the license setup error", () => {
    const error = mapFmFailure({ exitCode: 69, stderr: "" });
    expect(error.kind).toBe("license");
    expect(error.message).toBe(LICENSE_MESSAGE);
    expect(LICENSE_MESSAGE).toBe("Open Terminal and run `fm license`. If that fails, try `sudo fm license`.");
  });

  it("maps ENOENT to notInstalled", () => {
    const error = mapFmFailure({ exitCode: null, stderr: "", spawnErrorCode: "ENOENT" });
    expect(error.kind).toBe("notInstalled");
    expect(error.message).toBe("Requires macOS 27 with Apple Intelligence");
  });

  it("maps a timeout", () => {
    const error = mapFmFailure({ exitCode: null, stderr: "", timedOut: true, timeoutMs: 60000 });
    expect(error.kind).toBe("timeout");
    expect(error.message).toBe(
      "The on-device model did not finish within 60 seconds. Try shorter text or raise the timeout in preferences.",
    );
  });

  it("lets aborted win over timedOut", () => {
    expect(mapFmFailure({ exitCode: null, stderr: "", aborted: true, timedOut: true, timeoutMs: 1000 }).kind).toBe(
      "aborted",
    );
  });

  it("maps unavailable", () => {
    const error = mapFmFailure({ exitCode: 1, stderr: "Error: Apple Intelligence is not enabled" });
    expect(error.kind).toBe("unavailable");
    expect(error.message).toBe("Turn on Apple Intelligence in System Settings");
  });

  it("maps a guardrail violation", () => {
    const error = mapFmFailure({ exitCode: 1, stderr: "Error: Guardrail violation" });
    expect(error.kind).toBe("guardrail");
    expect(error.message).toBe("The on-device model declined this text.");
  });

  it("falls back to the first stderr line", () => {
    const error = mapFmFailure({ exitCode: 3, stderr: "Error: Something odd\nmore" });
    expect(error.kind).toBe("unknown");
    expect(error.message).toBe("Something odd");
  });

  it("falls back to the exit code on empty stderr", () => {
    expect(mapFmFailure({ exitCode: 3, stderr: "" }).message).toBe("fm exited with code 3");
  });
});

describe("tooLongMessage", () => {
  it("includes the numbers when given", () => {
    expect(tooLongMessage(1971, 1970)).toBe("Text is too long for the on-device model (1971 tokens, limit 1970)");
  });
});

describe("SETUP_ERROR_KINDS", () => {
  it("lists the setup kinds", () => {
    expect([...SETUP_ERROR_KINDS].sort()).toEqual(["license", "notInstalled", "unavailable"]);
  });
});
