import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { RunSpec } from "../lib/argv";
import {
  canCopyError,
  listRuns,
  LOST_NOTE,
  readRun,
  type RunRecord,
  startBackground,
  STATUS_LABEL,
  stopRun,
} from "../lib/background";
import { PathError, refusedFolders } from "../lib/paths";
import { redact } from "../lib/redact";
import { alive, pidFrom } from "./procs";
import { loggedArgv } from "./view-helpers";

const FAKE = join(import.meta.dir, "fake-fabric.sh");
const WRAPPER = join(import.meta.dir, "..", "assets", "fabric-bg.sh");
/** The wrapper with its comment lines dropped, so a check can't pass on a commented-out line. */
const wrapperCode = () =>
  readFileSync(WRAPPER, "utf8")
    .split("\n")
    .filter((l) => !l.trimStart().startsWith("#"))
    .join("\n");
const tmp = realpathSync(mkdtempSync(join(tmpdir(), "fabric-bg-")));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

const notifier = join(tmp, "notify.sh");
writeFileSync(notifier, '#!/bin/sh\nfor a in "$@"; do printf "%s\\n" "$a"; done >> "$NOTIFY_LOG"\n', { mode: 0o755 });

let n = 0;
function setup(extraEnv: Record<string, string> = {}) {
  const base = join(tmp, `case${++n}`);
  const env: Record<string, string> = {
    FAKE_FABRIC_LOG: join(base, "fake.log"),
    FABRIC_BG_NOTIFIER: notifier,
    NOTIFY_LOG: join(base, "notify.log"),
    ...extraEnv,
  };
  mkdirSync(base);
  return { base, runsDir: join(base, "runs"), out: join(base, "out"), env };
}

async function start(s: ReturnType<typeof setup>, spec: Partial<RunSpec> = {}, finalName = "answer - summarize.md") {
  return startBackground({
    runsDir: s.runsDir,
    wrapper: WRAPPER,
    fabricPath: FAKE,
    spec: { input: { kind: "text", text: "hello" }, pattern: "summarize", ...spec },
    inputLabel: "Clipboard",
    outputFolder: s.out,
    finalName,
    patternsRoot: join(s.base, "patterns"),
    env: s.env,
  });
}

async function settled(runsDir: string, id: string, ms = 8000): Promise<RunRecord> {
  const until = Date.now() + ms;
  for (;;) {
    const r = readRun(runsDir, id);
    if (r && r.status !== "running") return r;
    if (Date.now() > until) throw new Error("run never finished");
    await Bun.sleep(25);
  }
}

describe("ISC-25: a background run finishes and saves its answer after its starter is gone", () => {
  test("starter process exits immediately; the run still completes", async () => {
    const s = setup({ FAKE_FABRIC_CHUNKS: "3", FAKE_FABRIC_DELAY: "0.2" });
    const script = `
      import { startBackground } from ${JSON.stringify(join(import.meta.dir, "..", "lib", "background.ts"))};
      const m = await startBackground(${JSON.stringify({
        runsDir: s.runsDir,
        wrapper: WRAPPER,
        fabricPath: FAKE,
        spec: { input: { kind: "url", url: "https://example.com" }, pattern: "summarize" },
        inputLabel: "Clipboard",
        outputFolder: s.out,
        finalName: "page - summarize.md",
        patternsRoot: join(s.base, "patterns"),
        env: s.env,
      })});
      console.log(m.id);
      process.exit(0);`;
    const starter = spawnSync("bun", ["-e", script], { encoding: "utf8" });
    expect(starter.status).toBe(0);
    const id = starter.stdout.trim();
    expect(readRun(s.runsDir, id)?.status).toBe("running");
    const r = await settled(s.runsDir, id);
    expect(r.status).toBe("done");
    expect(r.output).toBe(join(s.out, "page - summarize.md"));
    expect(readFileSync(r.output!, "utf8")).toBe("chunk 1\nchunk 2\nchunk 3\n");
    // The fake notifier logs one argv item per line; the text must come right after --.
    const argv = readFileSync(join(s.base, "notify.log"), "utf8").trimEnd().split("\n");
    expect(argv.at(-2)).toBe("--");
    expect(argv.at(-1)).toMatch(/^Done: summarize\./);
  });

  test("an existing file is never overwritten; the answer lands as -2", async () => {
    const s = setup();
    mkdirSync(s.out);
    writeFileSync(join(s.out, "answer - summarize.md"), "mine");
    const r = await settled(s.runsDir, (await start(s)).id);
    expect(r.output).toBe(join(s.out, "answer - summarize-2.md"));
    expect(readFileSync(join(s.out, "answer - summarize.md"), "utf8")).toBe("mine");
  });

  test("a symlink sitting at the target name is never written through", async () => {
    const s = setup();
    mkdirSync(s.out);
    const victim = join(s.base, "victim.txt");
    writeFileSync(victim, "keep");
    symlinkSync(victim, join(s.out, "answer - summarize.md"));
    const r = await settled(s.runsDir, (await start(s)).id);
    expect(r.output).toBe(join(s.out, "answer - summarize-2.md"));
    expect(readFileSync(victim, "utf8")).toBe("keep");
  });
});

