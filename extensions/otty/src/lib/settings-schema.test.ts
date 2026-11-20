import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  choicesFor,
  defaultText,
  displayValue,
  ALL_SETTINGS,
  CUSTOMIZED_SETTINGS,
  groupSettings,
  groupTitle,
  settingsForView,
  isListed,
  paneIcon,
  parseConfigSchema,
  valueFromText,
  validateEdit,
  editedValue,
  type SchemaEntry,
  type Setting,
} from "./settings";

// Captured from `otty config schema --json` (Otty 1.6.5).
const envelope = JSON.parse(readFileSync(join(__dirname, "fixtures/config-schema.json"), "utf8"));
const schema = parseConfigSchema(envelope.data);
const entry = (key: string): SchemaEntry => {
  const found = schema.find((candidate) => candidate.key === key);
  if (!found) throw new Error(`No ${key} in the fixture`);
  return found;
};
const setting = (key: string, overrides: Partial<Setting> = {}): Setting => {
  const schemaEntry = entry(key);
  return {
    key,
    label: schemaEntry.label ?? key,
    value: schemaEntry.default,
    text: String(schemaEntry.default ?? ""),
    customized: false,
    schema: schemaEntry,
    ...overrides,
    configKeys: overrides.configKeys ?? (overrides.customized ? [key] : []),
  };
};

describe("parseConfigSchema", () => {
  it("reads every key Otty 1.6.5 describes", () => {
    expect(schema).toHaveLength(253);
    expect(entry("font-size")).toMatchObject({
      label: "Font Size",
      type: "number",
      default: 13,
      settings: { pane: "Appearance", section: "Text" },
    });
  });

  it("rejects output without a key list", () => {
    expect(() => parseConfigSchema({})).toThrow("Unexpected config schema");
    expect(() => parseConfigSchema({ keys: [{ key: "a" }] })).toThrow("Unexpected config schema");
  });
});

describe("isListed", () => {
  it("hides settings that don't apply on macOS", () => {
    expect(isListed(entry("windows-text-rendering"), false)).toBe(false);
    expect(isListed(entry("ctrl-c-action"), false)).toBe(false);
    expect(isListed(entry("font-size"), false)).toBe(true);
  });

  it("hides aliases, whose canonical key is listed", () => {
    expect(entry("ligatures").aliasOf).toBe("font-ligatures");
    expect(isListed(entry("ligatures"), false)).toBe(false);
    expect(isListed(entry("font-ligatures"), false)).toBe(true);
  });

  it("hides write-only keys", () => {
    expect(isListed(entry("scrollback-limit"), false)).toBe(false);
  });

  it("keeps every key you've set, so it can be reset", () => {
    for (const key of ["scrollback-limit", "ctrl-c-action", "ligatures", "mouse-shift-to-select"]) {
      expect(isListed(entry(key), true), key).toBe(true);
    }
  });

  it("hides deprecated keys unless they are set", () => {
    expect(isListed(entry("mouse-shift-to-select"), false)).toBe(false);
    expect(isListed(entry("mouse-shift-to-select"), true)).toBe(true);
  });

  it("lists every other key on a default config", () => {
    expect(schema.filter((candidate) => isListed(candidate, false))).toHaveLength(
      schema.filter(
        (c) => !c.aliasOf && !c.writeOnly && !c.deprecated && (!c.platforms || c.platforms.includes("macos")),
      ).length,
    );
  });
});

