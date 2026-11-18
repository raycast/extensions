import { describe, expect, it, vi } from "vitest";
import * as exec from "./exec";
import { MiseOutputError } from "./exec";
import addFixture from "./fixtures/tasks-add.json";
import replacedFixture from "./fixtures/tasks-add-dry-run-replaced.json";
import fixture from "./fixtures/tasks-ls.json";
import editingFixture from "./fixtures/tasks-ls-2026.11.0.json";
import {
  canEditTask,
  listTasks,
  parseTasks,
  parseTaskWrite,
  previewAddTask,
  splitCommand,
  taskGroup,
  validateTaskName,
} from "./tasks";

const location = { path: "/bin/false", env: { PATH: "/bin", MISE_YES: "1", NO_COLOR: "1" } } as const;

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
      run: ["chezmoi status", "mise bootstrap dotfiles status"],
    });
  });

  it("keeps a file task's script and leaves its run empty", () => {
    expect(parseTasks(editingFixture)[0]).toEqual({
      name: "backup",
      description: "Back up notes",
      aliases: [],
      source: "/tmp/mise-iso5e/home/.config/mise/tasks/backup",
      dir: "/tmp/mise-iso5e/home",
      run: [],
      file: "/tmp/mise-iso5e/home/.config/mise/tasks/backup",
    });
  });

  it("accepts a task without run or file, as older releases may print", () => {
    const bare: Record<string, unknown> = { ...fixture[0] };
    delete bare.run;
    delete bare.file;
    const [task] = parseTasks([bare]);
    expect(task.run).toEqual([]);
    expect(task).not.toHaveProperty("file");
  });

  it("throws MiseOutputError on a shape mismatch", () => {
    expect(() => parseTasks({})).toThrow(MiseOutputError);
    expect(() => parseTasks([{ name: "x" }])).toThrow(/task is malformed/);
    expect(() => parseTasks([{ ...fixture[0], aliases: "b" }])).toThrow(MiseOutputError);
  });
});

describe("listTasks", () => {
  it("lists only global tasks, so a ~/mise.toml does not add its own", async () => {
    const miseJson = vi.spyOn(exec, "miseJson").mockResolvedValue([]);
    await listTasks(location);
    expect(miseJson).toHaveBeenCalledWith(location, ["tasks", "ls", "-g"], parseTasks);
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

describe("canEditTask", () => {
  it("allows TOML tasks in any config file, conf.d included, and refuses file tasks", () => {
    const [backup, apply, greet] = parseTasks(editingFixture);
    expect(apply.source).toContain("/conf.d/");
    expect(canEditTask(apply)).toBe(true);
    expect(canEditTask(greet)).toBe(true);
    expect(canEditTask(backup)).toBe(false);
  });
});

describe("validateTaskName", () => {
  it("accepts names mise runs as themselves", () => {
    for (const name of ["build", "notes:sync", "a/b", "a.b", "_x", "a,b", "a@b", "ü"]) {
      expect(validateTaskName(name), name).toBeUndefined();
    }
  });

  it("refuses blanks and names mise run would read as a flag, a monorepo path or a pattern", () => {
    expect(validateTaskName("")).toBe("Enter a name");
    expect(validateTaskName("bad name")).toMatch(/spaces/);
    expect(validateTaskName("-x")).toBe("Can't start with -");
    for (const name of [":lead", "//app:build", "..."]) expect(validateTaskName(name), name).toMatch(/monorepo/);
    for (const name of ["x*", "a?b", "[x]", "{a,b}"]) expect(validateTaskName(name), name).toMatch(/pattern/);
  });

  it("refuses a name or alias another task already has", () => {
    expect(validateTaskName("lint", ["build", "lint"])).toBe("A task with this name already exists");
  });
});

describe("splitCommand", () => {
  it("splits a command line into the words mise quotes back into run", () => {
    // tasks-set fixture: mise wrote ["echo", "HELLO there"] as run = "echo 'HELLO there'".
    expect(splitCommand("echo 'HELLO there'")).toEqual({ words: ["echo", "HELLO there"] });
    expect(splitCommand(fixture[2].run[0])).toEqual({
      words: ["nvim", "--headless", "+lua vim.print(vim.version())", "+qa"],
    });
    expect(splitCommand(String.raw`  say "it's" a\ b "q\"uote" '' `)).toEqual({
      words: ["say", "it's", "a b", 'q"uote', ""],
    });
  });

  it("keeps characters that are only special at the start of a word, or quoted", () => {
    expect(splitCommand("echo a#b a~b x=y '$HOME' '*'")).toEqual({
      words: ["echo", "a#b", "a~b", "x=y", "$HOME", "*"],
    });
  });

  it("refuses shell syntax that mise's quoting would turn into literal text", () => {
    for (const line of [
      "brew update && brew upgrade",
      "ls | wc -l",
      "echo $HOME",
      'echo "$HOME"',
      "echo `date`",
      "rm *.log",
      "cat ~/.zshrc",
      "echo hi # comment",
      "echo > out",
      "FOO=bar env",
    ]) {
      expect(splitCommand(line), line).toHaveProperty("error");
    }
  });

  it("asks for a command when the line is blank and for the closing quote when one is open", () => {
    expect(splitCommand("   ")).toEqual({ error: "Enter a command" });
    expect(splitCommand("echo 'open")).toEqual({ error: "Close the ' quote" });
    expect(splitCommand("echo \\")).toEqual({ error: "Ends with a lone \\" });
  });
});

describe("parseTaskWrite", () => {
  it("reads the task, action and file from mise tasks add --json", () => {
    expect(parseTaskWrite(addFixture)).toEqual({
      task: "greet",
      action: "added",
      path: "/tmp/mise-iso5e/config/config.toml",
    });
    expect(parseTaskWrite(replacedFixture).action).toBe("replaced");
  });

  it("throws MiseOutputError on a shape mismatch", () => {
    expect(() => parseTaskWrite([])).toThrow(MiseOutputError);
    expect(() => parseTaskWrite({ ...addFixture, path: 1 })).toThrow(/expected a task write/);
  });
});

describe("previewAddTask", () => {
  it("dry-runs tasks add --global with no fields, which says whether it would replace a task", async () => {
    const miseJson = vi.spyOn(exec, "miseJson").mockResolvedValue(parseTaskWrite(replacedFixture));
    await expect(previewAddTask(location, "greet")).resolves.toMatchObject({ action: "replaced" });
    expect(miseJson).toHaveBeenCalledWith(location, ["tasks", "add", "--global", "--dry-run", "greet"], parseTaskWrite);
  });
});