describe("ISC-26 / 26.1: a failed run keeps its exit code and stderr, and says so by name", () => {
  test("bad pattern", async () => {
    const s = setup({ FAKE_FABRIC_EXIT: "1", FAKE_FABRIC_STDERR: "could not get pattern nope_xyz: not found" });
    const r = await settled(s.runsDir, (await start(s, { pattern: "nope_xyz" })).id);
    expect(r.status).toBe("failed");
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("could not get pattern nope_xyz");
    expect(r.output).toBeUndefined();
    const note = readFileSync(join(s.base, "notify.log"), "utf8");
    expect(note).toContain("Failed: nope_xyz (exit 1)");
    expect(note).not.toContain("could not get pattern"); // notification text is fixed text + name + status only
  });
});

describe("ISC-26.2: records are owner-only and hold no key text", () => {
  const secrets = [
    "sk-ant-api03-AbCdEf123456",
    "AIzaSyD-abcdefghijk",
    "gsk_abcdef123456",
    "xai-abcdef123456",
    "Authorization: Bearer eyJhbGciOi.abc.def",
    'x-api-key: "zzzsecretzzz"',
    '{"api_key": "jsonsecret999"}',
    "OPENAI_API_KEY=envsecret777",
    "401 invalid pplx-PplxSecret42",
  ];
  const leaks = [
    "AbCdEf123456",
    "abcdefghijk",
    "abcdef123456",
    "eyJhbGciOi",
    "zzzsecretzzz",
    "jsonsecret999",
    "envsecret777",
    "PplxSecret42",
  ];

  test("permissions 0700 / 0600 and the wrapper redacts stderr before it hits disk", async () => {
    const s = setup({ FAKE_FABRIC_EXIT: "2", FAKE_FABRIC_STDERR: secrets.join("\n") });
    const meta = await start(s);
    await settled(s.runsDir, meta.id);
    const dir = join(s.runsDir, meta.id);
    expect(statSync(s.runsDir).mode & 0o777).toBe(0o700);
    expect(statSync(dir).mode & 0o777).toBe(0o700);
    for (const f of readdirSync(dir)) expect([f, statSync(join(dir, f)).mode & 0o777]).toEqual([f, 0o600]);
    const onDisk = readFileSync(join(dir, "stderr"), "utf8");
    for (const leak of leaks) expect(onDisk).not.toContain(leak);
    expect(onDisk).toContain("[REDACTED]");
  });

  test("the TS reader applies the same redaction, leaving no key text behind", () => {
    const all = redact(secrets.join("\n"));
    for (const leak of leaks) expect(all).not.toContain(leak);
  });

  // The wrapper's sed writes the record; lib/redact.ts redacts every foreground run and re-reads it.
  // One corpus through both, byte for byte, under a UTF-8 locale like the one Raycast hands down.
  test("the wrapper's sed and lib/redact.ts redact one corpus identically", async () => {
    const corpus = Buffer.concat([
      Buffer.from(
        [
          "api_key\t: tabsep111",
          "token=tabafter222\tnext",
          "Authorization: Bearer bearertab333\tx",
          "Bearer bearernbsp131 tail",
          "api_key=runon444\ntoken=runon555",
          "x-api-key: crlf666\r",
          "Bearer vtab141\vx",
          "api_key=formfeed151\fx",
          "API_KEY=nbsp777 tail",
          `${"x".repeat(100)}_key=longlabel888`,
          '{"auth_token":\t"json999"}',
          "OPENAI_API_KEY = spaced000 rest",
        ].join("\n") + "\n",
      ),
      Buffer.from([0x62, 0x61, 0x64, 0x20, 0xff, 0x0a]), // "bad \xff\n": invalid UTF-8
      Buffer.from("token=afterbadbyte121\n"),
    ]);
    const leaks = ["tabsep111", "tabafter222", "bearertab333", "bearernbsp131", "runon444", "runon555", "crlf666"];
    leaks.push("nbsp777", "longlabel888", "json999", "spaced000", "afterbadbyte121", "vtab141", "formfeed151");
    const s = setup({ LANG: "en_US.UTF-8", LC_ALL: "en_US.UTF-8", FAKE_FABRIC_EXIT: "2" });
    const file = join(s.base, "corpus.txt");
    writeFileSync(file, corpus);
    s.env = { ...s.env, FAKE_FABRIC_STDERR_FILE: file };
    await settled(s.runsDir, (await start(s)).id);
    const onDisk = readFileSync(join(s.runsDir, readdirSync(s.runsDir)[0], "stderr"), "utf8");
    expect(onDisk).toBe(redact(corpus.toString("utf8")));
    for (const leak of leaks) expect(onDisk).not.toContain(leak);
  });

  test("piped text goes through a temp file that is gone once the run ends", async () => {
    const s = setup();
    const meta = await start(s, { input: { kind: "text", text: "secret selection" } });
    await settled(s.runsDir, meta.id);
    expect(existsSync(join(s.runsDir, meta.id, "input.txt"))).toBe(false);
    expect(readFileSync(join(s.base, "fake.log"), "utf8")).toContain("--stdin--\nsecret selection");
  });
});

