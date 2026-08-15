import { describe, expect, it } from "vitest";
import { asideCompatibilityWarning, compareDottedVersions } from "../src/lib/version";

describe("Aside compatibility versions", () => {
  it("compares four-part Aside versions numerically", () => {
    expect(compareDottedVersions("1.0.813.1", "1.0.728.1")).toBe(1);
    expect(compareDottedVersions("1.0.728.1", "1.0.728.1")).toBe(0);
    expect(compareDottedVersions("1.0.700.12", "1.0.728.1")).toBe(-1);
  });

  it("accepts versions in the tested range", () => {
    expect(asideCompatibilityWarning("1.0.728.1")).toBeUndefined();
    expect(asideCompatibilityWarning("1.0.800.1")).toBeUndefined();
    expect(asideCompatibilityWarning("1.0.813.1")).toBeUndefined();
  });

  it("warns without blocking versions outside the tested range", () => {
    expect(asideCompatibilityWarning("1.0.700.1")?.title).toMatch(/older/);
    expect(asideCompatibilityWarning("1.0.900.1")?.title).toMatch(/not been compatibility-tested/);
    expect(asideCompatibilityWarning("unknown")?.title).toMatch(/not been compatibility-tested/);
  });
});
