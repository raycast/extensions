import { describe, expect, it } from "vitest";
import { parseTemplate, placeholdersOf } from "../../src/prompts/template/parser";
import {
  isQuotableSnippetName,
  renameSnippetReferences,
  snippetPlaceholder,
} from "../../src/prompts/template/snippets";

describe("snippetPlaceholder", () => {
  it("quotes with the quote the name does not contain", () => {
    expect(snippetPlaceholder("Sign off")).toBe('{snippet name="Sign off"}');
    expect(snippetPlaceholder('My "Quote"')).toBe(`{snippet name='My "Quote"'}`);
    expect(snippetPlaceholder("Sign", ["trim", "uppercase"])).toBe('{snippet name="Sign" | trim | uppercase}');
  });

  it("writes placeholders the parser reads back", () => {
    for (const name of ["Sign off", 'My "Quote"', "Damian's"]) {
      expect(placeholdersOf(parseTemplate(snippetPlaceholder(name)))[0]).toMatchObject({ kind: "snippet", name });
    }
  });

  it("knows which names no placeholder can quote", () => {
    expect(isQuotableSnippetName(`It's "it"`)).toBe(false);
    expect(isQuotableSnippetName("It's")).toBe(true);
  });
});

describe("renameSnippetReferences", () => {
  it("renames only the given snippets and keeps the rest of the template", () => {
    const template = 'Hi {selection}\n{snippet name="Sign" | trim} {snippet name="Other"} {"json": 1}';
    expect(renameSnippetReferences(template, new Map([["Sign", "Sign Copy"]]))).toBe(
      'Hi {selection}\n{snippet name="Sign Copy" | trim} {snippet name="Other"} {"json": 1}',
    );
    expect(renameSnippetReferences(template, new Map())).toBe(template);
  });
});
