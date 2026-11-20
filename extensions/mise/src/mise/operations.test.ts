import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  addGlobally,
  addTask,
  clearCache,
  deleteTask,
  editTask,
  failureMessage,
  parseProgressLine,
  prune,
  remove,
  runTask,
  uninstall,
  upgrade,
} from "./operations";

const useStderr = readFileSync(join(__dirname, "fixtures/use-stderr.txt"), "utf8");
const uninstallStderr = readFileSync(join(__dirname, "fixtures/uninstall-stderr.txt"), "utf8");
const lowDownloadsStderr = readFileSync(join(__dirname, "fixtures/use-low-downloads-stderr.txt"), "utf8");
const setMissingStderr = readFileSync(join(__dirname, "fixtures/tasks-set-missing-stderr.txt"), "utf8");

describe("addGlobally", () => {
  it("builds mise use -g <tool>@latest by default", () => {
    expect(addGlobally("jq")).toMatchObject({
      args: ["use", "-g", "jq@latest"],
      title: "Adding jq…",
      successTitle: "jq added",
      failureTitle: "Adding jq failed",
    });
    expect(addGlobally("jq", "1.7.1").args).toEqual(["use", "-g", "jq@1.7.1"]);
  });

  it("writes to one config file with --path instead of -g when a file is given", () => {
    const op = addGlobally("jq", "1.7.1", { configFile: "/Users/lachlan/.config/mise/conf.d/tools.toml" });
    expect(op.args).toEqual(["use", "--path", "/Users/lachlan/.config/mise/conf.d/tools.toml", "jq@1.7.1"]);
    expect(op.successTitle).toBe("jq added");
  });

  it("passes the parallel job count as -j before the spec", () => {
    expect(addGlobally("jq", "latest", { jobs: 4 }).args).toEqual(["use", "-g", "-j", "4", "jq@latest"]);
    expect(addGlobally("jq", "latest", { configFile: "/tmp/mise.toml", jobs: 2 }).args).toEqual([
      "use",
      "--path",
      "/tmp/mise.toml",
      "-j",
      "2",
      "jq@latest",
    ]);
  });
});

describe("addGlobally retry", () => {
  it("offers to allow low downloads when mise refuses an npm package for that reason", () => {
    const retry = addGlobally("npm:agent-peek").retry?.(lowDownloadsStderr);
    expect(retry?.title).toBe("Allow Low Downloads and Retry");
    expect(retry?.op.args).toEqual(["use", "-g", "--tool-option", "allow_low_downloads=true", "npm:agent-peek@latest"]);
  });

  it("keeps the config file and does not offer the retry again once the option is set", () => {
    const op = addGlobally("npm:agent-peek", "latest", { configFile: "/cfg/tools.toml" });
    const retry = op.retry?.(lowDownloadsStderr);
    expect(retry?.op.args.slice(0, 3)).toEqual(["use", "--path", "/cfg/tools.toml"]);
    expect(retry?.op.retry?.(lowDownloadsStderr)).toBeUndefined();
  });

  it("offers nothing for other failures", () => {
    expect(addGlobally("jq").retry?.("mise ERROR no such tool")).toBeUndefined();
  });
});

describe("failureMessage", () => {
  it("prefers mise's own error line over the trailing boilerplate", () => {
    expect(failureMessage(lowDownloadsStderr)).toBe(
      "Failed to install npm:agent-peek@latest: aube install failed: refusing to add agent-peek: only 17 weekly downloads (threshold: 1000)",
    );
  });

  it("falls back to the last line when there is no mise ERROR line", () => {
    expect(failureMessage("first\nlast")).toBe("last");
  });
});