describe("groupSettings", () => {
  it("names a group after Otty's Settings pane and section", () => {
    expect(groupTitle(entry("font-size"))).toBe("Appearance · Text");
    expect(groupTitle(entry("foreground"))).toBe("Appearance");
    expect(groupTitle(entry("palette"))).toBe("Other");
  });

  it("names Advanced settings after the pane alone: Otty files all 68 under one section called All Settings", () => {
    expect(entry("sidebar-width").settings).toEqual({ pane: "Advanced", section: "All Settings" });
    expect(groupTitle(entry("sidebar-width"))).toBe("Advanced");
  });

  it("puts a pane's own settings before its sections, Other last", () => {
    const groups = groupSettings([
      setting("palette"),
      setting("font-size"),
      setting("cursor-style"),
      setting("foreground"),
      setting("background"),
    ]);
    expect(groups.map((group) => [group.title, group.settings.map((s) => s.key)])).toEqual([
      ["Appearance", ["background", "foreground"]],
      ["Appearance · Cursor", ["cursor-style"]],
      ["Appearance · Text", ["font-size"]],
      ["Other", ["palette"]],
    ]);
    expect(groups.map((group) => group.pane)).toEqual(["Appearance", "Appearance", "Appearance", "Other"]);
  });

  it("orders panes as Otty's Settings sidebar does, then panes it doesn't show, then Other", () => {
    const panes = [...new Set(groupSettings(schema.map((e) => setting(e.key))).map((group) => group.pane))];
    expect(panes).toEqual([
      "General",
      "Shell",
      "Controls",
      "Editor",
      "Agents",
      "View",
      "Appearance",
      "Key Bindings",
      "Advanced",
      "Data",
      "Remote",
      "Other",
    ]);
  });
});

describe("paneIcon", () => {
  it("gives every pane Otty's own sidebar icon, shipped in assets", () => {
    const panes = [...new Set(schema.map((e) => e.settings?.pane).filter((pane): pane is string => Boolean(pane)))];
    for (const pane of panes) {
      const icon = paneIcon(pane);
      expect(icon, pane).toBeDefined();
      expect(existsSync(join(__dirname, "../../assets", icon ?? "")), `${pane}: ${icon}`).toBe(true);
    }
    expect(paneIcon("Agents")).toBe("settings-panes/integrations.png");
    expect(paneIcon("Other")).toBeUndefined();
  });
});

describe("settingsForView", () => {
  const settings = [
    setting("font-size", { customized: true }),
    setting("foreground"),
    setting("cursor-style"),
    setting("sidebar-width", { customized: true }),
  ];
  const keys = (view: string) => settingsForView(settings, view).flatMap((group) => group.settings.map((s) => s.key));

  it("shows every setting in a pane, customized or not", () => {
    expect(keys("Appearance")).toEqual(["foreground", "cursor-style", "font-size"]);
  });

  it("shows only customized settings, across every pane, in the Customized view", () => {
    expect(keys(CUSTOMIZED_SETTINGS)).toEqual(["font-size", "sidebar-width"]);
  });

  it("shows everything in All Settings, and for a pane that no longer exists", () => {
    expect(keys(ALL_SETTINGS)).toHaveLength(4);
    expect(keys("No Such Pane")).toHaveLength(4);
  });
});

describe("valueFromText", () => {
  it("reads a key that config show doesn't report from its config get text", () => {
    expect(entry("font-family-bold").field).toBeNull();
    expect(valueFromText(entry("font-family-bold"), "Fira Code")).toBe("Fira Code");
    expect(valueFromText(entry("font-family-bold"), "")).toBeNull();
    expect(valueFromText(entry("copy-on-select"), "true")).toBe(true);
    expect(valueFromText(entry("palette"), "0=#000\n1=#111")).toEqual(["0=#000", "1=#111"]);
  });
});

describe("displayValue and defaultText", () => {
  it("summarizes a value for an accessory", () => {
    expect(displayValue(setting("font-size", { value: 14 }))).toBe("14");
    expect(displayValue(setting("copy-on-select", { value: false }))).toBe("Off");
    expect(displayValue(setting("palette", { value: ["0=#000", "1=#111"] }))).toBe("2 entries");
    expect(displayValue(setting("bold-color", { value: null }))).toBe("Not set");
  });

  it("shows a structured value as Otty writes it", () => {
    expect(
      displayValue(
        setting("mouse-scroll-multiplier", {
          value: { discrete: 3, precision: 1 },
          text: "discrete:3,precision:1",
        }),
      ),
    ).toBe("discrete:3,precision:1");
  });

  it("spells out the schema's default", () => {
    expect(defaultText(entry("font-size"))).toBe("13");
    expect(defaultText(entry("copy-on-select"))).toBe(entry("copy-on-select").default ? "On" : "Off");
    expect(defaultText(entry("cursor-color"))).toBe("Not set");
    expect(defaultText(entry("bold-color"))).toBe("none");
    expect(defaultText(entry("scroll-to-bottom"))).toBe("keystroke, no-output");
    expect(defaultText(entry("widen-ambiguous"))).toBe("None");
  });
});

