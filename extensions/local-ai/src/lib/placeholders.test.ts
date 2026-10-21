import { describe, expect, it } from "vitest";
import { CLIPBOARD_MARKER, parsePrompt, renderInstructions, SELECTION_MARKER } from "./placeholders";

describe("parsePrompt", () => {
  it("collects arguments and selection use", () => {
    const p = parsePrompt('Translate {selection} into {argument name="language" default="English"}.');
    expect(p.arguments).toEqual([{ name: "language", defaultValue: "English" }]);
    expect(p.usesSelection).toBe(true);
  });

  it("parses options, dropping empty entries", () => {
    expect(parsePrompt('{argument name="tone" options="formal, casual, "}').arguments[0].options).toEqual([
      "formal",
      "casual",
    ]);
  });

  it("names a bare argument 'argument'", () => {
    expect(parsePrompt("{argument}").arguments).toEqual([{ name: "argument" }]);
  });

  it("dedupes arguments by name", () => {
    expect(parsePrompt('{argument name="a"} {argument name="a"}').arguments).toHaveLength(1);
  });

  it("errors above the argument limit", () => {
    expect(parsePrompt('{argument name="a"}{argument name="b"}{argument name="c"}{argument name="d"}').errors).toEqual([
      "Use at most 3 arguments",
    ]);
  });

  it("reports unsupported identifiers only", () => {
    expect(parsePrompt("{browser-tab} and {name}").unsupported).toEqual(["browser-tab", "name"]);
    expect(parsePrompt('Return JSON like {"a": 1} or { x }').unsupported).toEqual([]);
  });

  it("ignores modifiers", () => {
    expect(parsePrompt("{selection | uppercase}").usesSelection).toBe(true);
  });

  it("detects clipboard use", () => {
    expect(parsePrompt("{clipboard}").usesClipboard).toBe(true);
  });
});

describe("renderInstructions", () => {
  const now = new Date(2026, 9, 21, 19, 30);
  const ctx = {
    argumentValues: { language: "French" },
    now,
    locale: "en-US",
    selectionReplacement: SELECTION_MARKER,
    clipboardReplacement: "",
  };

  it("substitutes selection and argument values", () => {
    expect(renderInstructions('Translate {selection} into {argument name="language" default="English"}.', ctx)).toBe(
      "Translate the provided text into French.",
    );
  });

  it("does not resolve argument names from the object prototype", () => {
    expect(renderInstructions('{argument name="constructor"}', { ...ctx, argumentValues: {} })).toBe("");
  });

  it("falls back to the default when the value is blank", () => {
    expect(
      renderInstructions('Into {argument name="language" default="English"}', {
        ...ctx,
        argumentValues: { language: "" },
      }),
    ).toBe("Into English");
  });

  it("falls back to the default value", () => {
    expect(
      renderInstructions('Into {argument name="language" default="English"}', { ...ctx, argumentValues: {} }),
    ).toBe("Into English");
  });

  it("formats date and time with the locale", () => {
    expect(renderInstructions("{date} {time}", ctx)).toBe(
      `${new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(now)} ${new Intl.DateTimeFormat("en-US", { timeStyle: "short" }).format(now)}`,
    );
  });

  it("leaves unsupported and non-placeholder braces verbatim", () => {
    expect(renderInstructions('Keep {browser-tab} and {"a": 1}', ctx)).toBe('Keep {browser-tab} and {"a": 1}');
  });

  it("substitutes the clipboard replacement", () => {
    expect(renderInstructions("Use {clipboard}", { ...ctx, clipboardReplacement: CLIPBOARD_MARKER })).toBe(
      `Use ${CLIPBOARD_MARKER}`,
    );
  });

  it("inserts replacements literally", () => {
    expect(renderInstructions("{selection}", { ...ctx, selectionReplacement: "$& $1" })).toBe("$& $1");
  });
});
