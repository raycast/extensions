import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  choicesFor,
  diffDocs,
  groupByDocs,
  parseConfigReference,
  validateEdit,
  validateSettingValue,
} from "./settings";
import type { Setting, SettingDoc } from "./settings";
import snapshot from "./config-docs.json";

// Rows copied verbatim from https://docs.otty.sh/reference/configuration.
const html = readFileSync(join(__dirname, "fixtures/config-reference.html"), "utf8");
const docs = parseConfigReference(html);

describe("parseConfigReference", () => {
  it("reads section, type, default, and plain-text description", () => {
    expect(docs.get("copy-on-select")).toEqual({
      section: "Clipboard & Selection",
      type: "bool",
      default: "false",
      description: "Automatically copy on selection.",
    });
  });

  it("lists allowed values, leaving out a parenthesized alias", () => {
    expect(docs.get("cursor-style")?.values).toEqual(["block", "bar", "underline", "block_hollow"]);
    expect(docs.get("clipboard-read")?.values).toEqual(["ask", "allow", "deny"]);
  });

  it("stops at the end of the Values sentence", () => {
    expect(docs.get("auto-hide-tab-bar")?.values).toEqual(["always", "default", "auto"]);
  });

  it("keeps the section for every row under its heading", () => {
    expect(docs.get("sidebar-width")?.section).toBe("Sidebar & Layout");
    expect(docs.get("sidebar-width")?.type).toBe("integer");
  });
});

const setting = (key: string, value: unknown = true): Setting => ({
  key,
  value,
  type: typeof value === "boolean" ? "boolean" : "string",
  text: String(value),
  customized: false,
});

describe("groupByDocs", () => {
  it("groups by documented section alphabetically, undocumented last", () => {
    const groups = groupByDocs(
      [
        setting("sidebar-width", 266),
        setting("auto-update"),
        setting("copy-on-select"),
        setting("cursor-style", "block"),
        setting("clipboard-read", "ask"),
      ],
      docs,
    );
    expect(groups.map((g) => [g.title, g.settings.map((s) => s.key)])).toEqual([
      ["Clipboard & Selection", ["clipboard-read", "copy-on-select"]],
      ["Cursor", ["cursor-style"]],
      ["Sidebar & Layout", ["sidebar-width"]],
      ["Other", ["auto-update"]],
    ]);
  });
});

describe("validateSettingValue", () => {
  it("accepts only listed values for an enum", () => {
    expect(validateSettingValue("bar", docs.get("cursor-style"))).toBeUndefined();
    expect(validateSettingValue("beam", docs.get("cursor-style"))).toBe(
      "Use one of: block, bar, underline, block_hollow",
    );
  });

  it("checks integers and floats", () => {
    expect(validateSettingValue("266", docs.get("sidebar-width"))).toBeUndefined();
    expect(validateSettingValue("26.5", docs.get("sidebar-width"))).toBe("Enter a whole number");
    expect(
      validateSettingValue("13.5", {
        section: "",
        type: "float",
        default: "",
        description: "",
      }),
    ).toBeUndefined();
    expect(
      validateSettingValue("big", {
        section: "",
        type: "float",
        default: "",
        description: "",
      }),
    ).toBe("Enter a number");
  });

  it("lets anything through when nothing is documented", () => {
    expect(validateSettingValue("whatever", undefined)).toBeUndefined();
  });
});

describe("diffDocs", () => {
  const doc = (description: string) => ({
    section: "Font",
    type: "bool",
    default: "false",
    description,
  });

  it("names keys added, removed, and changed between snapshots", () => {
    expect(
      diffDocs({ a: doc("x"), b: doc("y"), c: doc("z") }, { a: doc("x"), b: doc("y, now different"), d: doc("new") }),
    ).toEqual({ added: ["d"], removed: ["c"], changed: ["b"] });
  });

  it("reports nothing for identical snapshots", () => {
    expect(diffDocs({ a: doc("x") }, { a: doc("x") })).toEqual({
      added: [],
      removed: [],
      changed: [],
    });
  });
});

describe("bundled config-docs.json snapshot", () => {
  const settings = snapshot.settings as Record<string, SettingDoc>;

  it("holds a full reference, stamped with the Otty version it describes", () => {
    expect(Object.keys(settings).length).toBeGreaterThanOrEqual(150);
    expect(snapshot.docsVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("gives every key a section, type, and description", () => {
    for (const [key, doc] of Object.entries(settings)) {
      expect(doc.section, key).toBeTruthy();
      expect(doc.type, key).toBeTruthy();
      expect(doc.description, key).toBeTruthy();
    }
  });

  it("offers every listed enum value in the picker, and accepts each one", () => {
    const enums = Object.entries(settings).filter(([, doc]) => doc.type === "enum" && doc.values);
    expect(enums.length).toBeGreaterThan(0);
    for (const [key, doc] of enums) {
      const setting: Setting = { key, value: "", type: "string", text: "", customized: false };
      expect(choicesFor(setting, doc), key).toEqual(doc.values);
      for (const value of doc.values!) expect(validateSettingValue(value, doc), `${key}=${value}`).toBeUndefined();
    }
  });
});

describe("editing a setting", () => {
  const enumDoc: SettingDoc = { section: "S", type: "enum", default: "a", description: "", values: ["a", "b"] };
  const setting = (overrides: Partial<Setting> = {}): Setting => ({
    key: "k",
    value: "",
    type: "string",
    text: "a",
    customized: false,
    ...overrides,
  });

  it("keeps a customized value the reference doesn't list, first in the picker", () => {
    expect(choicesFor(setting({ text: "alias", customized: true }), enumDoc)).toEqual(["alias", "a", "b"]);
    expect(choicesFor(setting({ text: "alias" }), enumDoc)).toEqual(["a", "b"]);
    expect(choicesFor(setting(), { ...enumDoc, type: "string" })).toBeUndefined();
  });

  it("always saves the current value unchanged, even one the reference rejects", () => {
    expect(validateEdit("alias", setting({ text: "alias", customized: true }), enumDoc)).toBeUndefined();
    expect(validateEdit("alias", setting(), enumDoc)).toBe("Use one of: a, b");
  });

  it("treats an empty value as a reset, never an error", () => {
    expect(validateEdit("", setting(), enumDoc)).toBeUndefined();
  });

  it("checks numbers the reference doesn't document", () => {
    expect(validateEdit("x", setting({ type: "number", text: "1" }), undefined)).toBe("Enter a number");
    expect(validateEdit("2.5", setting({ type: "number", text: "1" }), undefined)).toBeUndefined();
  });

  it("accepts only themes Otty has, and none while the list is loading", () => {
    expect(validateEdit("Nord", setting({ text: "Paper" }), undefined, { names: ["Paper", "Nord"] })).toBeUndefined();
    expect(validateEdit("Nope", setting({ text: "Paper" }), undefined, { names: ["Paper"] })).toBe(
      "Pick one of Otty's themes",
    );
    expect(validateEdit("Nord", setting({ text: "Paper" }), undefined, {})).toBe("Pick one of Otty's themes");
  });
});
