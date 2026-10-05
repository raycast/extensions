import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { searchBackend } from "./backends";
import { listConfigFiles } from "./config";
import { runMise } from "./exec";
import { listInstalled } from "./installed";
import { resolveMise, type MiseLocation } from "./locate";
import { addGlobally, clearCache, prune, remove, runTask, uninstall, upgrade, type MiseOperation } from "./operations";
import { listOutdated } from "./outdated";
import { listRegistry } from "./registry";
import { listRemote } from "./remote";
import { listTasks } from "./tasks";

const NETWORK_TIMEOUT = 15_000;

let mise: MiseLocation | undefined;
let searched: string[] = [];

beforeAll(async () => {
  const data = new Map<string, string>();
  const result = await resolveMise({
    storage: { get: (key) => data.get(key), set: (key, value) => void data.set(key, value) },
  });
  if ("path" in result) mise = result;
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
  it("carries the shell's exports and keeps the resolved mise on PATH", () => {
    const { path, env } = loc();
    expect(env.PATH.split(":")).toContain(dirname(path));
    if (process.env.CARGO_HOME) expect(env.CARGO_HOME).toBe(process.env.CARGO_HOME);
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
    const op = remove("jq");
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
    expect(Array.isArray(await listOutdated(loc()))).toBe(true);
  });

  it("listOutdated with --bump --inactive parses rows whose source is unknown", async () => {
    const tools = await listOutdated(loc(), { bump: true, inactive: true });
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.every((t) => typeof t.latest === "string")).toBe(true);
  });

  it("listRemote", async () => {
    const versions = await listRemote(loc(), "jq");
    expect(versions.map((v) => v.version)).toContain("1.8.1");
  });

  it("listTasks lists the global tasks without running any", async () => {
    const tasks = await listTasks(loc());
    expect(tasks.map((t) => t.name)).toEqual(["dotfiles:apply", "dotfiles:status", "nvim:check", "nvim:sync"]);
    expect(tasks.every((t) => t.source.endsWith("tasks.toml"))).toBe(true);
  });

  it("listConfigFiles", async () => {
    const files = await listConfigFiles(loc());
    expect(files.length).toBeGreaterThan(0);
    const globalDir = join(homedir(), ".config", "mise") + "/";
    expect(files.every((f) => f.path.startsWith(globalDir))).toBe(true);
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
