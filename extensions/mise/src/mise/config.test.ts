import { homedir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { configFileLabel, parseConfigFiles } from "./config";
import { MiseOutputError } from "./exec";
import fixture from "./fixtures/config-ls.json";

describe("parseConfigFiles", () => {
  const files = parseConfigFiles(fixture);

  it("keeps every global config file in mise's order", () => {
    expect(files.map((f) => f.path)).toEqual([
      "/Users/lachlan/.config/mise/config.local.toml",
      "/Users/lachlan/.config/mise/conf.d/tools.toml",
      "/Users/lachlan/.config/mise/conf.d/tasks.toml",
      "/Users/lachlan/.config/mise/conf.d/settings.toml",
      "/Users/lachlan/.config/mise/conf.d/dotfiles.toml",
    ]);
  });

  it("maps the tools each file declares, empty for files without a tools table", () => {
    expect(files[1].tools).toContain("node");
    expect(files[2].tools).toEqual([]);
  });

  it("throws MiseOutputError on a shape mismatch", () => {
    expect(() => parseConfigFiles({})).toThrow(MiseOutputError);
    expect(() => parseConfigFiles([{ path: "/x.toml" }])).toThrow(/entry is malformed/);
    expect(() => parseConfigFiles([{ path: "/x.toml", tools: [1] }])).toThrow(MiseOutputError);
  });
});

describe("configFileLabel", () => {
  it("shows the path relative to the global config directory", () => {
    expect(configFileLabel(join(homedir(), ".config/mise/config.local.toml"))).toBe("config.local.toml");
    expect(configFileLabel(join(homedir(), ".config/mise/conf.d/tools.toml"))).toBe("conf.d/tools.toml");
  });

  it("falls back to the file name outside that directory", () => {
    expect(configFileLabel(join(homedir(), ".tool-versions"))).toBe(".tool-versions");
    expect(configFileLabel("/etc/mise/config.toml")).toBe("config.toml");
  });
});
