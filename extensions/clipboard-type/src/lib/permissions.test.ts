import { describe, expect, it } from "vitest";
import { detectMissingPermission } from "./permissions";

describe("detectMissingPermission", () => {
  it("detects a missing Accessibility permission", () => {
    expect(
      detectMissingPermission("System Events got an error: osascript is not allowed to send keystrokes. (1002)"),
    ).toBe("accessibility");
  });

  it("detects a missing Automation permission", () => {
    expect(detectMissingPermission("Not authorized to send Apple events to System Events. (-1743)")).toBe("automation");
    expect(detectMissingPermission("execution error: (-1743)")).toBe("automation");
  });

  it("ignores unrelated errors", () => {
    expect(detectMissingPermission("execution error: Can't get application. (-1728)")).toBeNull();
    expect(detectMissingPermission("")).toBeNull();
  });
});
