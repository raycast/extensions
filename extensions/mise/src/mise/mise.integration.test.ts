import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { searchBackend } from "./backends";
import { listConfigFiles } from "./config";
import { runMise } from "./exec";
import { listInstalled } from "./installed";
import { resolveMise, type MiseLocation } from "./locate";
import {
  addGlobally,
  addTask,
  clearCache,
  deleteTask,
  editTask,
  prune,
  remove,
  runTask,
  uninstall,
  upgrade,
  type MiseOperation,
} from "./operations";
import { GLOBAL_FLAG_SINCE, listOutdated } from "./outdated";
import { listRegistry } from "./registry";
import { listRemote } from "./remote";
import { canEditTask, listTasks, previewAddTask, splitCommand, TASK_EDITING_SINCE } from "./tasks";
import { atLeast, readVersion } from "./version";

const NETWORK_TIMEOUT = 15_000;

let mise: MiseLocation | undefined;
let searched: string[] = [];

beforeAll(async () => {
  const data = new Map<string, string>();
  // MISE_TEST_BIN runs the suite against another mise binary, such as a newer release.
  const result = await resolveMise({
    preferredPath: process.env.MISE_TEST_BIN,
    storage: { get: (key) => data.get(key), set: (key, value) => void data.set(key, value) },
  });
  if ("path" in result) mise = { ...result, version: await readVersion(result) };
  else searched = result.searched;
});

beforeEach((ctx) => {
  if (!mise) ctx.skip(`mise not found on this machine (searched ${searched.join(", ")})`);
});

function loc(): MiseLocation {
  if (!mise) throw new Error("mise not resolved");
  return mise;
}

async function dryRun(op: MiseOperation) {
  const result = await runMise(loc(), [...op.args, "--dry-run"]);
  expect(result, `mise ${op.args.join(" ")} --dry-run`).toMatchObject({ code: 0 });
  return result;
}

describe("resolveMise runs mise in the login shell's environment", () => {
  it("carries the shell's exports and keeps the resolved mise on PATH", (ctx) => {
    if (process.env.MISE_TEST_BIN) return ctx.skip("MISE_TEST_BIN need not be on the login shell's PATH");
    const { path, env } = loc();
    expect(env.PATH.split(":")).toContain(dirname(path));
    if (process.env.CARGO_HOME) expect(env.CARGO_HOME).toBe(process.env.CARGO_HOME);
  });
});

describe("readVersion against the real mise", () => {
  it("reads the bare CalVer that mise version --json reports", async () => {
    const result = await runMise(loc(), ["--version"]);
    expect(loc().version?.version).toMatch(/^\d{4}\.\d+\.\d+$/);
    expect(result.stdout).toContain(loc().version?.version);
  });
});

describe("--global scope against the real mise", () => {
  it("is accepted by outdated and upgrade exactly when the version gate allows it", async () => {
    const supported = atLeast(loc().version, GLOBAL_FLAG_SINCE);
    const outdated = await runMise(loc(), ["outdated", "--global", "--json"]);
    const upgradeRun = await runMise(loc(), [...upgrade("jq", { global: true }).args, "--dry-run"]);
    expect(outdated.code === 0, outdated.stderr).toBe(supported);
    expect(upgradeRun.code === 0, upgradeRun.stderr).toBe(supported);
  });

  it("upgrade with the gated flag", async (ctx) => {
    if (!atLeast(loc().version, GLOBAL_FLAG_SINCE)) return ctx.skip(`mise is older than ${GLOBAL_FLAG_SINCE}`);
    await dryRun(upgrade(undefined, { global: true, bump: true, jobs: 2, prune: true }));
  });

  it("listOutdated with the gated flag", async (ctx) => {
    if (!atLeast(loc().version, GLOBAL_FLAG_SINCE)) return ctx.skip(`mise is older than ${GLOBAL_FLAG_SINCE}`);
    const { tools, unchecked } = await listOutdated(loc(), { global: true });
    expect(Array.isArray(tools)).toBe(true);
    expect(Array.isArray(unchecked)).toBe(true);
  });
});

