import { describe, expect, it } from "vitest";
import { stripAnsi } from "./ansi";

describe("stripAnsi", () => {
  it("removes CSI sequences", () => {
    expect(stripAnsi("\x1b[38;2;55;195;160m\x1b[1mMODELS\x1b[0m")).toBe("MODELS");
  });

  it("leaves plain text unchanged", () => {
    expect(stripAnsi("plain {text}")).toBe("plain {text}");
  });

  it("removes OSC sequences", () => {
    expect(stripAnsi("a\x1b]8;;http://x\x07b")).toBe("ab");
  });
});
