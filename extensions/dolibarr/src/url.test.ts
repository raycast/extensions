import { describe, expect, it } from "vitest";
import { normalizeBaseUrl } from "./url";

describe("normalizeBaseUrl", () => {
  it("appends the API path to a bare instance URL", () => {
    expect(normalizeBaseUrl("https://dolibarr.example.org")).toBe("https://dolibarr.example.org/api/index.php");
  });

  it("strips trailing slashes", () => {
    expect(normalizeBaseUrl("https://dolibarr.example.org///")).toBe("https://dolibarr.example.org/api/index.php");
  });

  it("does not duplicate an API path that is already there", () => {
    expect(normalizeBaseUrl("https://dolibarr.example.org/api/index.php")).toBe(
      "https://dolibarr.example.org/api/index.php",
    );
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeBaseUrl("  https://dolibarr.example.org  ")).toBe("https://dolibarr.example.org/api/index.php");
  });

  it("adds https when the scheme is missing", () => {
    expect(normalizeBaseUrl("dolibarr.example.org")).toBe("https://dolibarr.example.org/api/index.php");
  });

  it("rejects an empty input", () => {
    expect(() => normalizeBaseUrl("   ")).toThrow(/Dolibarr URL/);
  });
});