describe("ISC-2 (wrapper half): no input can run a shell command", () => {
  test("hostile text, URL and file name stay data", async () => {
    const s = setup();
    const pwned = join(s.base, "pwned");
    const evil = `$(touch ${pwned}) \`touch ${pwned}\` ; touch ${pwned}`;
    await settled(s.runsDir, (await start(s, { input: { kind: "text", text: evil } })).id);
    await settled(s.runsDir, (await start(s, { input: { kind: "url", url: `https://x.com/$(touch%20${pwned})` } })).id);
    expect(start(s, {}, "a $(touch x) - b.md")).rejects.toThrow(/bad file name/);
    expect(existsSync(pwned)).toBe(false);
  });
});

describe("ISC-27: a background run never writes the clipboard", () => {
  test("wrapper has no clipboard call", () => {
    expect(wrapperCode()).not.toMatch(/pbcopy|clipboard|pasteboard/i);
  });

  test.skipIf(!existsSync("/usr/bin/pbpaste"))("pbpaste is unchanged across a run", async () => {
    const before = spawnSync("/usr/bin/pbpaste", { encoding: "utf8" }).stdout;
    const s = setup();
    await settled(s.runsDir, (await start(s)).id);
    expect(spawnSync("/usr/bin/pbpaste", { encoding: "utf8" }).stdout).toBe(before);
  });
});

describe("ISC-28: records older than 7 days are pruned; saved answers stay", () => {
  test("prune", async () => {
    const s = setup();
    const old = await start(s);
    const r = await settled(s.runsDir, old.id);
    const fresh = await start(s, {}, "fresh - summarize.md");
    await settled(s.runsDir, fresh.id);
    const metaPath = join(s.runsDir, old.id, "meta.json");
    const m = JSON.parse(readFileSync(metaPath, "utf8"));
    writeFileSync(metaPath, JSON.stringify({ ...m, startedAt: new Date(Date.now() - 8 * 86_400_000).toISOString() }));
    const listed = listRuns(s.runsDir);
    expect(listed.map((x) => x.id)).toEqual([fresh.id]);
    expect(existsSync(join(s.runsDir, old.id))).toBe(false);
    expect(readFileSync(r.output!, "utf8")).toContain("chunk 1");
  });

  test("a running record is never pruned, however old", async () => {
    const s = setup({ FAKE_FABRIC_SLEEP: "20" });
    const meta = await start(s);
    await Bun.sleep(200);
    const metaPath = join(s.runsDir, meta.id, "meta.json");
    writeFileSync(
      metaPath,
      JSON.stringify({ ...meta, startedAt: new Date(Date.now() - 30 * 86_400_000).toISOString() }),
    );
    expect(listRuns(s.runsDir).map((x) => [x.id, x.status])).toEqual([[meta.id, "running"]]);
    expect(existsSync(join(s.runsDir, meta.id, "input.txt"))).toBe(true);
    expect(await stopRun(s.runsDir, meta.id)).toBe("stopped");
    await settled(s.runsDir, meta.id, 5000);
  });

  test("newest first, and one corrupt record doesn't hide the rest", async () => {
    const s = setup();
    const a = await start(s, {}, "a - summarize.md");
    await settled(s.runsDir, a.id);
    const b = await start(s, {}, "b - summarize.md");
    await settled(s.runsDir, b.id);
    const backdate = (id: string, ms: number) => {
      const p = join(s.runsDir, id, "meta.json");
      writeFileSync(
        p,
        JSON.stringify({ ...JSON.parse(readFileSync(p, "utf8")), startedAt: new Date(Date.now() - ms).toISOString() }),
      );
    };
    backdate(a.id, 1000);
    backdate(b.id, 60_000);
    mkdirSync(join(s.runsDir, "20260101-000000-zzzzzz"), { mode: 0o700 });
    writeFileSync(join(s.runsDir, "20260101-000000-zzzzzz", "meta.json"), "{not json");
    expect(listRuns(s.runsDir).map((x) => x.id)).toEqual([a.id, b.id]);
  });
});

