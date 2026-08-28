import { describe, expect, it } from "vitest";
import { resolveWindowScope } from "./windowScope";

describe("window scope selection", () => {
  it("prefers the current session, launch context, remembered value, then preference", () => {
    expect(resolveWindowScope("all", "visible", "focused", "focused")).toBe("all");
    expect(resolveWindowScope(undefined, "visible", "all", "focused")).toBe("visible");
    expect(resolveWindowScope(undefined, undefined, "all", "focused")).toBe("all");
    expect(resolveWindowScope(undefined, undefined, undefined, "visible")).toBe("visible");
  });

  it("ignores stale or invalid stored values and falls back safely", () => {
    expect(resolveWindowScope(undefined, undefined, "nearby", "focused")).toBe("focused");
    expect(resolveWindowScope()).toBe("focused");
  });
});
