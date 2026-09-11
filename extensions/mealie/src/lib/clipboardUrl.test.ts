import { describe, expect, it } from "vitest";
import { extractUrl } from "./clipboardUrl";

describe("extractUrl", () => {
  it("accepts an https URL", () => {
    expect(extractUrl("https://example.org/recipe")).toBe("https://example.org/recipe");
  });

  it("trims surrounding whitespace", () => {
    expect(extractUrl("  https://example.org/r  ")).toBe("https://example.org/r");
  });

  it("rejects plain text", () => {
    expect(extractUrl("Tiramisu ohne Ei")).toBeUndefined();
  });

  it("rejects other schemes so no file path is sent to Mealie", () => {
    expect(extractUrl("file:///etc/passwd")).toBeUndefined();
    expect(extractUrl("javascript:alert(1)")).toBeUndefined();
  });

  it("handles empty input", () => {
    expect(extractUrl(undefined)).toBeUndefined();
    expect(extractUrl("")).toBeUndefined();
  });
});