describe("a run killed without its trap (force quit, crash) doesn't stay Running", () => {
  test("SIGKILL the wrapper: the record reads failed with a note, and its input text is deleted", async () => {
    const s = setup({ FAKE_FABRIC_SLEEP: "20" });
    const meta = await start(s);
    await Bun.sleep(200);
    expect(existsSync(join(s.runsDir, meta.id, "input.txt"))).toBe(true);
    process.kill(-meta.pid!, "SIGKILL");
    await Bun.sleep(200);
    const r = readRun(s.runsDir, meta.id)!;
    expect(r.status).toBe("failed");
    expect(r.code).toBeUndefined();
    expect(r.lost).toBe(true);
    // The note is the view's to show; stderr holds only what fabric printed.
    expect(r.stderr).not.toContain(LOST_NOTE);
    listRuns(s.runsDir);
    expect(existsSync(join(s.runsDir, meta.id, "input.txt"))).toBe(false);
    // The list says it ended unreported, so Stop says that too: not finished (fabric may live on),
    // and not that it couldn't stop it.
    expect(await stopRun(s.runsDir, meta.id)).toBe("lost");
  });

  test("after a restart its pid belongs to another live process: still read as lost, by start time", () => {
    const s = setup();
    const id = "20260101-000000-reused";
    const dir = join(s.runsDir, id);
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    writeFileSync(join(dir, "input.txt"), "selected text", { mode: 0o600 });
    const meta = {
      id,
      pattern: "summarize",
      inputLabel: "x",
      startedAt: new Date().toISOString(),
      finalDir: s.out,
      finalName: "a.md",
    };
    // This test process is alive, but it is not the wrapper that started at this time.
    writeFileSync(
      join(dir, "meta.json"),
      JSON.stringify({ ...meta, pid: process.pid, lstart: "Mon Jan  1 00:00:00 2001" }),
    );
    expect(readRun(s.runsDir, id)?.status).toBe("failed");
    listRuns(s.runsDir);
    expect(existsSync(join(dir, "input.txt"))).toBe(false);
    // With no start time recorded, a live pid is trusted: still running.
    writeFileSync(join(dir, "meta.json"), JSON.stringify({ ...meta, pid: process.pid }));
    expect(readRun(s.runsDir, id)?.status).toBe("running");
    // EPERM means the pid exists: a live process we may not signal, with the recorded start time, is still Running.
    const root = spawnSync("/bin/ps", ["-axo", "pid=,user="], { encoding: "utf8" })
      .stdout.split("\n")
      .map((l) => l.trim().split(/\s+/))
      .find(([p, user]) => user === "root" && Number(p) > 1)!;
    const rootLstart = spawnSync("/bin/ps", ["-o", "lstart=", "-p", root[0]], { encoding: "utf8" }).stdout.trim();
    writeFileSync(join(dir, "meta.json"), JSON.stringify({ ...meta, pid: Number(root[0]), lstart: rootLstart }));
    expect(readRun(s.runsDir, id)?.status).toBe("running");
    // pid 1 is launchd, always alive and never ours: a record naming it (or garbage) is lost, not Running.
    for (const pid of [1, 2.5, -7]) {
      writeFileSync(join(dir, "meta.json"), JSON.stringify({ ...meta, pid }));
      expect([pid, readRun(s.runsDir, id)?.status]).toEqual([pid, "failed"]);
    }
  });
});

describe("ISC-8 (background half): a background answer never lands under patterns/", () => {
  test("output folder at, through a symlink to, or a case variant of the patterns root is refused before anything starts", async () => {
    const s = setup();
    const patterns = join(s.base, "patterns");
    mkdirSync(join(patterns, "summarize"), { recursive: true });
    const link = join(s.base, "plink");
    symlinkSync(patterns, link);
    for (const dir of [patterns, join(patterns, "out"), link, patterns.replace("/patterns", "/PATTERNS")]) {
      await expect(
        startBackground({
          runsDir: s.runsDir,
          wrapper: WRAPPER,
          fabricPath: FAKE,
          spec: { input: { kind: "text", text: "hello" }, pattern: "summarize" },
          inputLabel: "Clipboard",
          outputFolder: dir,
          finalName: "a - summarize.md",
          patternsRoot: patterns,
          env: s.env,
        }),
      ).rejects.toThrow(PathError);
    }
    expect(existsSync(s.runsDir)).toBe(false);
    expect(readdirSync(patterns)).toEqual(["summarize"]);
  });
});

