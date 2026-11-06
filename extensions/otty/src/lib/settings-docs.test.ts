import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { diffDocs, groupByDocs, parseConfigReference, validateSettingValue } from "./settings";
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

  it("lists allowed values for the enums the picker relies on", () => {
    expect(settings["cursor-style"]?.values).toEqual(["block", "bar", "underline", "block_hollow"]);
    expect(settings["new-tab-position"]?.values).toContain("after-current");
  });
});
