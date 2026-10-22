import { describe, expect, test } from "bun:test";
import * as cp from "node:child_process";
import { existsSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { RUN_REAL } from "./real-fabric";
import { isRealFabric, realFabricIn, takeRefusals } from "./spawn-guard";

// Built as data, not literals at a call site, so real-fabric.test.ts doesn't read them as real uses.
const HOMEBREW = [
  "/opt/homebrew/bin/fabric",
  "/opt/homebrew/bin/fabric-ai",
  "/usr/local/bin/fabric",
  "/usr/local/bin/fabric-ai",
  "/opt/homebrew/Cellar/fabric-ai/1.4.518/bin/fabric-ai",
  "/opt/homebrew/opt/fabric-ai/bin/fabric-ai",
];
const INSTALLED = HOMEBREW.find((p) => existsSync(p));
const ROOT = join(import.meta.dir, "..");

/** Runs `body` as a test file of its own under the repo's preload; returns exit code and output. */
function plantedRun(body: string, env: Record<string, string | undefined> = {}) {
  const dir = mkdtempSync(join(tmpdir(), "spawn-guard-"));
  try {
    const file = join(dir, "planted.test.ts");
    writeFileSync(file, `import { test, expect } from "bun:test";\n${body}`);
    const e: NodeJS.ProcessEnv = { ...process.env, ...env };
    for (const [k, v] of Object.entries(env)) if (v === undefined) delete e[k];
    const r = cp.spawnSync(process.execPath, ["test", file], { cwd: ROOT, env: e, encoding: "utf8", timeout: 30_000 });
    return { code: r.status, out: `${r.stdout}${r.stderr}` };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("isRealFabric", () => {
  test("every Homebrew fabric path, bare or inside a command string", () => {
    for (const p of HOMEBREW) {
      expect([p, isRealFabric(p)]).toEqual([p, true]);
      expect([p, isRealFabric(`exec ${p} -l`)]).toEqual([p, true]);
      expect([p, isRealFabric(`'${p}'`)]).toEqual([p, true]);
      // A shell separator right before the path, as a test building a command string might write it.
      for (const s of [`cd /tmp;${p} -l`, `true&&${p}`, `(${p})`, `x|${p}`, `$(${p})`, `\`${p}\``])
        expect([s, isRealFabric(s)]).toEqual([s, true]);
    }
  });

  test("lookalikes and other binaries pass", () => {
    for (const p of [
      "/usr/bin/true",
      "/opt/homebrew/bin/fabricate",
      "/opt/homebrew/bin/fabric.sh",
      "/tmp/opt/homebrew/bin/fabric",
      "./opt/homebrew/bin/fabric",
      "fabric", // a bare name is looked up on PATH by realFabricIn, not here

      join(import.meta.dir, "fake-fabric.sh"),
    ])
      expect([p, isRealFabric(p)]).toEqual([p, false]);
  });

  test.skipIf(!INSTALLED)("a symlink to real fabric is seen through", () => {
    const dir = mkdtempSync(join(tmpdir(), "spawn-guard-"));
    try {
      const link = join(dir, "fabric");
      symlinkSync(INSTALLED!, link);
      expect(isRealFabric(link)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/** A PATH holding one entry, `fabric`, linked to `target`; removed after `use`. */
function onPath<T>(target: string, use: (path: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), "spawn-guard-"));
  try {
    symlinkSync(target, join(dir, "fabric"));
    return use(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("realFabricIn", () => {
  test.skipIf(!INSTALLED)("a bare command name is looked up on the spawn's PATH", () => {
    onPath(INSTALLED!, (path) => expect(realFabricIn(["fabric", "-l"], path)).toEndWith("/fabric"));
    // The same name on a PATH where it is something else runs.
    onPath("/usr/bin/true", (path) => expect(realFabricIn(["fabric", "-l"], path)).toBeUndefined());
  });

  test("a bare argument is not looked up: only the command is found on PATH", () => {
    expect(realFabricIn(["/bin/echo", "fabric"])).toBeUndefined();
  });
});

describe.skipIf(RUN_REAL)("the preload refuses real fabric outside FABRIC_REAL=1", () => {
  // child_process may catch the refusal (spawnSync hands it back as `.error`), so what counts is
  // that each start was recorded, once: the preload's afterEach fails the test on any record.
  const recorded = async (start: () => unknown) => {
    try {
      await start();
    } catch {
      /* thrown or not, the record below is the verdict */
    }
    return takeRefusals().length;
  };

  test("every child_process entry point, as command or argument", async () => {
    const p = HOMEBREW[0];
    const starts: [string, () => unknown][] = [
      ["spawn", () => cp.spawn(p, [])],
      ["spawnSync", () => cp.spawnSync(p)],
      ["execFile", () => cp.execFile(p, () => {})],
      ["execFileSync", () => cp.execFileSync(p)],
      ["exec", () => cp.exec(`${p} -l`, () => {})],
      ["execSync", () => cp.execSync(`${p} -l`)],
      ["fork", () => cp.fork(p)],
      // How lib/background.ts starts it: the wrapper is the command, fabric an argument.
      ["sh argument", () => cp.spawn("/bin/sh", ["wrapper.sh", "run", p])],
      ["promisify(execFile)", () => promisify(cp.execFile)(p)],
      ["Bun.spawn", () => Bun.spawn([p])],
      ["Bun.spawnSync cmd", () => Bun.spawnSync({ cmd: ["/bin/sh", "-c", `${p} -l`] })],
    ];
    for (const [name, start] of starts) expect([name, await recorded(start)]).toEqual([name, 1]);
  });

  // The spawn's own env.PATH is where a bare name is found, through Bun and through child_process.
  test.skipIf(!INSTALLED)("plain `fabric` found on the spawn's PATH", async () => {
    // Synchronous on purpose: onPath removes the PATH dir as soon as its callback returns.
    const counts = onPath(INSTALLED!, (PATH) =>
      [
        () => Bun.spawnSync(["fabric", "--version"], { env: { PATH } }),
        () => Bun.spawnSync({ cmd: ["fabric", "--version"], env: { PATH } }),
        () => cp.spawnSync("fabric", ["--version"], { env: { PATH } }),
      ].map((start) => {
        try {
          start();
        } catch {
          /* thrown or not, the record is the verdict */
        }
        return takeRefusals().length;
      }),
    );
    expect(counts).toEqual([1, 1, 1]);
  });

  test("a direct Bun.spawn refusal throws, naming the opt-in", () => {
    expect(() => Bun.spawn([HOMEBREW[1]])).toThrow(/refused: real fabric runs only under FABRIC_REAL=1/);
    takeRefusals();
  });

  test("other binaries still run, and promisify(execFile) keeps {stdout, stderr}", async () => {
    expect(cp.spawnSync("/bin/echo", ["ok"], { encoding: "utf8" }).stdout).toBe("ok\n");
    expect(await promisify(cp.execFile)("/bin/echo", ["ok"])).toEqual({ stdout: "ok\n", stderr: "" });
    expect(Bun.spawnSync(["/bin/echo", "ok"]).stdout.toString()).toBe("ok\n");
    expect(takeRefusals()).toEqual([]);
  });

  // The runner turns a spawn that throws into an error state, so the refusal alone could pass.
  test("a refusal src swallows still fails the test that caused it", () => {
    const body = `
import { DEFAULT_FABRIC_PATH } from ROOT_PATHS;
import { runFabric } from ROOT_RUNNER;
test("swallowed", () => {
  try { runFabric(DEFAULT_FABRIC_PATH, ["--version"]); } catch {}
  expect(1).toBe(1);
});`;
    const imports = (b: string) =>
      b
        .replace("ROOT_PATHS", JSON.stringify(join(ROOT, "lib/paths.ts")))
        .replace("ROOT_RUNNER", JSON.stringify(join(ROOT, "lib/runner.ts")));
    const red = plantedRun(imports(body), { FABRIC_REAL: undefined });
    // The failure lands on the test that spawned (the preload's afterEach), not just the file.
    expect([red.code, /spawn\(.*\) refused: real fabric/.test(red.out), /\(fail\) swallowed/.test(red.out)]).toEqual([
      1,
      true,
      true,
    ]);
    // Control: the same file with a harmless binary passes, so the red above is the guard.
    const green = plantedRun(imports(body.replace("DEFAULT_FABRIC_PATH,", '"/usr/bin/true",')), {
      FABRIC_REAL: undefined,
    });
    expect([green.code, green.out]).toEqual([0, expect.stringContaining("1 pass")]);
  });

  // No test runs here, so no afterEach does: the preload's afterAll is what catches it.
  test("a refusal outside any test fails the file", () => {
    const body = `
import { spawnSync } from "node:child_process";
spawnSync(${JSON.stringify(HOMEBREW[0])});
test.skip("nothing runs", () => {});`;
    const red = plantedRun(body, { FABRIC_REAL: undefined });
    expect([red.code, /refused: real fabric/.test(red.out)]).toEqual([1, true]);
  });
});

// Proved without starting fabric: under FABRIC_REAL=1 its path goes through as an echo argument.
test.skipIf(!INSTALLED)("FABRIC_REAL=1 lifts the guard", () => {
  const body = `
import { spawnSync } from "node:child_process";
test("echo", () => {
  expect(spawnSync("/bin/echo", [${JSON.stringify(INSTALLED)}], { encoding: "utf8" }).stdout).toBe(${JSON.stringify(`${INSTALLED}\n`)});
});`;
  const on = plantedRun(body, { FABRIC_REAL: "1" });
  expect([on.code, on.out]).toEqual([0, expect.stringContaining("1 pass")]);
  const off = plantedRun(body, { FABRIC_REAL: undefined });
  expect([off.code, off.out]).toEqual([1, expect.stringContaining("refused")]);
});