describe("ISC-28.1: Stop kills only the run it recorded", () => {
  test("a running run stops, keeps its record, and reads as Stopped", async () => {
    const s = setup({ FAKE_FABRIC_SLEEP: "20" });
    const meta = await start(s);
    await Bun.sleep(200);
    expect(await stopRun(s.runsDir, meta.id)).toBe("stopped");
    const r = await settled(s.runsDir, meta.id, 5000);
    expect(r.status).toBe("stopped");
    // The wrapper writes its exit file and then exits, so it can outlive the record by a moment
    // on a loaded machine (2 of 60 runs under full CPU load): wait for it, bounded.
    const pid = meta.pid;
    if (pid === undefined) throw new Error("the run recorded no wrapper pid");
    for (let i = 0; i < 200 && alive(pid); i++) await Bun.sleep(10);
    expect(alive(pid) ? `wrapper ${pid} still running after Stopped` : "gone").toBe("gone");
    // The selected text goes with the run. This waits for the wrapper to exit, so the EXIT trap alone
    // would pass it; the order (input gone before the exit file) is pinned by the source-order test below.
    expect(existsSync(join(s.runsDir, meta.id, "input.txt"))).toBe(false);
  });

  test("a child of fabric's that ignores SIGTERM is killed before Stop reports Stopped", async () => {
    const pidfile = join(tmp, `stubborn-${n + 1}.pid`);
    const s = setup({ FAKE_FABRIC_SLEEP: "20", FAKE_FABRIC_STUBBORN_PIDFILE: pidfile, FABRIC_BG_GRACE_DS: "3" });
    const meta = await start(s);
    const child = await pidFrom(pidfile);
    try {
      const t0 = Date.now();
      expect(await stopRun(s.runsDir, meta.id)).toBe("stopped");
      expect(alive(child) ? `child ${child} still running when Stop said Stopped` : "gone").toBe("gone");
      // It waited out the 0.3 s grace it was given, not the 2 s default, then SIGKILLed.
      const waited = Date.now() - t0;
      expect(waited).toBeGreaterThanOrEqual(300);
      expect(waited).toBeLessThan(1500);
      expect(readRun(s.runsDir, meta.id)?.status).toBe("stopped");
      expect(existsSync(join(s.runsDir, meta.id, "input.txt"))).toBe(false); // the SIGKILL branch too
    } finally {
      if (alive(child)) process.kill(child, "SIGKILL");
    }
  });

  // ISC-43: the live tests above caught this only under load (3 of 40 runs with every core busy), so
  // the order is pinned in the source: a record with an exit file must already be without its input.
  test("the wrapper removes the input before it writes any exit file", () => {
    const code = wrapperCode();
    const body = code.match(/^finish\(\) \{\n([\s\S]*?)^\}/m)?.[1];
    expect(body === undefined ? "finish() not found" : "found").toBe("found");
    const rm = body!.indexOf('rm -f "$input"');
    const write = body!.indexOf("exit.tmp");
    expect([rm >= 0, write >= 0, rm < write]).toEqual([true, true, true]);
    // finish is the only writer of the exit file.
    expect(code.match(/"\$run_dir\/exit"/g)?.length).toBe(1);
  });

  test("a group that outlasts the wait reads Stopping, then Stopped once it is gone", async () => {
    const pidfile = join(tmp, `stubborn-${n + 1}.pid`);
    const s = setup({ FAKE_FABRIC_SLEEP: "20", FAKE_FABRIC_STUBBORN_PIDFILE: pidfile, FABRIC_BG_GRACE_DS: "10" });
    const meta = await start(s);
    const child = await pidFrom(pidfile);
    try {
      expect(await stopRun(s.runsDir, meta.id, 200)).toBe("stopping");
      expect(readRun(s.runsDir, meta.id)?.status).toBe("running");
      expect((await settled(s.runsDir, meta.id, 5000)).status).toBe("stopped");
      expect(alive(child) ? `child ${child} outlived the record's exit` : "gone").toBe("gone");
    } finally {
      if (alive(child)) process.kill(child, "SIGKILL");
    }
  });

  // revert the `trap '' TERM` after `wait "$job"` → the record reads stopped and stopRun says so.
  test("a Stop after fabric has finished, while the answer is saved and notified, reads Finished", async () => {
    const slowNotifier = join(tmp, `slow-notify-${n + 1}.sh`);
    writeFileSync(slowNotifier, '#!/bin/sh\nsleep 1\nfor a in "$@"; do printf "%s\\n" "$a"; done >> "$NOTIFY_LOG"\n', {
      mode: 0o755,
      flag: "wx",
    });
    const s = setup({ FABRIC_BG_NOTIFIER: slowNotifier });
    const meta = await start(s);
    const dir = join(s.runsDir, meta.id);
    for (let i = 0; i < 300 && !existsSync(join(dir, "output")); i++) await Bun.sleep(10);
    expect(existsSync(join(dir, "output")) ? "saved" : "never saved").toBe("saved");
    expect(existsSync(join(dir, "exit")) ? "already exited" : "still notifying").toBe("still notifying");
    expect(await stopRun(s.runsDir, meta.id)).toBe("finished");
    const r = readRun(s.runsDir, meta.id)!;
    expect([r.status, r.code]).toEqual(["done", 0]);
    expect(readFileSync(r.output!, "utf8")).toBe("chunk 1\nchunk 2\nchunk 3\n");
    expect(readFileSync(join(s.base, "notify.log"), "utf8")).toContain("Done: summarize.");
  });

  test("a finished run is not killed again", async () => {
    const s = setup();
    const meta = await start(s);
    await settled(s.runsDir, meta.id);
    expect(await stopRun(s.runsDir, meta.id)).toBe("finished");
  });

  test("a start-time or command mismatch is refused", async () => {
    const s = setup({ FAKE_FABRIC_SLEEP: "20" });
    const meta = await start(s);
    await Bun.sleep(200);
    const metaPath = join(s.runsDir, meta.id, "meta.json");
    // A recorded start time the pid doesn't have: the list reads it lost (Failed), and Stop agrees
    // without signalling, though a live process holds that pid.
    writeFileSync(metaPath, JSON.stringify({ ...meta, lstart: "Mon Jan  1 00:00:00 2001" }));
    expect(readRun(s.runsDir, meta.id)?.status).toBe("failed");
    expect(await stopRun(s.runsDir, meta.id)).toBe("lost");
    expect(readRun(s.runsDir, meta.id)?.code).toBeUndefined();
    // A live process-group leader that is not our wrapper, with its real start time: only
    // the command check stands between it and a SIGTERM (a kill would succeed here).
    const decoy = spawn("/bin/sleep", ["30"], { detached: true, stdio: "ignore" });
    try {
      const lstart = spawnSync("/bin/ps", ["-o", "lstart=", "-p", String(decoy.pid)], {
        encoding: "utf8",
      }).stdout.trim();
      writeFileSync(metaPath, JSON.stringify({ ...meta, pid: decoy.pid, lstart }));
      expect(await stopRun(s.runsDir, meta.id)).toBe("refused");
      expect(spawnSync("/bin/ps", ["-p", String(decoy.pid)]).status).toBe(0);
    } finally {
      decoy.kill("SIGKILL");
    }
    writeFileSync(metaPath, JSON.stringify(meta));
    expect(await stopRun(s.runsDir, meta.id)).toBe("stopped");
    await settled(s.runsDir, meta.id, 5000);
  });

  test("ids that are not ours are refused", async () => {
    expect(await stopRun(tmp, "../../etc")).toBe("refused");
  });
});

