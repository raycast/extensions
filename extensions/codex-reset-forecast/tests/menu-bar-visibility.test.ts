import { describe, expect, it } from "vitest";
import { shouldShowMenuBar, visibilityAfterToggle } from "../src/domain/menu-bar-visibility";

describe("menu-bar visibility", () => {
  it("shows the menu bar by default when the renderer launches directly", () => {
    expect(shouldShowMenuBar(undefined)).toBe(true);
  });

  it("makes the first explicit toggle show the menu bar", () => {
    expect(visibilityAfterToggle(undefined)).toBe(true);
  });

  it("toggles persisted visibility", () => {
    expect(visibilityAfterToggle("true")).toBe(false);
    expect(visibilityAfterToggle("false")).toBe(true);
  });
});
