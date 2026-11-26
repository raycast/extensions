import { describe, expect, it } from "vitest";
import {
  cliCommand,
  codeBlock,
  languageFor,
  optionLabel,
  optionsFromForm,
  runUtility,
  SECTIONS,
  usEnglish,
  utility,
  UtilityError,
  UTILITIES,
} from "../src/lib/utilities";
import { TOOLS } from "../src/vendor/cli/src/catalog";
import { BINARY_TOOLS } from "../src/vendor/cli/src/binary";

describe("which utilities are offered", () => {
  it("offers exactly the CLI's offline text tools", () => {
    const expected = TOOLS.filter((t) => t.offline && !BINARY_TOOLS.has(t.id))
      .map((t) => t.id)
      .sort();
    expect(UTILITIES.map((u) => u.id).sort()).toEqual(expected);
    // 109 offline in the CLI, less the 12 that read files rather than text.
    expect(UTILITIES.length).toBe(97);
  });

  it("offers nothing that calls a server", () => {
    for (const u of UTILITIES) expect(u.offline, u.id).toBe(true);
    const remote = TOOLS.filter((t) => !t.offline);
    expect(remote.length).toBeGreaterThan(0);
    for (const t of remote) expect(() => runUtility(t.id, "x")).toThrow(/not an offline RedBison utility/);
  });

  it("refuses an unknown id", () => {
    expect(() => runUtility("no-such-tool", "x")).toThrow(UtilityError);
  });

  it("covers the utilities named in the store listing", () => {
    for (const id of [
      "json-format",
      "json-minify",
      "json-validate",
      "base64-encode",
      "base64-decode",
      "url-encode",
      "url-decode",
      "hash",
      "uuid",
      "jwt-decode",
      "case-convert",
      "sort-lines",
    ]) {
      expect(utility(id), id).toBeDefined();
    }
  });

  it("groups every utility under a US English section", () => {
    expect(SECTIONS).toContain("Color and Design");
    expect(SECTIONS).toContain("Encoding and Hashing");
    for (const u of UTILITIES) {
      expect(SECTIONS).toContain(u.section);
      expect(`${u.title} ${u.summary} ${u.section}`).not.toMatch(/colour/i);
    }
  });
});

describe("running a utility", () => {
  it("formats JSON as the CLI does", () => {
    expect(runUtility("json-format", '{"b":1,"a":[1,2]}')).toBe('{\n  "b": 1,\n  "a": [\n    1,\n    2\n  ]\n}');
  });

  it("passes options through", () => {
    expect(runUtility("json-format", '{"a":1}', { indent: 4 })).toBe('{\n    "a": 1\n}');
    expect(runUtility("hash", "abc", { algorithm: "sha256" })).toContain(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(runUtility("base64-encode", "??>>", { variant: "url" })).toBe("Pz8-Pg");
  });

  it("reports bad input as a UtilityError with the tool's message", () => {
    expect(() => runUtility("json-format", "{nope")).toThrow(UtilityError);
  });

  it("asks for a required option by its label, not its flag", () => {
    expect(() => runUtility("hmac", "message")).toThrow(/HMAC|needs Key/i);
    try {
      runUtility("hmac", "message");
    } catch (e) {
      expect((e as Error).message).toMatch(/needs Key \(/);
      expect((e as Error).message).not.toMatch(/--key/);
    }
  });

  it("generates without input", () => {
    const id = runUtility("uuid", "");
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(runUtility("uuid", "")).not.toBe(id);
  });

  it("flags generators", () => {
    expect(utility("uuid")?.generates).toBe(true);
    expect(utility("password")?.generates).toBe(true);
    expect(utility("json-format")?.generates).toBe(false);
  });
});

describe("form values", () => {
  it("coerces numbers and leaves empty fields to the tool's default", () => {
    expect(optionsFromForm("json-format", { indent: "4" })).toEqual({ indent: 4 });
    expect(optionsFromForm("json-format", { indent: "" })).toEqual({});
    expect(optionsFromForm("json-format", { indent: "  " })).toEqual({});
  });

  it("refuses what the command line refuses, naming the field", () => {
    expect(() => optionsFromForm("json-format", { indent: "abc" })).toThrow(/^Indent: takes a number/);
    expect(() => optionsFromForm("hash", { algorithm: "sha3" })).toThrow(/^Algorithm: takes one of/);
  });

  it("keeps booleans and ignores fields the tool does not take", () => {
    const nato = optionsFromForm("nato", { markCase: true, nonsense: "x" });
    expect(nato).toEqual({ markCase: true });
  });

  it("keeps a second body of text exactly, spaces included", () => {
    expect(optionsFromForm("text-diff", { b: "  a\n b " })).toEqual({ b: "  a\n b " });
  });

  it("labels options readably", () => {
    const label = (id: string, key: string) => optionLabel(utility(id)!.options.find((o) => o.key === key)!);
    expect(label("nato", "markCase")).toBe("Mark case");
    expect(label("redirect-rules", "defaultCode")).toBe("Default code");
    expect(label("hash", "algorithm")).toBe("Algorithm");
  });
});

describe("presentation helpers", () => {
  it("builds a CLI command that a shell reads back unchanged", () => {
    expect(cliCommand("json-format")).toBe("redbison json-format");
    expect(cliCommand("json-format", { indent: 4 })).toBe("redbison json-format --indent 4");
    expect(cliCommand("regex-test", { pattern: "a b's" })).toBe(`redbison regex-test --pattern 'a b'\\''s'`);
  });

  it("fences output so backticks inside it cannot end the block", () => {
    expect(codeBlock("plain")).toBe("```\nplain\n```");
    expect(codeBlock("a ``` b", "json")).toBe("````json\na ``` b\n````");
  });

  it("highlights JSON only when it is JSON", () => {
    expect(languageFor("csv-to-json", '[{"a":1}]')).toBe("json");
    expect(languageFor("word-count", "[not json")).toBe("");
    expect(languageFor("yaml-beautify", "a: 1")).toBe("yaml");
  });

  it("respells British labels for the store", () => {
    expect(usEnglish("Convert a colour")).toBe("Convert a color");
    expect(usEnglish("Colour and design")).toBe("Color and design");
  });
});