describe("upgrade", () => {
  it("upgrades one tool within its configured range, never bumping the config", () => {
    expect(upgrade("jq")).toEqual({
      args: ["upgrade", "jq"],
      title: "Upgrading jq…",
      successTitle: "jq upgraded",
      failureTitle: "Upgrading jq failed",
    });
  });

  it("upgrades everything when no tool is given", () => {
    expect(upgrade()).toEqual({
      args: ["upgrade"],
      title: "Upgrading all tools…",
      successTitle: "All tools upgraded",
      failureTitle: "Upgrading all tools failed",
    });
  });

  it("adds each flag on its own", () => {
    expect(upgrade("jq", { global: true }).args).toEqual(["upgrade", "--global", "jq"]);
    expect(upgrade("jq", { bump: true }).args).toEqual(["upgrade", "--bump", "jq"]);
    expect(upgrade("jq", { inactive: true }).args).toEqual(["upgrade", "--inactive", "jq"]);
    expect(upgrade("jq", { jobs: 4 }).args).toEqual(["upgrade", "-j", "4", "jq"]);
    expect(upgrade(undefined, { prune: true }).args).toEqual(["upgrade", "--prune"]);
    expect(upgrade("jq", { bump: false, inactive: false, prune: false }).args).toEqual(["upgrade", "jq"]);
  });

  it("orders the flags --global --bump --inactive -j N --prune before the tool", () => {
    expect(upgrade("jq", { global: true, bump: true, inactive: true, jobs: 4, prune: true }).args).toEqual([
      "upgrade",
      "--global",
      "--bump",
      "--inactive",
      "-j",
      "4",
      "--prune",
      "jq",
    ]);
  });
});

describe("uninstall", () => {
  it("removes exactly one version", () => {
    expect(uninstall("jq", "1.7.1")).toEqual({
      args: ["uninstall", "jq@1.7.1"],
      title: "Uninstalling jq@1.7.1…",
      successTitle: "jq@1.7.1 uninstalled",
      failureTitle: "Uninstalling jq@1.7.1 failed",
    });
  });

  it("runs unuse on the config file with the request as written there when asked to remove the config entry", () => {
    const op = uninstall("node", "24.21.0", {
      unuse: { configFile: "/Users/lachlan/.config/mise/conf.d/tools.toml", requested: "lts" },
    });
    expect(op.args).toEqual(["unuse", "--path", "/Users/lachlan/.config/mise/conf.d/tools.toml", "node@lts"]);
    expect(op.title).toBe("Uninstalling node@24.21.0…");
    expect(op.successTitle).toBe("node@24.21.0 uninstalled and removed from config");
  });
});

describe("remove", () => {
  it("drops a configured tool from config, then deletes every installed version", () => {
    expect(remove("jq", { configured: true })).toEqual({
      args: ["unuse", "jq"],
      andThen: [["uninstall", "--all", "jq"]],
      title: "Removing jq…",
      successTitle: "jq removed",
      failureTitle: "Removing jq failed",
    });
  });

  it("deletes every installed version of a tool no config declares without running unuse", () => {
    expect(remove("jq", { configured: false })).toEqual({
      args: ["uninstall", "--all", "jq"],
      title: "Removing jq…",
      successTitle: "jq removed",
      failureTitle: "Removing jq failed",
    });
  });
});

describe("prune", () => {
  it("removes every installed version no config uses", () => {
    expect(prune()).toEqual({
      args: ["prune"],
      title: "Pruning unused versions…",
      successTitle: "Pruned unused versions",
      failureTitle: "Prune failed",
    });
  });

  it("narrows to tools or config links", () => {
    expect(prune("tools").args).toEqual(["prune", "--tools"]);
    expect(prune("configs")).toMatchObject({ args: ["prune", "--configs"], successTitle: "Pruned stale config links" });
  });
});

describe("clearCache", () => {
  it("deletes mise's cache files", () => {
    expect(clearCache()).toEqual({
      args: ["cache", "clear"],
      title: "Clearing cache…",
      successTitle: "Cache cleared",
      failureTitle: "Clearing cache failed",
    });
  });
});

describe("runTask", () => {
  it("runs one task by name", () => {
    expect(runTask("nvim:check")).toEqual({
      args: ["run", "nvim:check"],
      title: "Running nvim:check…",
      successTitle: "nvim:check finished",
      failureTitle: "nvim:check failed",
    });
  });
});

