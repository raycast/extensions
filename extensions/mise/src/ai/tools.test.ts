import { describe, expect, it, vi } from "vitest";
import { defaultPreferences, mocks } from "../../test/raycast-api";
import * as exec from "../mise/exec";
import * as outdated from "../mise/outdated";
import * as tasks from "../mise/tasks";
import type { Task } from "../mise/tasks";
import * as version from "../mise/version";
import listOutdated from "../tools/list-outdated";
import runTask, { confirmation as confirmRun } from "../tools/run-task";
import upgradeTools, { confirmation as confirmUpgrade } from "../tools/upgrade-tools";
import useTool, { confirmation as confirmUse } from "../tools/use-tool";
import { runTask as runTaskOp } from "../mise/operations";
import { checkTool, checkVersion, runForAI, tail } from "./tools";

const backup: Task = {
  name: "backup",
  description: "Back up dotfiles",
  aliases: ["bk"],
  source: "/Users/me/.config/mise/config.toml",
  dir: "/Users/me",
  run: ["rsync -a ~/dotfiles/ ~/Backups/"],
};

function stubRun(result: exec.RunResult = { code: 0, stdout: "", stderr: "" }) {
  return vi.spyOn(exec, "runMise").mockResolvedValue(result);
}

describe("tool and version names", () => {
  it.each(["node", "ripgrep", "npm:prettier", "npm:@biomejs/biome", "github:cli/cli", "go:golang.org/x/tools/gopls"])(
    "accepts %s",
    (tool) => expect(checkTool(tool)).toBe(tool),
  );

  it.each(["-g", "--version", "node[postinstall=touch /tmp/x]", "node 22", "node@22", "", "npm:"])(
    "rejects %j",
    (tool) => expect(() => checkTool(tool)).toThrow(/not a tool name/),
  );

  it("defaults the version to latest and rejects flags", () => {
    expect(checkVersion(undefined)).toBe("latest");
    expect(checkVersion("  ")).toBe("latest");
    expect(checkVersion("prefix:1.2")).toBe("prefix:1.2");
    expect(() => checkVersion("--force")).toThrow(/not a version/);
    expect(() => checkVersion("22 --force")).toThrow(/not a version/);
  });

  it("keeps the end of long output", () => {
    expect(tail("abcdef", 3)).toBe("…def");
    expect(tail("  short  ")).toBe("short");
  });
});

describe("run-task", () => {
  it("runs a task found by its alias under its real name", async () => {
    vi.spyOn(tasks, "listTasks").mockResolvedValue([backup]);
    const run = stubRun({ code: 0, stdout: "done\n", stderr: "[backup] $ rsync\n" });

    const result = await runTask({ task: "bk" });

    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/bin/sh" }),
      ["run", "backup"],
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(result).toEqual({ ok: true, command: "mise run backup", exitCode: 0, output: "done\n[backup] $ rsync" });
  });

  it("refuses a task that isn't global, without running mise", async () => {
    vi.spyOn(tasks, "listTasks").mockResolvedValue([backup]);
    const run = stubRun();

    await expect(runTask({ task: "deploy" })).rejects.toThrow(
      'no global mise task named "deploy". Global tasks: backup.',
    );
    await expect(confirmRun({ task: "deploy" })).rejects.toThrow(/no global mise task/);
    expect(run).not.toHaveBeenCalled();
  });

  it("shows mise's dry-run plan, dependencies and redefinitions included, before it runs", async () => {
    vi.spyOn(tasks, "listTasks").mockResolvedValue([{ ...backup, depends: ["lint"] }]);
    const run = stubRun({
      code: 0,
      stdout: "",
      stderr:
        "mise jq@1.6        ⇢ would install\n[lint] $ echo from ~/mise.toml\n[backup] $ rsync -a ~/dotfiles/ ~/Backups/\nFinished in 12.2ms\n",
    });
    await expect(confirmRun({ task: "bk" })).resolves.toEqual({
      message: 'Run the global mise task "backup"? It runs with your account\'s access.',
      info: [
        {
          name: "Runs",
          value:
            "mise jq@1.6        ⇢ would install\n[lint] $ echo from ~/mise.toml\n[backup] $ rsync -a ~/dotfiles/ ~/Backups/",
        },
        { name: "Defined in", value: backup.source },
      ],
    });
    expect(run).toHaveBeenCalledWith(expect.anything(), ["run", "--dry-run", "backup"]);
  });

  it("refuses to confirm when mise can't plan the run", async () => {
    vi.spyOn(tasks, "listTasks").mockResolvedValue([backup]);
    stubRun({ code: 1, stdout: "", stderr: "mise ERROR Config files in ~/mise.toml are not trusted.\n" });
    await expect(confirmRun({ task: "backup" })).rejects.toThrow("Config files in ~/mise.toml are not trusted.");
  });

  it("reports a failed run with mise's error", async () => {
    vi.spyOn(tasks, "listTasks").mockResolvedValue([backup]);
    stubRun({ code: 1, stdout: "", stderr: "mise ERROR task failed: exit 23\nmise ERROR Version: 2026.11.9\n" });

    await expect(runTask({ task: "backup" })).resolves.toMatchObject({
      ok: false,
      exitCode: 1,
      error: "task failed: exit 23",
    });
  });
});

