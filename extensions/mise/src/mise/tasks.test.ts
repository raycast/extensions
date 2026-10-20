import { describe, expect, it } from "vitest";
import { MiseOutputError } from "./exec";
import fixture from "./fixtures/tasks-ls.json";
import { parseTasks, taskGroup } from "./tasks";

describe("parseTasks", () => {
  const tasks = parseTasks(fixture);

  it("keeps every task in mise's order with its description, source and directory", () => {
    expect(tasks.map((t) => t.name)).toEqual(["dotfiles:apply", "dotfiles:status", "nvim:check", "nvim:sync"]);
    expect(tasks[1]).toEqual({
      name: "dotfiles:status",
      description: "Show chezmoi and mise-managed dotfile drift",
      aliases: [],
      source: "/Users/lachlan/.config/mise/conf.d/tasks.toml",
      dir: "/Users/lachlan",
    });
  });

  it("throws MiseOutputError on a shape mismatch", () => {
    expect(() => parseTasks({})).toThrow(MiseOutputError);
    expect(() => parseTasks([{ name: "x" }])).toThrow(/task is malformed/);
    expect(() => parseTasks([{ ...fixture[0], aliases: "b" }])).toThrow(MiseOutputError);
  });
});

describe("taskGroup", () => {
  it("is the part before the first colon, or nothing for a plain name", () => {
    expect(taskGroup("dotfiles:apply")).toBe("dotfiles");
    expect(taskGroup("a:b:c")).toBe("a");
    expect(taskGroup("build")).toBeUndefined();
    expect(taskGroup(":odd")).toBeUndefined();
  });
});