describe("choicesFor", () => {
  it("offers an enum's values, keeping a customized value Otty doesn't list first", () => {
    expect(choicesFor(setting("cursor-style"))).toEqual(["block", "bar", "underline", "block_hollow"]);
    expect(choicesFor(setting("cursor-style", { text: "beam", customized: true }))).toEqual([
      "beam",
      "block",
      "bar",
      "underline",
      "block_hollow",
    ]);
  });

  it("gives a free-text field to an enum that also takes a path, and to non-enums", () => {
    expect(entry("tab-working-directory").allowsOther).toBe(true);
    expect(choicesFor(setting("tab-working-directory"))).toBeUndefined();
    expect(choicesFor(setting("font-size"))).toBeUndefined();
    expect(choicesFor(setting("scroll-to-bottom"))).toBeUndefined();
  });

  it("offers a picker for every macOS enum without allowsOther", () => {
    const enums = schema.filter((c) => c.type === "enum" && !c.allowsOther && isListed(c, false));
    expect(enums.length).toBeGreaterThan(40);
    for (const candidate of enums) {
      expect(choicesFor(setting(candidate.key)), candidate.key).toEqual(candidate.values);
    }
  });
});

describe("editedValue", () => {
  it("keeps a text setting exactly as typed, spaces included", () => {
    expect(editedValue(" YES ", entry("enquiry-response"))).toBe(" YES ");
    expect(editedValue("  ", entry("enquiry-response"))).toBe("  ");
  });

  it("trims settings whose values can't hold meaningful spaces", () => {
    expect(editedValue(" 14 ", entry("font-size"))).toBe("14");
    expect(editedValue(" block\n", entry("cursor-style"))).toBe("block");
  });

  it("leaves an empty field empty, which resets the setting", () => {
    expect(editedValue("", entry("enquiry-response"))).toBe("");
  });
});

describe("validateEdit", () => {
  it("accepts only an enum's values, but always saves the current value unchanged", () => {
    expect(validateEdit("bar", setting("cursor-style", { text: "block" }))).toBeUndefined();
    expect(validateEdit("beam", setting("cursor-style", { text: "block" }))).toBe(
      "Use one of: block, bar, underline, block_hollow",
    );
    expect(validateEdit("beam", setting("cursor-style", { text: "beam", customized: true }))).toBeUndefined();
  });

  it("lets a path through where the enum allows one", () => {
    expect(validateEdit("~/src", setting("tab-working-directory", { text: "inherit" }))).toBeUndefined();
  });

  it("treats an empty value as a reset, never an error", () => {
    expect(validateEdit("", setting("cursor-style"))).toBeUndefined();
  });

  it("checks numbers and their range", () => {
    expect(validateEdit("x", setting("font-size", { text: "13" }))).toBe("Enter a number");
    expect(validateEdit("14.5", setting("font-size", { text: "13" }))).toBeUndefined();
    expect(validateEdit("0.4", setting("background-opacity", { text: "1" }))).toBe("Enter a number from 0.5 to 1");
    expect(validateEdit("17", setting("editor-tab-size", { text: "4" }))).toBe("Enter a number from 1 to 16");
    expect(validateEdit("8", setting("editor-tab-size", { text: "4" }))).toBeUndefined();
  });

  it("accepts only themes Otty has, and none while the list is loading", () => {
    expect(validateEdit("Nord", setting("theme", { text: "Paper" }), { names: ["Paper", "Nord"] })).toBeUndefined();
    expect(validateEdit("Nope", setting("theme", { text: "Paper" }), { names: ["Paper"] })).toBe(
      "Pick one of Otty's themes",
    );
    expect(validateEdit("Nord", setting("theme", { text: "Paper" }), {})).toBe("Pick one of Otty's themes");
  });
});
