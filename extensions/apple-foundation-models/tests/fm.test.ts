import { describe, expect, it } from "vitest";
import { buildRespondArgs, cleanText, parseTokenCount } from "../src/lib/fm";

describe("buildRespondArgs", () => {
  it("streams and sends the prompt on stdin", () => {
    expect(buildRespondArgs({ prompt: "Hi" })).toEqual({ args: ["respond", "--stream"], input: "Hi" });
  });

  it("keeps a prompt that starts with a dash out of the arguments", () => {
    const { args, input } = buildRespondArgs({ prompt: "-5 plus 3?" });
    expect(args).not.toContain("-5 plus 3?");
    expect(input).toBe("-5 plus 3?");
  });

  it("uses --resume instead of --instructions when a transcript is given", () => {
    const { args } = buildRespondArgs({ prompt: "Hi", instructions: "Be brief.", transcriptPath: "/tmp/t.json" });
    expect(args).toContain("--resume=/tmp/t.json");
    expect(args.some((arg) => arg.startsWith("--instructions"))).toBe(false);
  });

  it("joins option values with = so values that start with a dash stay values", () => {
    const { args } = buildRespondArgs({ prompt: "Hi", instructions: "- Be brief.\n- Use lists." });
    expect(args).toContain("--instructions=- Be brief.\n- Use lists.");
  });

  it("puts the prompt after -- when an image is attached, because fm ignores stdin then", () => {
    expect(
      buildRespondArgs({
        prompt: "What is this?",
        instructions: "  Be brief.  ",
        images: ["/tmp/a.png"],
        tools: ["ocr", "barcode"],
        guardrails: "permissive-content-transformations",
      }),
    ).toEqual({
      args: [
        "respond",
        "--stream",
        "--instructions=Be brief.",
        "--image=/tmp/a.png",
        "--tool=ocr",
        "--tool=barcode",
        "--guardrails=permissive-content-transformations",
        "--",
        "What is this?",
      ],
    });
  });

  it("leaves out the default guardrails and empty instructions", () => {
    expect(buildRespondArgs({ prompt: "Hi", instructions: "  ", guardrails: "default" }).args).toEqual([
      "respond",
      "--stream",
    ]);
  });

  it("removes NUL bytes", () => {
    expect(cleanText("a\0b")).toBe("ab");
    expect(buildRespondArgs({ prompt: "a\0b", images: ["/tmp/a.png"] }).args.at(-1)).toBe("ab");
  });
});

describe("parseTokenCount", () => {
  it("reads the number that count-tokens --quiet prints", () => {
    expect(parseTokenCount("108\n")).toBe(108);
  });

  it("fails on other output", () => {
    expect(() => parseTokenCount("oops")).toThrow(/token count/);
  });
});
