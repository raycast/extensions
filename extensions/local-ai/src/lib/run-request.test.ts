import { describe, expect, it } from "vitest";
import type { AiCommand } from "./commands/types";
import { buildRespondArgs } from "./fm/args";
import { CLIPBOARD_MARKER, SELECTION_MARKER } from "./placeholders";
import { buildRunRequest, REPLACE_OUTPUT_RULE, resolveInput, resolveLaunchTarget } from "./run-request";

const NOW = new Date("2026-01-02T03:04:05Z");

function makeCommand(overrides: Partial<AiCommand> = {}): AiCommand {
  return {
    id: "c1",
    name: "Fix",
    icon: "Stars",
    prompt: "Fix {selection}",
    output: "window",
    model: "system",
    creativity: "normal",
    useCase: "general",
    guardrails: "default",
    pinned: false,
    isStarter: false,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function build(command: AiCommand, text: string, source: "selection" | "clipboard", clipboardText?: string) {
  return buildRunRequest({
    command,
    input: { text, source },
    clipboardText,
    argumentValues: {},
    now: NOW,
    stream: false,
  });
}

describe("buildRunRequest", () => {
  it("sends brace-like selection text on stdin only", () => {
    const text = '{clipboard} {date} {"a":1} SENTINEL-7f3';
    const request = build(makeCommand(), text, "selection");
    expect(request.stdin).toBe(text);
    expect(request.options.instructions).not.toContain("SENTINEL-7f3");
    expect(buildRespondArgs(request.options).join(" ")).not.toContain("SENTINEL-7f3");
  });

  it("sends the input on stdin when the prompt has no selection placeholder", () => {
    expect(build(makeCommand({ prompt: "Translate to French" }), "hello", "selection").stdin).toBe("hello");
  });

  it("appends the replace rule only for replace commands", () => {
    expect(
      build(makeCommand({ output: "replace" }), "x", "selection").options.instructions?.endsWith(REPLACE_OUTPUT_RULE),
    ).toBe(true);
    expect(build(makeCommand({ output: "window" }), "x", "selection").options.instructions).not.toContain(
      REPLACE_OUTPUT_RULE,
    );
  });

  it("adds the clipboard text after the selection when the source is the selection", () => {
    const request = build(makeCommand({ prompt: "Merge {selection} with {clipboard}" }), "abc", "selection", "CLIP");
    expect(request.stdin).toBe("Text:\nabc\n\nClipboard text:\nCLIP");
    expect(request.options.instructions).toContain(CLIPBOARD_MARKER);
    expect(request.options.instructions).not.toContain("CLIP\n");
    expect(request.options.instructions).not.toMatch(/\bCLIP\b/);
  });

  it("blanks the clipboard placeholder when the clipboard is empty", () => {
    const request = build(makeCommand({ prompt: "Use {clipboard}" }), "abc", "selection", "  ");
    expect(request.stdin).toBe("abc");
    expect(request.options.instructions).toBe("Use ");
  });

  it("treats the clipboard as the input when it is the source", () => {
    const request = build(
      makeCommand({ prompt: "Use {selection} and {clipboard}" }),
      "clip text",
      "clipboard",
      "clip text",
    );
    expect(request.stdin).toBe("clip text");
    expect(request.options.instructions).toBe(`Use ${SELECTION_MARKER} and ${SELECTION_MARKER}`);
  });

  it("maps creativity and stream to the respond arguments", () => {
    const request = buildRunRequest({
      command: makeCommand({ creativity: "precise" }),
      input: { text: "x", source: "selection" },
      argumentValues: {},
      now: NOW,
      stream: true,
    });
    const args = buildRespondArgs(request.options);
    expect(args).toContain("--greedy");
    expect(args).toContain("--stream");
  });
});

describe("resolveInput", () => {
  it("returns undefined for a blank selection and empty clipboard", () => {
    expect(resolveInput("  \n", "")).toBeUndefined();
    expect(resolveInput(undefined, undefined)).toBeUndefined();
  });

  it("falls back to the clipboard", () => {
    expect(resolveInput(undefined, "clip")).toEqual({ text: "clip", source: "clipboard" });
  });

  it("keeps the selection untrimmed", () => {
    expect(resolveInput(" hi\n", "clip")).toEqual({ text: " hi\n", source: "selection" });
  });
});

describe("resolveLaunchTarget", () => {
  const commands = [makeCommand()];

  it("resolves none, missing and found", () => {
    expect(resolveLaunchTarget(undefined, commands)).toEqual({ kind: "none" });
    expect(resolveLaunchTarget("nope", commands)).toEqual({ kind: "missing" });
    expect(resolveLaunchTarget("c1", commands)).toEqual({ kind: "found", command: commands[0] });
  });
});