describe("addTask", () => {
  it("adds to the global config with the run words after --", () => {
    expect(addTask("greet", { description: "Say hello", run: ["echo", "hello there"] })).toEqual({
      args: ["tasks", "add", "--global", "--description=Say hello", "greet", "--", "echo", "hello there"],
      title: "Creating greet…",
      successTitle: "greet created",
      failureTitle: "Creating greet failed",
    });
  });

  it("leaves out an empty description and keeps one starting with - as a value", () => {
    expect(addTask("greet", { description: "", run: ["echo"] }).args).toEqual([
      "tasks",
      "add",
      "--global",
      "greet",
      "--",
      "echo",
    ]);
    expect(addTask("greet", { description: "-loud", run: ["echo"] }).args).toContain("--description=-loud");
  });
});

describe("editTask", () => {
  const greet = { name: "greet", source: "/Users/lachlan/.config/mise/conf.d/tasks.toml" };

  it("sets only the changed fields, in the file that defines the task", () => {
    expect(editTask(greet, { description: "Say hello loudly", run: ["echo", "HELLO there"] })).toEqual({
      args: [
        "tasks",
        "set",
        "--path",
        greet.source,
        "--description=Say hello loudly",
        "greet",
        "--",
        "echo",
        "HELLO there",
      ],
      title: "Saving greet…",
      successTitle: "greet saved",
      failureTitle: "Saving greet failed",
    });
    expect(editTask(greet, { run: ["true"] }).args).toEqual([
      "tasks",
      "set",
      "--path",
      greet.source,
      "greet",
      "--",
      "true",
    ]);
    expect(editTask(greet, { description: "x" }).args).toEqual([
      "tasks",
      "set",
      "--path",
      greet.source,
      "--description=x",
      "greet",
    ]);
  });

  it("unsets the description when it is cleared", () => {
    expect(editTask(greet, { description: "" }).args).toEqual([
      "tasks",
      "set",
      "--path",
      greet.source,
      "--unset",
      "description",
      "greet",
    ]);
  });

  it("shows mise's reason when the task is no longer in the file", () => {
    expect(failureMessage(setMissingStderr)).toBe("no task named greet in /tmp/mise-iso5e/config/config.toml");
  });
});

describe("deleteTask", () => {
  it("removes the task from its file without mise's own prompt", () => {
    expect(deleteTask({ name: "greet", source: "/cfg/config.toml" })).toEqual({
      args: ["tasks", "rm", "--yes", "--path", "/cfg/config.toml", "greet"],
      title: "Deleting greet…",
      successTitle: "greet deleted",
      failureTitle: "Deleting greet failed",
    });
  });
});

describe("parseProgressLine", () => {
  it("turns the captured stderr of mise use -g jq@1.7.1 into progress then a summary", () => {
    const parsed = useStderr.split("\n").map(parseProgressLine);
    expect(parsed).toEqual([
      { kind: "progress", message: "installing 1 tool" },
      { kind: "progress", message: "✓ jq@1.7.1 613ms" },
      { kind: "summary", message: "installed 1 tool in 616ms" },
      undefined,
    ]);
  });

  it("ignores warnings, errors and lines not from mise", () => {
    expect(parseProgressLine("mise WARN  deprecated [idiomatic.go.mod.go-directive]: 1/2 · noise")).toBeUndefined();
    expect(parseProgressLine("mise ERROR failed to install jq@1.7.1")).toBeUndefined();
    expect(parseProgressLine("Downloading jq-macos-arm64")).toBeUndefined();
    expect(parseProgressLine("")).toBeUndefined();
  });

  it("turns the captured stderr of mise uninstall jq@1.7.1 into progress then a summary", () => {
    expect(uninstallStderr.split("\n").map(parseProgressLine)).toEqual([
      { kind: "progress", message: "removing 1 tool" },
      { kind: "progress", message: "✓ jq@1.7.1 0ms" },
      { kind: "summary", message: "removed 1 tool in 0ms" },
      undefined,
    ]);
  });
});