describe("Show Background Runs: status labels and Copy Error Output", () => {
  const rec = (over: Partial<RunRecord>): RunRecord => ({
    id: "20261018-120000-abcdef",
    pattern: "summarize",
    inputLabel: "x",
    startedAt: "2026-10-18T12:00:00.000Z",
    finalDir: "/tmp",
    finalName: "a.md",
    status: "failed",
    lost: false,
    stderr: "boom",
    ...over,
  });

  test("each status has its own label", () => {
    expect(STATUS_LABEL).toEqual({ running: "Running", done: "Done", failed: "Failed", stopped: "Stopped" });
  });

  test("only a failed run with something on stderr offers Copy Error Output", () => {
    expect(canCopyError(rec({}))).toBe(true);
    expect(canCopyError(rec({ stderr: " \n " }))).toBe(false);
    // A lost run copies only what fabric printed; the lost note is the detail pane's, not error output.
    expect(canCopyError(rec({ lost: true, stderr: "partial" }))).toBe(true);
    expect(canCopyError(rec({ lost: true, stderr: "" }))).toBe(false);
    // A finished run's stderr holds only fabric's "Output also written to…" note.
    for (const status of ["done", "running", "stopped"] as const)
      expect([status, canCopyError(rec({ status, stderr: "Output also written to x" }))]).toEqual([status, false]);
  });
});

// The wrapper can exit between stopRun's checks and its signal; the seam plays that race on a
// real, live run, since it can't be timed. Without the re-read, the exit rows read Couldn't stop.
// The seam never signals, so one live run serves every case; it is really stopped at the end.
describe("Stop on a run that ended just before the signal reads its exit", () => {
  let s: ReturnType<typeof setup>;
  let id: string;
  const exitFile = () => join(s.runsDir, id, "exit");
  beforeAll(async () => {
    s = setup({ FAKE_FABRIC_SLEEP: "20" });
    id = (await start(s)).id;
  });
  afterEach(() => rmSync(exitFile(), { force: true }));
  afterAll(async () => expect(await stopRun(s.runsDir, id)).toBe("stopped"));

  for (const [exit, want] of [
    ["0", "finished"],
    ["1", "finished"],
    [String(143), "stopped"],
    [undefined, "refused"],
  ] as const)
    test(`exit ${exit ?? "missing"} → ${want}`, async () => {
      const sent: string[] = [];
      const outcome = await stopRun(s.runsDir, id, 200, (_pgid, sig) => {
        sent.push(sig);
        if (exit !== undefined) writeFileSync(exitFile(), `${exit}\n`);
        return "gone";
      });
      expect([outcome, sent]).toEqual([want, ["SIGTERM"]]);
    });

  // Only "gone" reads the exit file: an exit present at a denied signal still refuses.
  test("denied still refuses, even with an exit file", async () => {
    expect(await stopRun(s.runsDir, id, 200, () => (writeFileSync(exitFile(), "0\n"), "denied"))).toBe("refused");
  });
});

// Streamed background runs, token counts copied before redaction,
// the final-folder re-check, and the widened redaction.
const FIXTURES = join(import.meta.dir, "fixtures");

