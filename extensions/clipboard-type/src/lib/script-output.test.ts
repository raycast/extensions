import { describe, expect, it } from "vitest";
import { createLineSplitter, messagePrefix, parseScriptLine } from "./script-output";

describe("parseScriptLine", () => {
  it("parses progress", () => {
    expect(parseScriptLine(`${messagePrefix}progress:42`)).toEqual({ type: "progress", remaining: 42 });
  });

  it("parses stop reasons the script reports", () => {
    expect(parseScriptLine(`${messagePrefix}stopped:escape`)).toEqual({ type: "stopped", reason: "escape" });
    expect(parseScriptLine(`${messagePrefix}stopped:app-switch`)).toEqual({ type: "stopped", reason: "app-switch" });
  });

  it("parses a missing Accessibility permission", () => {
    expect(parseScriptLine(`${messagePrefix}error:accessibility`)).toEqual({
      type: "missing-permission",
      permission: "accessibility",
    });
  });

  it("ignores malformed and unknown messages", () => {
    expect(parseScriptLine(`${messagePrefix}progress:abc`)).toBeNull();
    expect(parseScriptLine(`${messagePrefix}stopped:button`)).toBeNull();
    expect(parseScriptLine(`${messagePrefix}unknown:1`)).toBeNull();
  });

  it("treats other lines as error output", () => {
    const line = "execution error: Something went wrong (-1)";
    expect(parseScriptLine(line)).toEqual({ type: "output", line });
  });
});

describe("createLineSplitter", () => {
  const collect = (chunks: string[], flush = true) => {
    const lines: string[] = [];
    const splitter = createLineSplitter((line) => lines.push(line));
    chunks.forEach((chunk) => splitter.push(chunk));
    if (flush) splitter.flush();
    return lines;
  };

  it("joins lines split across chunks", () => {
    expect(collect(["prog", "ress:1\nprogress", ":0\n"])).toEqual(["progress:1", "progress:0"]);
  });

  it("emits several lines from one chunk", () => {
    expect(collect(["a\nb\nc\n"])).toEqual(["a", "b", "c"]);
  });

  it("holds an unterminated line until flushed", () => {
    expect(collect(["a\npartial"], false)).toEqual(["a"]);
    expect(collect(["a\npartial"])).toEqual(["a", "partial"]);
  });
});
