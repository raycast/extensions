import { describe, expect, it } from "vitest";
import { getAttribute, parseTemplate, placeholdersOf, type PlaceholderNode } from "../../src/prompts/template/parser";

function single(template: string): PlaceholderNode {
  const nodes = placeholdersOf(parseTemplate(template));
  expect(nodes).toHaveLength(1);
  return nodes[0] as PlaceholderNode;
}

function rebuild(template: string): string {
  return parseTemplate(template)
    .map((node) => node.raw)
    .join("");
}

describe("parseTemplate", () => {
  it("splits text and placeholders with exact positions", () => {
    const nodes = parseTemplate("Fix: {selection} now");
    expect(nodes.map((node) => node.type)).toEqual(["text", "placeholder", "text"]);
    expect(nodes[1]).toMatchObject({ kind: "selection", raw: "{selection}", start: 5, end: 16 });
  });

  it("parses clipboard offsets with and without quotes", () => {
    expect(single("{clipboard}")).toMatchObject({ kind: "clipboard", offset: 0 });
    expect(single("{clipboard offset=2}")).toMatchObject({ offset: 2 });
    expect(single('{clipboard offset="3"}')).toMatchObject({ offset: 3 });
    expect(single("{clipboard offset='4'}")).toMatchObject({ offset: 4 });
  });

  it("parses argument attributes in the forms ray.so uses", () => {
    expect(single('{argument name="sport" default="skiing"}')).toMatchObject({ name: "sport", default: "skiing" });
    expect(single("{argument name=number default=500}")).toMatchObject({ name: "number", default: "500" });
    expect(single("{argument name='Additional context' default=''}")).toMatchObject({
      name: "Additional context",
      default: "",
    });
    expect(single("{argument default=for}")).toMatchObject({ default: "for" });
    expect(single('{argument name="tone" options="happy, sad ,, professional"}')).toMatchObject({
      options: ["happy", "sad", "professional"],
    });
  });

  it("parses snippets, browser tabs and date placeholders", () => {
    expect(single('{snippet name="Sign off"}')).toMatchObject({ kind: "snippet", name: "Sign off" });
    expect(single("{browser-tab}")).toMatchObject({ kind: "browser-tab" });
    expect(single('{browser-tab format="html" selector="a[href=\'x\'] > b"}')).toMatchObject({
      format: "html",
      selector: "a[href='x'] > b",
    });
    expect(single('{date offset="+2y +5M" format="yyyy-MM-dd" locale="de-DE"}')).toMatchObject({
      kind: "date",
      offset: "+2y +5M",
      format: "yyyy-MM-dd",
      locale: "de-DE",
    });
    for (const kind of ["time", "datetime", "day"]) expect(single(`{${kind}}`)).toMatchObject({ kind });
  });

  it("keeps modifier chains in order, unknown names included", () => {
    expect(single("{clipboard | trim | uppercase}").modifiers).toEqual(["trim", "uppercase"]);
    expect(single("{clipboard|trim|raw}").modifiers).toEqual(["trim", "raw"]);
    expect(single("{clipboard offset=1 | percent-encode | json-stringify}")).toMatchObject({
      offset: 1,
      modifiers: ["percent-encode", "json-stringify"],
    });
    expect(single("{selection | shout}").modifiers).toEqual(["shout"]);
  });

  it("allows blanks inside the braces", () => {
    expect(single("{  selection  }")).toMatchObject({ kind: "selection" });
    expect(single("{\tclipboard\toffset=1\t}")).toMatchObject({ offset: 1 });
  });

  it("keeps a quoted value verbatim, including braces and pipes", () => {
    const node = single('{argument name="a|b}c" default="line\nbreak"}');
    expect(getAttribute(node, "name")).toBe("a|b}c");
    expect(getAttribute(node, "default")).toBe("line\nbreak");
  });

  it("marks unknown words and leaves them unchanged", () => {
    expect(parseTemplate("{number}")[0]).toMatchObject({ type: "unknown", name: "number", raw: "{number}" });
    expect(parseTemplate('{foo bar="1"}')[0]).toMatchObject({ type: "unknown", name: "foo" });
    expect(parseTemplate("{Selection}")[0]).toMatchObject({ type: "unknown" });
    expect(parseTemplate("{calculator}")[0]).toMatchObject({ type: "unknown" });
  });

  it("treats JSON and prose in braces as text", () => {
    for (const text of [
      '{"a": 1}',
      '{ "tone": "calm", "list": [1, 2] }',
      "{Multiple sentences summarising the video}",
      "{}",
      "{ }",
      "{x: 1}",
      "{a=1}",
      "{selection is here}",
      "{argument name=}",
      '{argument name="open}',
      "{clipboard | }",
      "{clipboard | trim offset=1}",
      "{selection\n}",
      "}{",
      "{",
    ]) {
      expect(parseTemplate(text), text).toEqual([expect.objectContaining({ type: "text", raw: text })]);
    }
  });

  it("finds placeholders nested in JSON", () => {
    const template = '{"text": "{selection}", "n": {clipboard}}';
    expect(placeholdersOf(parseTemplate(template)).map((node) => node.kind)).toEqual(["selection", "clipboard"]);
    expect(rebuild(template)).toBe(template);
  });

  it("returns nothing for an empty template", () => {
    expect(parseTemplate("")).toEqual([]);
  });

  it("stays linear on hostile input", () => {
    const size = 400_000;
    const inputs = [
      "{".repeat(size),
      '{a="'.repeat(size / 4),
      `{selection ${"a=1 ".repeat(size / 4)}`,
      "{x a=\"{x a=1 b='".repeat(size / 16),
      `{${"a".repeat(size)}`,
      "{ ".repeat(size / 2),
      "{a | ".repeat(size / 5),
    ];
    for (const input of inputs) {
      const started = performance.now();
      expect(rebuild(input)).toBe(input);
      expect(performance.now() - started).toBeLessThan(1500);
    }
  });

  it("gives up on placeholders longer than any real one", () => {
    expect(placeholdersOf(parseTemplate(`{argument default="${"x".repeat(5000)}"}`))).toEqual([]);
  });
});
