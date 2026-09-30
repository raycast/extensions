import { describe, expect, it } from "vitest";
import { parseFields, parseToken } from "../src/parse";

const keys = (texts: string[]) => parseFields(texts).fields.map((f) => f.key);

describe("parseToken", () => {
  it("treats a missing or empty spec as the plain value", () => {
    expect(parseToken(undefined)).toEqual({ key: "value", rawKey: "value", label: "Value", optional: false });
    expect(parseToken("")).toEqual({ key: "value", rawKey: "value", label: "Value", optional: false });
  });

  it("trims the key but keeps the raw segment", () => {
    expect(parseToken(" Source?")).toEqual({ key: "Source?", rawKey: " Source?", label: "Source?", optional: false });
  });

  it("reads label, default and optional modifiers", () => {
    expect(parseToken("note name|label:start with a space")).toMatchObject({
      key: "note name",
      label: "start with a space",
    });
    expect(parseToken("Where?|default:ETH|optional")).toMatchObject({
      key: "Where?",
      defaultValue: "ETH",
      optional: true,
    });
  });

  it("turns comma lists into options", () => {
    expect(parseToken("red, green ,blue")).toMatchObject({
      key: "red, green ,blue",
      options: ["red", "green", "blue"],
    });
  });
});

describe("parseFields", () => {
  it("finds the plain value in a capture format (Thought)", () => {
    expect(keys(["- {{DATE}}, {{time}}: {{value}}"])).toEqual(["value"]);
  });

  it("is case-insensitive on VALUE and treats NAME as value", () => {
    expect(keys(["{{VALUE:Email address}} {{NAME}} {{name}} {{value}}"])).toEqual(["Email address", "value"]);
  });

  it("dedupes by key across texts, in first-appearance order (Letter)", () => {
    const filename = "{{DATE:YYYY.MM.DD.mm.ss}} letter to {{VALUE:Dear (name)}}";
    const body = "Dear {{VALUE:Dear (name)}},\n{{VALUE:Subject}}\n{{VALUE:Email address}}";
    expect(keys([filename, body])).toEqual(["Dear (name)", "Subject", "Email address"]);
  });

  it("ignores non-value tokens", () => {
    const t = "{{date:YYYY}} {{DATE}} {{time}} {{selected}} {{LINKCURRENT}} {{valuex}} {{VDATE:due,YYYY}}";
    expect(keys([t])).toEqual([]);
  });

  it("flags inputs that QuickAdd or Templater will still ask for in Obsidian", () => {
    expect(parseFields(["<% tp.system.prompt('Who?') %>"]).hasObsidianPrompts).toBe(true);
    expect(parseFields(["<% tp.system.suggester(['a'], ['a']) %>"]).hasObsidianPrompts).toBe(true);
    expect(parseFields(["{{VDATE:due,YYYY-MM-DD}}"]).hasObsidianPrompts).toBe(true);
    expect(parseFields(["{{FIELD:status}}"]).hasObsidianPrompts).toBe(true);
    expect(parseFields(["{{MACRO:doThing}}"]).hasObsidianPrompts).toBe(true);
    expect(parseFields(["<% tp.date.now() %> {{value}} {{DATE}}"]).hasObsidianPrompts).toBe(false);
  });
});

import { isLoneValue } from "../src/parse";

describe("QuickAdd token grammar", () => {
  it("reads modifiers on plain value tokens", () => {
    const [f] = parseFields(["{{VALUE|label:Note|default:hi}}"]).fields;
    expect(f).toMatchObject({ key: "value", label: "Note", defaultValue: "hi" });
    expect(parseFields(["{{NAME|optional}}"]).fields[0]).toMatchObject({ key: "value", optional: true });
  });

  it("does not treat {{NAME:…}} as a value token", () => {
    expect(keys(["{{NAME:foo}}"])).toEqual([]);
  });

  it("uses |name: as the variable key", () => {
    expect(parseFields(["{{VALUE:red,green|name:colour}}"]).fields[0]).toMatchObject({
      key: "colour",
      rawKey: "colour",
      label: "colour",
      options: ["red", "green"],
    });
  });

  it("leaves |custom and |multi option lists to Obsidian", () => {
    for (const token of ["{{VALUE:a,b|custom}}", "{{VALUE:a,b|multi}}"]) {
      const parsed = parseFields([token]);
      expect(parsed.fields).toEqual([]);
      expect(parsed.hasObsidianPrompts).toBe(true);
    }
  });

  it("dedupes keys case-insensitively and ignores tokens spanning lines", () => {
    expect(keys(["{{VALUE:Title}} {{value:title}}"])).toEqual(["Title"]);
    expect(keys(["{{VALUE:line\nbreak}}"])).toEqual([]);
  });

  it("flags more tokens that prompt in Obsidian", () => {
    for (const text of ["{{FILE:notes}}", "{{MVALUE}}", "{{TEMPLATE:t.md}}", "<% tp.system.multi_suggester(a, b) %>"]) {
      expect(parseFields([text]).hasObsidianPrompts).toBe(true);
    }
  });
});

describe("isLoneValue", () => {
  it("is true only for a single plain value field with the default label", () => {
    expect(isLoneValue(parseFields(["{{VALUE}}"]).fields)).toBe(true);
    expect(isLoneValue([{ key: "value", rawKey: "value", label: "File name", optional: false }])).toBe(false);
    expect(isLoneValue(parseFields(["{{VALUE}} {{VALUE:x}}"]).fields)).toBe(false);
  });
});
