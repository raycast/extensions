import { describe, expect, it } from "vitest";
import { codeBlock } from "./text";

describe("codeBlock", () => {
  it("tags the fence with its language", () => {
    expect(codeBlock("brew install x", "shell")).toBe("```shell\nbrew install x\n```");
  });

  it("outgrows a fence inside the body, so it can't be closed early", () => {
    expect(codeBlock("a\n```\nb", "text")).toBe("````text\na\n```\nb\n````");
  });
});
