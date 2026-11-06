import { describe, expect, it } from "vitest";
import {
  buildConfigGetArgs,
  buildConfigSetArgs,
  buildConfigUnsetArgs,
  formatValue,
  groupSettings,
  parseCustomizedKeys,
  settingType,
  toKebabKey,
  type Setting,
} from "./settings";

describe("toKebabKey", () => {
  it("converts config show's camelCase to config set's kebab-case", () => {
    expect(toKebabKey("ipcAllowSendKeys")).toBe("ipc-allow-send-keys");
    expect(toKebabKey("ctrlCAction")).toBe("ctrl-c-action");
    expect(toKebabKey("theme")).toBe("theme");
  });
});

describe("CLI args", () => {
  it("gets, sets, and unsets by kebab key", () => {
    expect(buildConfigGetArgs("font-size")).toEqual(["config", "get", "font-size"]);
    expect(buildConfigSetArgs("font-size", "14")).toEqual(["config", "set", "font-size", "--", "14"]);
    expect(buildConfigUnsetArgs("font-size")).toEqual(["config", "unset", "font-size"]);
  });
});

describe("settingType", () => {
  it("classifies values from config show", () => {
    expect(settingType(true)).toBe("boolean");
    expect(settingType(13.5)).toBe("number");
    expect(settingType("Paper")).toBe("string");
    expect(settingType(["A=1"])).toBe("list");
    expect(settingType(null)).toBe("string");
    expect(settingType({ a: 1 })).toBe("object");
  });
});

describe("formatValue", () => {
  it("renders values for an accessory", () => {
    expect(formatValue(true)).toBe("On");
    expect(formatValue(false)).toBe("Off");
    expect(formatValue(13)).toBe("13");
    expect(formatValue(null)).toBe("Not set");
    expect(formatValue("")).toBe("Not set");
    expect(formatValue([])).toBe("None");
    expect(formatValue(["a", "b"])).toBe("2 entries");
    expect(formatValue(["a"])).toBe("1 entry");
  });
});

describe("parseCustomizedKeys", () => {
  it("reads the keys a config.toml sets explicitly", () => {
    const toml = [
      "# comment",
      'theme = "Paper"',
      "font-size = 13",
      "  copy-on-select=true",
      "[section]",
      'env = ["A=1"]',
      'x = "a = b"',
    ].join("\n");
    expect([...parseCustomizedKeys(toml)]).toEqual(["theme", "font-size", "copy-on-select", "env", "x"]);
  });
});

describe("groupSettings", () => {
  const setting = (key: string): Setting => ({
    key,
    value: true,
    type: "boolean",
    text: "true",
    customized: false,
  });

  it("spells acronym groups in capitals", () => {
    const groups = groupSettings([
      setting("ipc-allow-send-keys"),
      setting("ipc-allow-sensitive-sessions"),
      setting("ssh-integration"),
      setting("ssh-session-persistence"),
    ]);
    expect(groups.map((g) => g.title)).toEqual(["IPC", "SSH"]);
  });

  it("groups by leading word, folding singletons into General", () => {
    const groups = groupSettings([
      setting("font-size"),
      setting("font-family"),
      setting("theme"),
      setting("copy-on-select"),
      setting("cursor-style"),
      setting("cursor-color"),
    ]);
    expect(groups.map((g) => [g.title, g.settings.map((s) => s.key)])).toEqual([
      ["Cursor", ["cursor-color", "cursor-style"]],
      ["Font", ["font-family", "font-size"]],
      ["General", ["copy-on-select", "theme"]],
    ]);
  });
});
