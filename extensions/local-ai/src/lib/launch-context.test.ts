import { describe, expect, it } from "vitest";
import { isChatLaunchContext, isRunCommandLaunchContext, isRunViewLaunchContext } from "./launch-context";

describe("launch context guards", () => {
  it("accepts a run-command context only with a non-empty commandId", () => {
    expect(isRunCommandLaunchContext({ commandId: "abc" })).toBe(true);
    expect(isRunCommandLaunchContext({ commandId: "" })).toBe(false);
    expect(isRunCommandLaunchContext(undefined)).toBe(false);
    expect(isRunCommandLaunchContext([])).toBe(false);
  });

  it("validates the optional input of a run-view context", () => {
    expect(isRunViewLaunchContext({ commandId: "a", input: { text: "x", source: "selection" } })).toBe(true);
    expect(isRunViewLaunchContext({ commandId: "a", input: { text: "x", source: "paste" } })).toBe(false);
  });

  it("validates the optional seed of a chat context", () => {
    expect(isChatLaunchContext({ seed: { userMessage: "q", assistantMessage: "a" } })).toBe(true);
    expect(isChatLaunchContext({ seed: { userMessage: 1 } })).toBe(false);
  });
});
