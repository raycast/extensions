import { describe, expect, it } from "vitest";

import { parseTemplate, TemplateParseError } from "./template-parser";

describe("parseTemplate", () => {
  it("splits text and multiple AI fields with stable ordered IDs", () => {
    expect(parseTemplate("Before<ai> first </ai>Middle<ai>second</ai>After")).toEqual([
      { kind: "text", content: "Before" },
      { kind: "ai", id: "ai-field-1", prompt: " first " },
      { kind: "text", content: "Middle" },
      { kind: "ai", id: "ai-field-2", prompt: "second" },
      { kind: "text", content: "After" },
    ]);
  });

  it.each([
    ["before </ai>", "unexpected-ai-close"],
    ["<ai>missing close", "unclosed-ai"],
    ["<ai>outer <ai>inner</ai></ai>", "nested-ai"],
    ["<ai> \n\t </ai>", "empty-ai"],
  ] as const)("rejects malformed AI markup: %s", (content, code) => {
    expect(() => parseTemplate(content)).toThrowError(TemplateParseError);
    try {
      parseTemplate(content);
    } catch (error: unknown) {
      expect(error).toMatchObject({ code });
    }
  });
});