describe("use-tool", () => {
  it("runs mise use -g with the version given separately", async () => {
    const run = stubRun();
    await useTool({ tool: "node", version: "22" });
    expect(run).toHaveBeenCalledWith(expect.anything(), ["use", "-g", "node@22"], expect.anything());
  });

  it("passes the jobs preference and confirms the config it changes", async () => {
    mocks.getPreferenceValues.mockReturnValue({ ...defaultPreferences, jobs: "4" });
    await expect(confirmUse({ tool: "npm:prettier" })).resolves.toEqual({
      message: "Install npm:prettier@latest and add it to your global mise config?",
      info: [
        { name: "Command", value: "mise use -g -j 4 npm:prettier@latest" },
        { name: "Changes", value: "Your global mise config" },
      ],
    });
  });

  it("rejects tool options before confirming or running", async () => {
    const run = stubRun();
    await expect(confirmUse({ tool: "node[postinstall=x]" })).rejects.toThrow(/not a tool name/);
    await expect(useTool({ tool: "node", version: "--force" })).rejects.toThrow(/not a version/);
    expect(run).not.toHaveBeenCalled();
  });
});

describe("upgrade-tools", () => {
  it("upgrades only global tools on a mise that accepts --global", async () => {
    vi.spyOn(version, "readVersion").mockResolvedValue({ version: "2026.11.9" });
    const run = stubRun();
    await upgradeTools({ tool: "node" });
    expect(run).toHaveBeenCalledWith(expect.anything(), ["upgrade", "--global", "node"], expect.anything());
  });

  it("upgrades everything, with --bump from the preference, when no tool is named", async () => {
    vi.spyOn(version, "readVersion").mockResolvedValue({ version: "2026.11.9" });
    mocks.getPreferenceValues.mockReturnValue({ ...defaultPreferences, upgradeBump: true });
    await expect(confirmUpgrade({})).resolves.toEqual({
      message: "Upgrade every outdated global tool?",
      info: [{ name: "Command", value: "mise upgrade --global --bump" }],
    });
  });
});

describe("list-outdated", () => {
  it("reports tools mise couldn't check alongside outdated ones", async () => {
    vi.spyOn(outdated, "listOutdated").mockResolvedValue({
      tools: [
        { name: "node", requested: "22", current: "22.11.0", latest: "22.12.0" },
        { name: "odd", malformed: true },
      ],
      unchecked: [{ name: "asdf:gone", version: "1.0.0" }],
    });
    await expect(listOutdated()).resolves.toEqual({
      outdated: [
        { tool: "node", requested: "22", current: "22.11.0", latest: "22.12.0" },
        { tool: "odd", note: "mise reported this tool in a form the extension can't read" },
      ],
      couldNotCheck: [{ tool: "asdf:gone", version: "1.0.0" }],
    });
  });
});

describe("task dependencies", () => {
  it("lists every dependency shape mise reports, before and after the task", () => {
    const [task] = tasks.parseTasks([
      {
        name: "main",
        description: "",
        aliases: [],
        source: "/Users/me/.config/mise/config.toml",
        dir: "/Users/me",
        run: ["echo main"],
        depends: ["a", ["b", "x"], { tag: ["t"] }],
        depends_post: ["a"],
        wait_for: ["b"],
      },
    ]);
    expect(task.depends).toEqual(["a", "b x", "tasks tagged t", "a"]);
  });
});

describe("run timeout", () => {
  it("stops a task that doesn't finish and says so", async () => {
    vi.spyOn(exec, "runMise").mockImplementation(
      (_location, _args, options) =>
        new Promise((resolve) =>
          options?.signal?.addEventListener("abort", () => resolve({ code: null, stdout: "watching…", stderr: "" })),
        ),
    );
    const location = { path: "/bin/sh", env: { PATH: "/bin", MISE_YES: "1", NO_COLOR: "1" } } as const;
    await expect(runForAI(location, runTaskOp("watch"), 20)).resolves.toMatchObject({
      ok: false,
      output: "watching…",
      error: expect.stringMatching(/^Stopped after/),
    });
  });
});
