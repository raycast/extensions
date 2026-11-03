import { describe, expect, it } from "vitest";
import {
  allowedOutputModes,
  canHighlightChanges,
  validatePromptDraft,
  validateSnippetText,
  validateTemplate,
  inspectTemplate,
} from "../../src/prompts/template/validate";

function errorCodes(template: string, snippetNames?: string[]) {
  return validateTemplate(template, { snippetNames }).errors.map((issue) => issue.code);
}

function hintCodes(template: string) {
  return validateTemplate(template).hints.map((issue) => issue.code);
}

describe("validateTemplate tiers", () => {
  it("accepts valid templates silently", () => {
    const result = validateTemplate('{selection | trim} {clipboard offset=5} {browser-tab format="text"}');
    expect(result).toEqual({ ok: true, errors: [], hints: [] });
  });

  it("blocks unknown attributes and modifiers of known placeholders", () => {
    expect(errorCodes("{selection offset=1}")).toEqual(["unknown-attribute"]);
    expect(errorCodes("{selection | shout}")).toEqual(["unknown-modifier"]);
    expect(errorCodes('{selection} {date foo="1"}')).toEqual(["unknown-attribute"]);
    expect(errorCodes("{clipboard offset=1 offset=2}")).toEqual(["duplicate-attribute"]);
  });

  it("gives a non-blocking hint for unknown words", () => {
    const result = validateTemplate("{selection} {tone} {foo bar=1} {foo | trim}");
    expect(result.ok).toBe(true);
    expect(result.hints.map((issue) => issue.code)).toEqual([
      "unknown-placeholder",
      "unknown-placeholder",
      "unknown-placeholder",
    ]);
  });

  it("says when a Raycast placeholder is left out on purpose", () => {
    expect(hintCodes("{selection} {calculator} {cursor} {uuid}")).toEqual(Array(3).fill("unsupported-placeholder"));
  });

  it("stays silent on everything else in braces", () => {
    expect(validateTemplate('{selection} {"json": true} {not a placeholder} {}')).toEqual({
      ok: true,
      errors: [],
      hints: [],
    });
  });
});

describe("validateTemplate rules", () => {
  it("requires an input placeholder", () => {
    expect(errorCodes("Just text")).toEqual(["missing-input"]);
    expect(errorCodes("")).toEqual(["missing-input"]);
    expect(errorCodes('{argument name="a"} {date}')).toEqual(["missing-input"]);
    expect(errorCodes("{clipboard}")).toEqual([]);
    expect(errorCodes("{browser-tab}")).toEqual([]);
  });

  it("limits clipboard offsets to 0 through 5", () => {
    expect(errorCodes("{clipboard offset=0}")).toEqual([]);
    expect(errorCodes("{clipboard offset=5}")).toEqual([]);
    for (const offset of ["6", "-1", "1.5", "abc", '""']) {
      expect(errorCodes(`{clipboard offset=${offset}}`), offset).toEqual(["invalid-clipboard-offset"]);
    }
  });

  it("rejects a selector with markdown", () => {
    expect(errorCodes('{browser-tab selector="h1" format="markdown"}')).toEqual(["selector-markdown"]);
    expect(errorCodes('{browser-tab selector="h1"}')).toEqual([]);
    expect(errorCodes('{browser-tab selector="h1" format="html"}')).toEqual([]);
    expect(errorCodes('{browser-tab format="pdf"}')).toEqual(["invalid-browser-format"]);
  });

  it("checks snippets when the names are known", () => {
    expect(errorCodes('{selection} {snippet name="a"}', ["a"])).toEqual([]);
    expect(errorCodes('{selection} {snippet name="b"}', ["a"])).toEqual(["unknown-snippet"]);
    expect(errorCodes('{selection} {snippet name="b"}')).toEqual([]);
    expect(errorCodes("{selection} {snippet}")).toEqual(["missing-snippet-name"]);
  });

  it("checks date attributes", () => {
    expect(errorCodes('{selection} {date offset="3 days"}')).toEqual(["invalid-date-offset"]);
    expect(errorCodes('{selection} {date offset="+999999y"}')).toEqual(["invalid-date-offset"]);
    expect(errorCodes('{selection} {date format="YYYY"}')).toEqual(["invalid-date-format"]);
    expect(errorCodes('{selection} {date locale="de_DE"}')).toEqual(["invalid-locale"]);
    expect(errorCodes('{selection} {date format="yyyy" locale="de-DE"}')).toEqual([]);
  });

  it("warns from the fourth distinct argument", () => {
    const three = '{selection} {argument name="a"} {argument name="b"} {argument name="c"} {argument name="a"}';
    expect(hintCodes(three)).toEqual([]);
    expect(hintCodes(`${three} {argument name="d"}`)).toEqual(["too-many-arguments"]);
    expect(hintCodes("{selection} {argument} {argument} {argument} {argument}")).toEqual(["too-many-arguments"]);
    expect(validateTemplate(`${three} {argument name="d"}`).ok).toBe(true);
  });
});

describe("output rules", () => {
  it("offers every mode with a selection", () => {
    expect(allowedOutputModes("{selection}")).toEqual(["preview", "replace", "copy", "insertAfter"]);
    expect(canHighlightChanges("{selection | raw}")).toBe(true);
  });

  it("limits modes without a selection", () => {
    expect(allowedOutputModes("{clipboard}")).toEqual(["preview", "copy"]);
    expect(canHighlightChanges("{clipboard}")).toBe(false);
    expect(allowedOutputModes('{"selection": 1}')).toEqual(["preview", "copy"]);
  });

  it("blocks drafts that break those rules", () => {
    const draft = { template: "{clipboard}", output: "replace", highlightChanges: true } as const;
    expect(validatePromptDraft(draft).errors.map((issue) => issue.code)).toEqual([
      "output-requires-selection",
      "highlight-requires-selection",
    ]);
    expect(validatePromptDraft({ template: "{clipboard}", output: "copy", highlightChanges: false }).ok).toBe(true);
    expect(validatePromptDraft({ template: "{selection}", output: "insertAfter", highlightChanges: true }).ok).toBe(
      true,
    );
  });
});

describe("validateSnippetText", () => {
  it("rejects nested snippets", () => {
    expect(validateSnippetText('Hello {snippet name="x"}').errors[0]?.code).toBe("nested-snippet");
  });

  it("hints that other placeholders stay literal", () => {
    const result = validateSnippetText("Hello {clipboard}");
    expect(result.ok).toBe(true);
    expect(result.hints[0]?.code).toBe("snippet-placeholder-literal");
  });

  it("accepts plain text", () => {
    expect(validateSnippetText("Best regards")).toEqual({ ok: true, errors: [], hints: [] });
  });
});

describe("inspectTemplate", () => {
  it("gives a form everything from one parse", () => {
    const withSelection = inspectTemplate("Fix {selection} {typo}");
    expect(withSelection.outputModes).toContain("replace");
    expect(withSelection.canHighlight).toBe(true);
    expect(withSelection.hints[0]?.code).toBe("unknown-placeholder");

    const withClipboard = inspectTemplate("Fix {clipboard}");
    expect(withClipboard.outputModes).not.toContain("replace");
    expect(withClipboard.canHighlight).toBe(false);
    expect(withClipboard.hints).toEqual([]);
  });
});