describe("operations dry-run against the real mise", () => {
  it("addGlobally writes to the default global config", async () => {
    const result = await dryRun(addGlobally("jq"));
    expect(result.stdout).toMatch(/would (update|install)/);
  });

  it("addGlobally writes to a chosen config file", async () => {
    const [file] = await listConfigFiles(loc());
    const result = await dryRun(addGlobally("jq", "latest", { configFile: file.path }));
    expect(result.stdout).toMatch(/would (update|install)/);
    expect(result.stdout).toContain(file.path.replace(homedir(), "~"));
  });

  it("addGlobally passes the job count", async () => {
    const result = await dryRun(addGlobally("jq", "latest", { jobs: 2 }));
    expect(result.stdout).toMatch(/would (update|install)/);
  });

  it("uninstall removes an installed jq version", async (ctx) => {
    const jq = (await listInstalled(loc())).find((tool) => tool.name === "jq");
    if (!jq) return ctx.skip("jq is not installed; run `mise install jq` to cover uninstall");
    const result = await dryRun(uninstall("jq", jq.versions[0].version));
    expect(result.stdout + result.stderr).toMatch(/dry-?run|would/i);
  });

  it("upgrade of one tool", async () => {
    await dryRun(upgrade("jq"));
  });

  it("upgrade of every tool", async () => {
    await dryRun(upgrade());
  });

  it("upgrade with --bump --inactive -j 2 --prune", async () => {
    const result = await dryRun(upgrade("jq", { bump: true, inactive: true, jobs: 2, prune: true }));
    expect(result.stdout + result.stderr).toMatch(/would|up to date|nothing/i);
  });

  it("uninstall through unuse is a subcommand that takes --path and prunes by default", async () => {
    const op = uninstall("jq", "1.8.1", { unuse: { configFile: "/tmp/mise.toml", requested: "1.8" } });
    const result = await runMise(loc(), [op.args[0], "--help"]);
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/--path/);
    expect(result.stdout).toMatch(/--no-prune/);
  });

  it("remove runs unuse, which prunes by default, then uninstall --all", async () => {
    const op = remove("jq", { configured: true });
    const unuse = await runMise(loc(), [op.args[0], "--help"]);
    expect(unuse.code).toBe(0);
    expect(unuse.stdout).toMatch(/prune/);
    const [uninstallStep] = op.andThen ?? [];
    const uninstall = await runMise(loc(), [uninstallStep[0], "--help"]);
    expect(uninstall.code).toBe(0);
    expect(uninstall.stdout).toMatch(/--all\b/);
  });

  // `mise run <task> --dry-run` hands --dry-run to the task and runs it; the flag goes before the name.
  it("runTask names a task mise run resolves, checked with --dry-run before the name", async () => {
    const [verb, name] = runTask("nvim:check").args;
    const result = await runMise(loc(), [verb, "--dry-run", name]);
    expect(result.code).toBe(0);
    expect(result.stdout + result.stderr).toContain("[nvim:check]");
  });

  it("prune", async () => {
    await dryRun(prune());
  });

  it("prune --tools and prune --configs", async () => {
    await dryRun(prune("tools"));
    await dryRun(prune("configs"));
  });

  it("clearCache is a subcommand mise cache lists", async () => {
    const [group, sub] = clearCache().args;
    const result = await runMise(loc(), [group, "--help"]);
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(new RegExp(`^\\s*${sub}\\b`, "m"));
  });
});