describe("ISC-68.3 + ISC-69: background runs stream, and their token counts survive the wrapper", () => {
  test("argv carries --stream and --show-metadata; the record holds the last line's counts", async () => {
    const s = setup({ FAKE_FABRIC_METADATA_FILE: join(FIXTURES, "metadata-anthropic.txt") });
    const r = await settled(s.runsDir, (await start(s)).id);
    expect(r.status).toBe("done");
    const argv = loggedArgv(readFileSync(join(s.base, "fake.log"), "utf8"));
    expect(argv).toEqual(expect.arrayContaining(["--stream", "--show-metadata"]));
    expect(r.tokens).toEqual({ input: 10, output: 5, total: 15 });
  });

  test.each(["metadata-de.txt", "metadata-it.txt", "metadata-fr.txt", "metadata-zh.txt"])(
    "%s parses after the wrapper runs",
    async (f) => {
      const s = setup({ LANG: "en_US.UTF-8", LC_ALL: "en_US.UTF-8", FAKE_FABRIC_METADATA_FILE: join(FIXTURES, f) });
      const r = await settled(s.runsDir, (await start(s)).id);
      expect(r.tokens).toEqual({ input: 28, output: 3, total: 31 });
    },
  );

  test("a label the redactor would eat (`Eingabe-Token:`) still parses", async () => {
    const s = setup({ FAKE_FABRIC_METADATA_FILE: join(FIXTURES, "metadata-de-token.txt") });
    const r = await settled(s.runsDir, (await start(s)).id);
    expect(r.stderr).toContain("[REDACTED]"); // the line itself was redacted on its way to disk
    expect(r.tokens).toEqual({ input: 12, output: 4, total: 16 });
  });

  test("no token line: no tokens file, no tokens", async () => {
    const s = setup({ FAKE_FABRIC_METADATA_FILE: "/dev/null" });
    const r = await settled(s.runsDir, (await start(s)).id);
    expect(r.status).toBe("done");
    expect(existsSync(join(s.runsDir, r.id, "tokens"))).toBe(false);
    expect(r.tokens).toBeUndefined();
  });
});

describe("ISC-69.1: the pre-redaction copy holds only the counts", () => {
  // A review's probes: three numbers on a non-token line used to be read as tokens.
  test("a secret's digits or a stray three-number line never become tokens, and never displace real ones", async () => {
    const s = setup();
    const file = join(s.base, "meta.txt");
    writeFileSync(
      file,
      "\n[Metadata] Input: 28 | Output: 3 | Total: 31\n[auth] password: 4417 pin 9921 otp 300118\n[x] api_key=a1b2c3 more\n[warn] retry 1 of 3 after 5s\n",
    );
    s.env.FAKE_FABRIC_METADATA_FILE = file;
    const r = await settled(s.runsDir, (await start(s)).id);
    expect(r.tokens).toEqual({ input: 28, output: 3, total: 31 });
    const record = readFileSync(join(s.runsDir, r.id, "tokens"), "utf8");
    for (const leak of ["4417", "9921", "300118"]) expect(record).not.toContain(leak);
  });

  test("a token-shaped line carrying a key leaves digits only in the tokens file, no key anywhere", async () => {
    const s = setup();
    const file = join(s.base, "meta.txt");
    writeFileSync(
      file,
      "\n[Metadata] sk-liveabcdefghijklmnop Input: 1 | api_key=hunterxyzsecret Output: 2 | Total: 3\n",
    );
    s.env.FAKE_FABRIC_METADATA_FILE = file;
    const r = await settled(s.runsDir, (await start(s)).id);
    expect(readFileSync(join(s.runsDir, r.id, "tokens"), "utf8")).toBe("[tokens] in: 1 | out: 2 | total: 3\n");
    expect(statSync(join(s.runsDir, r.id, "tokens")).mode & 0o777).toBe(0o600);
    for (const f of readdirSync(join(s.runsDir, r.id))) {
      const text = readFileSync(join(s.runsDir, r.id, f), "utf8");
      expect(text).not.toContain("liveabcdefghijklmnop");
      expect(text).not.toContain("hunterxyzsecret");
    }
  });
});

