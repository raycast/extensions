import { describe, expect, it } from "vitest";
import { errorMarkdown, FmError, LICENSE_EXIT_CODE, stripAnsi, toFmError } from "../src/lib/errors";

const ESC = String.fromCharCode(27);

describe("stripAnsi", () => {
  it("removes color codes that fm prints even when piped", () => {
    expect(stripAnsi(`${ESC}[31mError:${ESC}[0m bad`)).toBe("Error: bad");
  });
});

describe("toFmError", () => {
  it("maps exit code 69 to the license error", () => {
    expect(toFmError("anything", LICENSE_EXIT_CODE).kind).toBe("license");
  });

  it("recognizes the guardrails message", () => {
    const error = toFmError(`${ESC}[31mError: The model's safety guardrails were triggered.${ESC}[0m`, 1);
    expect(error.kind).toBe("guardrails");
    expect(error.detail).toBe("The model's safety guardrails were triggered.");
  });

  it("recognizes a context overflow", () => {
    expect(toFmError("Error: The session's transcript exceeded the model's context size.", 1).kind).toBe(
      "context-overflow",
    );
  });

  it("recognizes an unavailable model", () => {
    expect(toFmError("Error: Model unavailable: Apple Intelligence is not enabled", 1).kind).toBe("model-unavailable");
  });

  it("ignores the transcript note and keeps unknown text as the message", () => {
    const error = toFmError("Transcript saved to: /tmp/x.json\nError: Something odd", 2);
    expect(error.kind).toBe("unknown");
    expect(error.message).toBe("Something odd");
  });

  it("falls back to the exit code when stderr is empty", () => {
    expect(toFmError("", 3).message).toBe("fm exited with code 3.");
  });
});

describe("errorMarkdown", () => {
  it("points to Check Setup for setup problems only", () => {
    expect(errorMarkdown(new FmError("license", "No license"))).toContain("Check Setup");
    expect(errorMarkdown(new FmError("guardrails", "Blocked"))).not.toContain("Check Setup");
  });
});
