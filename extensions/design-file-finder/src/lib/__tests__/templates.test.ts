import { describe, expect, it } from "vitest";
import { sanitizeName, targetPathFor } from "../templates";

describe("sanitizeName", () => {
  it("strips path separators and leading dots", () => {
    expect(sanitizeName("My/Project")).toBe("My-Project");
    expect(sanitizeName("a\\b:c")).toBe("a-b-c");
    expect(sanitizeName("..hidden")).toBe("hidden");
  });
  it("collapses whitespace and trims", () => {
    expect(sanitizeName("  cool   name  ")).toBe("cool name");
  });
});

describe("targetPathFor", () => {
  it("builds a flat target path", () => {
    expect(
      targetPathFor({ destination: "/Work", name: "Promo", ext: "psd", wrapInFolder: false }),
    ).toEqual({
      dir: "/Work",
      file: "/Work/Promo.psd",
    });
  });
  it("wraps in a folder named after the project", () => {
    expect(
      targetPathFor({ destination: "/Work", name: "Promo", ext: "prproj", wrapInFolder: true }),
    ).toEqual({
      dir: "/Work/Promo",
      file: "/Work/Promo/Promo.prproj",
    });
  });
  it("sanitizes the name into both folder and file", () => {
    const plan = targetPathFor({
      destination: "/Work",
      name: "A/B Cut",
      ext: "ai",
      wrapInFolder: true,
    });
    expect(plan).toEqual({ dir: "/Work/A-B Cut", file: "/Work/A-B Cut/A-B Cut.ai" });
  });
});
