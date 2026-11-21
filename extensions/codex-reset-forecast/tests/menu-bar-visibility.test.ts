import { describe, expect, it } from "vitest";
import { shouldShowMenuBar, visibilityForLaunch } from "../src/domain/menu-bar-visibility";

describe("menu-bar visibility", () => {
  it("shows the menu bar by default when the renderer launches directly", () => {
    expect(shouldShowMenuBar(undefined)).toBe(true);
  });

  it("shows the menu bar when launched from search, including after hiding it", () => {
    expect(visibilityForLaunch(undefined, "userInitiated")).toBe(true);
    expect(visibilityForLaunch("false", "userInitiated")).toBe(true);
  });

  it("keeps the menu visible when clicking its icon or refreshing in the background", () => {
    expect(visibilityForLaunch("true", "userInitiated")).toBe(true);
    expect(visibilityForLaunch("true", "background")).toBe(true);
  });

  it("does not restore a hidden menu bar during background refresh", () => {
    expect(visibilityForLaunch("false", "background")).toBe(false);
  });
});