describe("ISC-75: the wrapper re-checks the final folder right before it copies", () => {
  test("a folder swapped for a symlink mid-run is refused; nothing is written through the link", async () => {
    const gate = join(tmp, `gate-${n}`);
    const s = setup({ FAKE_FABRIC_GATE: gate });
    const meta = await start(s);
    const victim = join(s.base, "victim");
    mkdirSync(victim);
    // The run is under way (fabric held at the gate): swap the checked folder for a link elsewhere.
    renameSync(s.out, `${s.out}-moved`);
    symlinkSync(victim, s.out);
    writeFileSync(gate, "");
    const r = await settled(s.runsDir, meta.id);
    expect(r.status).toBe("failed");
    expect(r.code).toBe(74);
    expect(r.stderr).toContain("The Save Folder changed during the run");
    expect(readdirSync(victim)).toEqual([]);
    expect(readdirSync(`${s.out}-moved`)).toEqual([]);
  });

  test("a Save Folder given through a symlink still saves (the re-check compares resolved paths)", async () => {
    const s = setup();
    const real = join(s.base, "real");
    mkdirSync(real);
    const link = join(s.base, "link");
    symlinkSync(real, link);
    const meta = await startBackground({
      runsDir: s.runsDir,
      wrapper: WRAPPER,
      fabricPath: FAKE,
      spec: { input: { kind: "text", text: "hello" }, pattern: "summarize" },
      inputLabel: "Clipboard",
      outputFolder: link,
      finalName: "a - summarize.md",
      patternsRoot: join(s.base, "patterns"),
      env: s.env,
    });
    const r = await settled(s.runsDir, meta.id);
    expect(r.status).toBe("done");
    expect(r.output).toBe(join(realpathSync(real), "a - summarize.md"));
  });

  test("a taken name that is a symlink to /dev/null is skipped, not written through", async () => {
    const s = setup();
    mkdirSync(s.out, { recursive: true });
    symlinkSync("/dev/null", join(s.out, "answer - summarize.md"));
    const r = await settled(s.runsDir, (await start(s)).id);
    expect(r.status).toBe("done");
    expect(r.output).toBe(join(realpathSync(s.out), "answer - summarize-2.md"));
    expect(readFileSync(r.output!, "utf8")).toBe("chunk 1\nchunk 2\nchunk 3\n");
  });

  test("a folder above it swapped for a symlink is refused too", async () => {
    const gate = join(tmp, `gate-${n}`);
    const s = setup({ FAKE_FABRIC_GATE: gate });
    const parent = join(s.base, "parent");
    const out = join(parent, "out");
    mkdirSync(out, { recursive: true });
    const meta = await startBackground({
      runsDir: s.runsDir,
      wrapper: WRAPPER,
      fabricPath: FAKE,
      spec: { input: { kind: "text", text: "hello" }, pattern: "summarize" },
      inputLabel: "Clipboard",
      outputFolder: out,
      finalName: "a - summarize.md",
      patternsRoot: join(s.base, "patterns"),
      env: s.env,
    });
    // Same leaf name, different folder: only a check of the whole resolved path sees it.
    const elsewhere = join(s.base, "elsewhere");
    mkdirSync(join(elsewhere, "out"), { recursive: true });
    renameSync(parent, `${parent}-moved`);
    symlinkSync(elsewhere, parent);
    writeFileSync(gate, "");
    const r = await settled(s.runsDir, meta.id);
    expect(r.code).toBe(74);
    expect(readdirSync(join(elsewhere, "out"))).toEqual([]);
  });

  test("a folder that is gone by the end is refused too", async () => {
    const gate = join(tmp, `gate-${n}`);
    const s = setup({ FAKE_FABRIC_GATE: gate });
    const meta = await start(s);
    rmSync(s.out, { recursive: true });
    writeFileSync(gate, "");
    const r = await settled(s.runsDir, meta.id);
    expect(r.code).toBe(74);
    expect(existsSync(s.out)).toBe(false);
  });
});

describe("ISC-76: redaction covers secret and password, identically in the wrapper and lib/redact.ts", () => {
  test("one corpus through both, byte for byte", async () => {
    const corpus =
      [
        "client_secret=sec111",
        "SPOTIFY_CLIENT_SECRET: sec222",
        "password=pw333",
        'db_password = "pw444"',
        '{"Password":"pw555"}',
        "secret\t: sec666 tail",
      ].join("\n") + "\n";
    const leaks = ["sec111", "sec222", "pw333", "pw444", "pw555", "sec666"];
    const s = setup({ FAKE_FABRIC_EXIT: "2" });
    const file = join(s.base, "corpus.txt");
    writeFileSync(file, corpus);
    s.env.FAKE_FABRIC_STDERR_FILE = file;
    const r = await settled(s.runsDir, (await start(s)).id);
    const onDisk = readFileSync(join(s.runsDir, r.id, "stderr"), "utf8");
    expect(onDisk).toBe(redact(corpus));
    for (const leak of leaks) expect(onDisk).not.toContain(leak);
  });
});

describe("ISC-72 (background half): a background run's Save Folder refuses the same folders as Save as", () => {
  test("~/.ssh, LaunchAgents and fabric's folder are refused before anything starts", async () => {
    const s = setup();
    const home = join(s.base, "home");
    const refused = refusedFolders(home, join(home, ".config", "fabric"));
    for (const dir of refused) mkdirSync(dir, { recursive: true });
    for (const dir of [...refused, join(refused[1], "sub")])
      await expect(
        startBackground({
          runsDir: s.runsDir,
          wrapper: WRAPPER,
          fabricPath: FAKE,
          spec: { input: { kind: "text", text: "hello" }, pattern: "summarize" },
          inputLabel: "Clipboard",
          outputFolder: dir,
          finalName: "a - summarize.md",
          patternsRoot: join(home, ".config", "fabric", "patterns"),
          refused,
          env: s.env,
        }),
      ).rejects.toThrow(PathError);
    expect(existsSync(s.runsDir)).toBe(false);
    expect(existsSync(join(refused[1], "sub"))).toBe(false);
  });
});