describe("read paths parse the real mise output", () => {
  it("listRegistry", async () => {
    const tools = await listRegistry(loc());
    expect(tools.length).toBeGreaterThan(1000);
    expect(tools.find((t) => t.short === "jq")?.bins).toContain("jq");
  });

  it("listInstalled", async () => {
    const tools = await listInstalled(loc());
    expect(tools.length).toBeGreaterThan(0);
    expect(tools.every((t) => t.versions.length > 0)).toBe(true);
  });

  it("listOutdated", async () => {
    const { tools, unchecked } = await listOutdated(loc());
    expect(Array.isArray(tools)).toBe(true);
    expect(Array.isArray(unchecked)).toBe(true);
  });

  it("listOutdated with --bump --inactive parses rows whose source is unknown", async () => {
    const { tools } = await listOutdated(loc(), { bump: true, inactive: true });
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.filter((t) => "malformed" in t)).toEqual([]);
  });

  it("listRemote", async () => {
    const versions = await listRemote(loc(), "jq");
    expect(versions.map((v) => v.version)).toContain("1.8.1");
  });

  it("listTasks lists the global tasks without running any", async () => {
    const tasks = await listTasks(loc());
    // The names are this machine's own global tasks; what matters is that each parses with a source.
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.every((t) => t.source.endsWith(".toml") || t.file !== undefined)).toBe(true);
  });

  it("listConfigFiles", async () => {
    const files = await listConfigFiles(loc());
    expect(files.length).toBeGreaterThan(0);
    const globalDir = join(homedir(), ".config", "mise") + "/";
    // From ~, mise also lists home-level files such as ~/.tool-versions, so only require the global dir.
    expect(files.some((f) => f.path.startsWith(globalDir))).toBe(true);
  });
});

describe("searchBackend against the real package indexes", () => {
  const deps = () => ({ fetch, listRemote: (spec: string) => listRemote(loc(), spec) });

  it.each([
    ["npm", "prettier"],
    ["cargo", "ripgrep"],
    ["gem", "rubocop"],
  ] as const)(
    "%s search leads with the exact match",
    async (backend, query) => {
      const results = await searchBackend(backend, query, deps());
      expect(results[0].spec).toBe(`${backend}:${query}`);
    },
    NETWORK_TIMEOUT,
  );

  it(
    "a missing pipx package yields no results",
    async () => {
      expect(await searchBackend("pipx", "this-does-not-exist-zz", deps())).toEqual([]);
    },
    NETWORK_TIMEOUT,
  );
});

// Writes real files, so every mise directory and HOME point at a fresh temp dir.
describe("task editing against the real mise, in an isolated config", () => {
  it("creates, edits and deletes a global task through the operations the form builds", async (ctx) => {
    if (!atLeast(loc().version, TASK_EDITING_SINCE)) return ctx.skip(`mise is older than ${TASK_EDITING_SINCE}`);
    const root = await mkdtemp(join(tmpdir(), "mise-tasks-"));
    const dir = (name: string) => join(root, name);
    // Only PATH comes from the login shell: a MISE_GLOBAL_CONFIG_FILE there could point at real files.
    // mise tasks set fails after writing when HOME does not exist.
    await mkdir(dir("home"));
    const isolated: MiseLocation = {
      ...loc(),
      env: {
        PATH: loc().env.PATH,
        MISE_YES: "1",
        NO_COLOR: "1",
        HOME: dir("home"),
        MISE_CONFIG_DIR: dir("config"),
        MISE_DATA_DIR: dir("data"),
        MISE_CACHE_DIR: dir("cache"),
        MISE_STATE_DIR: dir("state"),
      },
    };
    const run = async (op: MiseOperation) => {
      const result = await runMise(isolated, op.args);
      expect(result, `mise ${op.args.join(" ")}: ${result.stderr}`).toMatchObject({ code: 0 });
    };
    try {
      const config = join(dir("config"), "config.toml");
      expect(await previewAddTask(isolated, "notes:sync")).toEqual({
        task: "notes:sync",
        action: "added",
        path: config,
      });
      const command = splitCommand("rsync -a 'My Notes' a#b --exclude=x");
      if ("error" in command) throw new Error(command.error);
      await run(addTask("notes:sync", { description: "-Sync notes", run: command.words }));

      const [created] = await listTasks(isolated);
      expect(created).toMatchObject({ name: "notes:sync", description: "-Sync notes", source: config });
      expect(splitCommand(created.run[0])).toEqual(command);
      expect(canEditTask(created)).toBe(true);
      expect((await previewAddTask(isolated, "notes:sync")).action).toBe("replaced");

      await run(editTask(created, { description: "" }));
      await run(editTask(created, { run: ["echo", "done"] }));
      expect((await listTasks(isolated))[0]).toMatchObject({ description: "", run: ["echo done"] });

      await run(deleteTask(created));
      expect(await listTasks(isolated)).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
