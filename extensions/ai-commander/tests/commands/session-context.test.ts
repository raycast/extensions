import { describe, expect, it } from "vitest";
import { promptDeeplink } from "../../src/commands/quicklink";
import { acceptSessionContext, issueLaunchId, parseSessionContext } from "../../src/commands/session-context";

const input = { clipboard: {}, browserTab: {}, notices: [] };

describe("parseSessionContext", () => {
  it("accepts a complete context", () => {
    const context = { launchId: "l", promptId: "p", input: { ...input, selection: "text" }, args: { tone: "calm" } };
    expect(parseSessionContext(context)).toMatchObject(context);
  });

  it.each([
    ["no object", "text"],
    ["no launch ID", { promptId: "p", input }],
    ["no prompt ID", { launchId: "l", input }],
    ["no input", { launchId: "l", promptId: "p" }],
    ["input without notices", { launchId: "l", promptId: "p", input: { clipboard: {}, browserTab: {} } }],
    ["a wrong selection type", { launchId: "l", promptId: "p", input: { ...input, selection: 1 } }],
    ["wrong clipboard values", { launchId: "l", promptId: "p", input: { ...input, clipboard: { 0: 1 } } }],
    ["wrong notices", { launchId: "l", promptId: "p", input: { ...input, notices: [1] } }],
    ["wrong arguments", { launchId: "l", promptId: "p", input, args: { tone: 1 } }],
    ["a wrong flag type", { launchId: "l", promptId: "p", input, forcePreview: "yes" }],
  ])("rejects %s", (_name, raw) => {
    expect(parseSessionContext(raw)).toBeUndefined();
  });

  it("drops fields it does not know", () => {
    const parsed = parseSessionContext({ launchId: "l", promptId: "p", input: { ...input, extra: "x" }, extra: "y" });
    expect(parsed).toEqual({ launchId: "l", promptId: "p", input });
  });
});

describe("acceptSessionContext", () => {
  it("accepts a launch this extension issued", () => {
    const launchId = issueLaunchId();
    expect(acceptSessionContext({ launchId, promptId: "p", input })?.launchId).toBe(launchId);
  });

  it("rejects a well-formed context from a foreign deeplink", () => {
    expect(acceptSessionContext({ launchId: "made-up", promptId: "p", input })).toBeUndefined();
  });

  it("gives every launch its own ID", () => {
    expect(issueLaunchId()).not.toBe(issueLaunchId());
  });
});

describe("promptDeeplink", () => {
  it("adds the prompt as URL-encoded JSON context", () => {
    const link = promptDeeplink("raycast://extensions/dhimmel/ai-commander/run-prompt", "example-simplify");
    const url = new URL(link);
    expect(link.startsWith("raycast://extensions/dhimmel/ai-commander/run-prompt?context=")).toBe(true);
    expect(JSON.parse(url.searchParams.get("context") ?? "")).toEqual({ promptId: "example-simplify" });
  });
});
