// ISC-7's spy, run as its own process by test/states.test.ts (`bun test/env-spy.flow.ts`), never
// imported: bun's module mocks are process-wide and mock.restore() doesn't undo them, so a spy on
// node:fs in the test process kept recording every later file's calls. Prints JSON.
import { mock } from "bun:test";
import { linkSync, mkdirSync, mkdtempSync, realpathSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Secrets fixtures are made before the spy goes in, so only the lib's own calls are seen.
const sec = realpathSync(mkdtempSync(join(tmpdir(), "fabric-envspy-sec-")));
mkdirSync(join(sec, "a"));
writeFileSync(join(sec, "a", ".env"), "DEFAULT_VENDOR=x\n");
symlinkSync(join(sec, "a", ".env"), join(sec, "notes.txt"));
linkSync(join(sec, "a", ".env"), join(sec, "hard.txt"));

const real = await import("node:fs");
const seen: string[] = [];
const wrap =
  <F extends (...a: never[]) => unknown>(name: string, f: F) =>
  (...args: Parameters<F>) => {
    for (const a of args as unknown[]) {
      if (typeof a === "string") seen.push(`${name}:${a}`);
      else if (Array.isArray(a)) for (const e of a) if (typeof e === "string") seen.push(`${name}:${e}`);
    }
    return f(...args);
  };
// The originals are captured here: once mocked, the namespace's own properties are the spies.
const spied = Object.fromEntries(
  Object.entries(real).map(([k, v]) => [
    k,
    typeof v === "function" && /Sync$|^create|^open/.test(k) ? wrap(k, v as never) : v,
  ]),
);
mock.module("node:fs", () => ({ ...spied, default: spied }));
const realCp = await import("node:child_process");
const SPAWNERS = ["spawn", "execFile", "spawnSync"] as const;
const spiedCp = { ...realCp, ...Object.fromEntries(SPAWNERS.map((k) => [k, wrap(k, realCp[k] as never)])) };
mock.module("node:child_process", () => ({ ...spiedCp, default: spiedCp }));

const FAKE = join(import.meta.dir, "fake-fabric.sh");
const tmp = realpathSync(mkdtempSync(join(tmpdir(), "fabric-envspy-")));
const env = { FAKE_FABRIC_LOG: join(tmp, "log") };
const loaders = await import("../lib/loaders");
const writers = await import("../lib/writers");
const classify = await import("../lib/classify");
const bg = await import("../lib/background");

await loaders.loadPatterns(FAKE, { env, patternsDir: join(tmp, "p"), myPatternsDir: join(tmp, "c") });
await loaders.loadSessions(FAKE, { env, sessionsDir: join(tmp, "s") });
await loaders.loadStrategies(FAKE, env);
loaders.loadProfiles(join(tmp, "profiles"));
loaders.readSystemPrompt("summarize");
writers.saveOwnFile(join(tmp, "ctx"), "c1", "text", join(tmp, "p"));
writers.savePattern(join(tmp, "c"), join(tmp, "p"), { name: "x", system: "s" });
writers.listMyPatterns(join(tmp, "c"));
classify.classifyText("https://youtu.be/x");
// classifyFile is the one lib path that opens a file the user picked: a .env by name,
// by symlink and by hard link must each be refused without any call naming the .env.
const refused = [join(sec, "a", ".env"), join(sec, "notes.txt"), join(sec, "hard.txt")].map((f) => {
  try {
    classify.classifyFile(f);
    return false;
  } catch {
    return true;
  }
});
const m = await bg.startBackground({
  runsDir: join(tmp, "runs"),
  wrapper: join(import.meta.dir, "..", "assets", "fabric-bg.sh"),
  fabricPath: FAKE,
  spec: { input: { kind: "text", text: "hi" }, pattern: "summarize" },
  inputLabel: "x",
  outputFolder: join(tmp, "out"),
  finalName: "a - summarize.md",
  patternsRoot: join(tmp, "p"),
  env: { ...env, FABRIC_BG_NOTIFIER: "/usr/bin/true" },
});
for (let i = 0; i < 200 && bg.readRun(join(tmp, "runs"), m.id)?.status === "running"; i++) await Bun.sleep(25);
bg.listRuns(join(tmp, "runs"));

console.log(JSON.stringify({ fake: FAKE, seen, refused }));
