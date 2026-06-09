import { describe, expect, it } from "vitest";
import { classifyOsascriptError, type OsascriptResult } from "./osascript";

function result(partial: Partial<OsascriptResult>): OsascriptResult {
  return { ok: false, stdout: "", stderr: "", timedOut: false, ...partial };
}

describe("classifyOsascriptError", () => {
  it("classifies timeouts", () => {
    expect(classifyOsascriptError(result({ timedOut: true }))).toBe("timeout");
  });

  it("classifies Accessibility permission errors from various macOS phrasings", () => {
    expect(classifyOsascriptError(result({ stderr: "osascript is not allowed assistive access. (-1719)" }))).toBe(
      "permission",
    );
    expect(classifyOsascriptError(result({ stderr: "Error 1002: not authorized" }))).toBe("permission");
    expect(classifyOsascriptError(result({ stderr: "accessibility access disabled" }))).toBe("permission");
  });

  it("classifies everything else as other", () => {
    expect(classifyOsascriptError(result({ stderr: "Discord got an error: Application isn't running." }))).toBe(
      "other",
    );
    expect(classifyOsascriptError(result({ stderr: "" }))).toBe("other");
  });
});
