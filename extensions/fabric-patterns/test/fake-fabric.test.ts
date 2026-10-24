import { afterAll, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ArgvError, buildArgv, type Input, type RunSpec } from "../lib/argv";
import { startBackground } from "../lib/background";
import { readText } from "../lib/loaders";

// The fake is only worth trusting if it refuses what real fabric refuses and answers in
// real fabric's shapes. Every fixture read here was captured from fabric 1.4.518.
const FAKE = join(import.meta.dir, "fake-fabric.sh");
const FIXTURES = join(import.meta.dir, "fixtures");
const fixture = (f: string) => readFileSync(join(FIXTURES, f), "utf8");
const tmp = mkdtempSync(join(tmpdir(), "fake-fabric-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

function fake(args: string[], opts: { stdin?: string; env?: Record<string, string> } = {}) {
  const log = join(tmp, `log-${Math.random().toString(36).slice(2)}`);
  const r = Bun.spawnSync([FAKE, ...args], {
    stdin: new TextEncoder().encode(opts.stdin ?? ""),
    env: { ...process.env, FAKE_FABRIC_LOG: log, ...opts.env },
  });
  return { code: r.exitCode, out: r.stdout.toString(), err: r.stderr.toString(), logged: readText(log) ?? "" };
}

/** The allowlist as the fake declares it: value flags end in `=`. */
function allowlist(): string[] {
  const src = readFileSync(FAKE, "utf8");
  // A second assignment (`ALLOWED="$ALLOWED --x"`) would widen the list past this check.
  expect(src.match(/^\s*ALLOWED=/gm)?.length ?? 0).toBe(1);
  const m = src.match(/^ALLOWED="([^"]*)"/m);
  expect(m === null ? "ALLOWED= line not found in fake-fabric.sh" : "found").toBe("found");
  return m![1].split(/\s+/).filter(Boolean);
}

/** `--name=` for a value flag, the bare flag otherwise: the form ALLOWED lists. */
const key = (arg: string) => (arg.includes("=") ? arg.slice(0, arg.indexOf("=") + 1) : arg);

describe("ISC-54: the fake refuses any flag real fabric wouldn't take from us", () => {
  test.each([["--pattren=summarize"], ["--made-up-flag"], ["-z"], ["--vendr=Ollama"]])(
    "unknown %p exits 1 with real fabric's message and is never logged as a run",
    (bad) => {
      const r = fake(["--pattern=summarize", bad], { stdin: "x" });
      expect(r.code).toBe(1);
      expect(r.err).toBe(`unknown flag \`${bad.replace(/^-+/, "").replace(/=.*$/, "")}'\n`);
      expect(r.logged).toBe("");
      expect(r.out).toBe("");
    },
  );

  // Real fabric refuses these with its own wording (probed on fabric 1.4.518); the fake only promises exit 1, unlogged.
  test.each([["--stream=true"], ["--pattern"], ["-q"]])("%p, a form we never send, exits 1 unlogged", (bad) => {
    const r = fake(["--pattern=summarize", bad], { stdin: "x" });
    expect(r.code).toBe(1);
    expect(r.logged).toBe("");
  });

  test("ISC-54.3: a flag-shaped value can't trigger a branch", () => {
    const taken = join(tmp, "taken.md");
    writeFileSync(taken, "keep");
    const value = `--variable=note:a -L b --stream --output=${taken} --workflow=${join(tmp, "absent.json")}`;
    const r = fake(["--pattern=summarize", value, "--show-metadata"], { stdin: "x" });
    expect(r.code).toBe(0);
    expect(r.out).toBe("chunk 1\nchunk 2\nchunk 3\n");
    expect(r.err).toBe("");
    expect(readFileSync(taken, "utf8")).toBe("keep");
  });

  test("a bare argument is refused: buildArgv never sends one", () => {
    const r = fake(["--pattern=summarize", "hello"], { stdin: "x" });
    expect(r.code).toBe(1);
    expect(r.logged).toBe("");
  });

  test("an accepted run is logged, so the empty-log checks above can fail", () => {
    const r = fake(["--pattern=summarize"], { stdin: "x" });
    expect(r.code).toBe(0);
    expect(r.logged).toBe("--pattern=summarize\n--stdin--\nx\n");
  });

  describe("every argv buildArgv can emit runs through the fake", () => {
    const inputs: Input[] = [
      { kind: "none" },
      { kind: "text", text: "hello" },
      { kind: "youtube", url: "https://youtu.be/abc", timestamps: true, comments: true, metadata: true },
      { kind: "youtube", url: "https://youtu.be/abc" },
      { kind: "url", url: "https://example.com/a" },
      { kind: "image", path: "/tmp/a.png" },
      { kind: "media", path: "/tmp/a.m4a", transcribeModel: "whisper-1" },
      { kind: "spotify", url: "https://open.spotify.com/episode/4rOoJ6Egrf8K2IrywzwOMk" },
    ];
    const specs: RunSpec[] = inputs.flatMap((input, i) => [
      {
        input,
        pattern: "summarize",
        variables: { role: "expert" },
        strategy: "cot",
        context: "c",
        session: "s",
        model: "m",
        vendor: "Ollama",
        thinking: i % 2 ? "high" : "2048",
        search: true,
        showMetadata: true,
        stream: true,
        output: join(tmp, `out-${i}.md`),
      },
      { input, pattern: "summarize", profile: { path: "/tmp/p.yaml", model: "pm", vendor: "Ollama" }, dryRun: true },
    ]);
    // A workflow run: its steps' progress is the only stderr it should get.
    specs.push({
      input: { kind: "text", text: "hello" },
      workflow: { name: "probe2", path: join(FIXTURES, "workflow-2step.json"), steps: [] },
      model: "m",
      vendor: "Ollama",
      profile: { path: "/tmp/p.yaml" },
      dryRun: true,
    });
    const sent = new Set<string>();

    test.each(specs.map((spec) => [spec.input.kind, spec] as const))("%s", (_, spec) => {
      const argv = buildArgv(spec);
      argv.forEach((a) => sent.add(key(a)));
      const r = fake(argv, { stdin: "x" });
      // A streamed run that asks for tokens gets them, as from real fabric; anything else on stderr is a refusal.
      const tokens = argv.includes("--show-metadata") && argv.includes("--stream");
      if (spec.workflow)
        expect(r.err).toMatch(
          /^\[step 1\/2 summarize\] running\.\.\.\n[^]*\[step 2\/2 extract_wisdom\] done \(\d+ chars\)\n$/,
        );
      else expect(r.err).toBe(tokens ? readFileSync(join(FIXTURES, "metadata.txt"), "utf8") : "");
      expect(r.code).toBe(0);
    });

    test("those specs reach every flag argv.ts names", () => {
      // Code lines only: the comments mention `--long=value` and `--config` YAML.
      const code = readFileSync(join(import.meta.dir, "../lib/argv.ts"), "utf8")
        .split("\n")
        .filter((l) => !/^\s*(\/\/|\/?\*)/.test(l))
        .join("\n");
      const named = [...code.matchAll(/["`](--?[A-Za-z][\w-]*=?)/g)].map((m) => m[1]);
      // A flag name built at runtime would hide from this census.
      expect(code.match(/`--?\$\{/g) ?? []).toEqual([]);
      expect(named.length).toBeGreaterThan(15);
      expect([...new Set(named)].filter((f) => !sent.has(f))).toEqual([]);
    });
  });
});

describe("ISC-54.1: every allowlisted flag is a real fabric 1.4.518 flag", () => {
  const help = fixture("help.txt");
  test("the allowlist is non-empty and each entry appears in the captured --help", () => {
    const flags = allowlist();
    expect(flags.length).toBeGreaterThan(20);
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const missing = flags.filter((f) => {
      // A value flag is listed as `--name=`; a boolean one must not be followed by `=`.
      const re = f.endsWith("=") ? new RegExp(`(^|[ ,])${esc(f)}`, "m") : new RegExp(`(^|[ ,])${esc(f)}(,|\\s|$)`, "m");
      return !re.test(help);
    });
    expect(missing).toEqual([]);
  });
});

describe("ISC-55: the fake answers in real fabric's shapes", () => {
  test("-L and --listmodels print the captured model table", () => {
    expect(fake(["-L"]).out).toBe(fixture("models.txt"));
    expect(fake(["--listmodels"]).out).toBe(fixture("models.txt"));
  });

  test("ISC-63: --updatepatterns is logged and answered without a model run", () => {
    const r = fake(["--updatepatterns"], { stdin: "x" });
    expect([r.code, r.err]).toEqual([0, ""]);
    expect(r.logged).toBe("--updatepatterns\n");
    expect(r.out).not.toContain("chunk");
  });

  test("-L --shell-complete-list prints the captured bare names", () => {
    expect(fake(["--listmodels", "--shell-complete-list"]).out).toBe(fixture("models-complete.txt"));
  });

  test("--listvendors prints the captured vendor list, with or without --shell-complete-list", () => {
    expect(fake(["--listvendors"]).out).toBe(fixture("vendors.txt"));
    expect(fake(["--listvendors", "--shell-complete-list"]).out).toBe(fixture("vendors.txt"));
  });

  test("--show-metadata prints the token line on stderr only with --stream", () => {
    const streamed = fake(["--pattern=summarize", "--stream", "--show-metadata"], { stdin: "x" });
    expect(streamed.code).toBe(0);
    expect(streamed.err).toBe(fixture("metadata.txt"));
    expect(streamed.out).toBe("chunk 1\nchunk 2\nchunk 3\n");
    expect(fake(["--pattern=summarize", "--show-metadata"], { stdin: "x" }).err).toBe("");
  });

  test("FAKE_FABRIC_METADATA_FILE swaps in another capture (Anthropic prints two lines)", () => {
    const r = fake(["--pattern=summarize", "--stream", "--show-metadata"], {
      stdin: "x",
      env: { FAKE_FABRIC_METADATA_FILE: join(FIXTURES, "metadata-anthropic.txt") },
    });
    expect(r.err).toBe(fixture("metadata-anthropic.txt"));
  });

  test("a streamed dry run prints real fabric's made-up counts", () => {
    const r = fake(["--pattern=summarize", "--stream", "--dry-run", "--show-metadata"], { stdin: "x" });
    expect(r.err).toBe(fixture("metadata-dry-run.txt"));
  });

  // Only the counts that depend on model output are masked; "[step i/total pattern]" must match exactly.
  test.each([
    ["workflow-2step.json", "workflow-progress.txt"],
    ["workflow-3step.json", "workflow-progress-3step.txt"],
  ])("--workflow=%s prints step progress on stderr in the captured shape", (json, capture) => {
    const sizes = (s: string) =>
      s.replace(/inputLen=\d+/g, "inputLen=N").replace(/done \(\d+ chars\)/g, "done (N chars)");
    const r = fake([`--workflow=${join(FIXTURES, json)}`, "--dry-run"], { stdin: "hello probe" });
    expect(r.code).toBe(0);
    expect(sizes(r.err)).toBe(sizes(fixture(capture)));
  });

  // Real fabric checks every step before running one (probed on fabric 1.4.518; the ISC-78.1 captures).
  const workflowFile = (steps: string[]) => {
    const f = join(tmp, `wf-${Math.random().toString(36).slice(2)}.json`);
    writeFileSync(f, JSON.stringify({ steps: steps.map((pattern) => ({ pattern })) }));
    return f;
  };

  test("a step that repeats the one before it is refused before any step runs", () => {
    const f = workflowFile(["summarize", "summarize"]);
    const r = fake([`--workflow=${f}`, "--dry-run"], { stdin: "hello probe" });
    expect(r.code).toBe(1);
    expect(r.err).toBe(`workflow ${f} is invalid: [step 2/2 summarize] repeats the previous step\n`);
    expect(r.out).toBe("");
  });

  test("a step pattern fabric doesn't have is refused before any step runs", () => {
    const f = workflowFile(["summarize", "nope_xyz_pattern"]);
    const r = fake([`--workflow=${f}`, "--dry-run"], { stdin: "hello probe" });
    expect(r.code).toBe(1);
    // The capture names the temp file it was taken with; only that path differs.
    const capture = fixture("workflow-unknown-pattern.txt");
    expect(r.err).toBe(capture.replace(/^workflow \S+ is invalid/, () => `workflow ${f} is invalid`));
    expect(r.out).toBe("");
  });

  test("the same pattern twice, not in a row, still runs", () => {
    const r = fake([`--workflow=${workflowFile(["summarize", "translate", "summarize"])}`], { stdin: "x" });
    expect(r.code).toBe(0);
    expect(r.err).toContain("[step 3/3 summarize] done");
  });

  // A real start path: background runs build argv after making the run folder and before spawning.
  test("ISC-80: a relative workflow path throws before fabric is started", async () => {
    const start = (path: string, base: string) =>
      startBackground({
        runsDir: join(base, "runs"),
        wrapper: join(import.meta.dir, "..", "assets", "fabric-bg.sh"),
        fabricPath: FAKE,
        spec: { input: { kind: "text", text: "hello" }, workflow: { name: "w", path, steps: [] } },
        inputLabel: "Clipboard",
        outputFolder: join(base, "out"),
        finalName: "answer - w.md",
        patternsRoot: join(base, "patterns"),
        env: { FAKE_FABRIC_LOG: join(base, "fake.log"), FABRIC_BG_NOTIFIER: "/usr/bin/true" },
      });
    for (const path of ["wf.json", "~/x.json"]) {
      const base = mkdtempSync(join(tmp, "isc80-"));
      await expect(start(path, base)).rejects.toThrow(ArgvError);
      await Bun.sleep(200);
      expect(existsSync(join(base, "fake.log"))).toBe(false);
    }
    // Control: the same start with an absolute path does reach the fake, so the absent log above means something.
    const base = mkdtempSync(join(tmp, "isc80-"));
    await start(join(FIXTURES, "workflow-2step.json"), base);
    for (let i = 0; i < 100 && !readText(join(base, "fake.log"))?.includes("--stdin--"); i++) await Bun.sleep(50);
    expect(readText(join(base, "fake.log"))).toStartWith(`--workflow=${join(FIXTURES, "workflow-2step.json")}\n`);
  });

  test("--workflow naming a missing file fails like a bad path", () => {
    const r = fake([`--workflow=${join(tmp, "absent.json")}`], { stdin: "x" });
    expect(r.code).toBe(1);
    expect(r.err).toContain("absent.json");
  });
});
