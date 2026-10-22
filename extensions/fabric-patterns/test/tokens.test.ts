// At the view level: token counts on the Result view and in Show
// Background Runs, a preview's made-up counts never shown, and Configure's per-run Save Folder.
// Runs go through the strict fake; background runs through the real wrapper.
import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fake, resetFake, tmp } from "./raycast-mock";
import { elements, render as mount, typeName, until } from "./render-harness";
import { field, label, loggedArgv, submit } from "./view-helpers";

const FAKE = join(import.meta.dir, "fake-fabric.sh");
const FIXTURES = join(import.meta.dir, "fixtures");
const { readText } = await import("../lib/loaders");
const { listRuns } = await import("../lib/background");
const { ResultView } = await import("../src/result");
const { ConfigureRun } = await import("../src/configure");
const BackgroundRuns = (await import("../src/background-runs")).default;
const { RUNS_DIR } = await import("../src/background");

const mounted: { unmount: () => void }[] = [];
const render: typeof mount = (fn, props) => {
  const v = mount(fn, props);
  mounted.push(v);
  return v;
};

const ENV = ["FAKE_FABRIC_LOG", "FAKE_FABRIC_METADATA_FILE", "FAKE_FABRIC_STDERR_FILE", "FABRIC_BG_NOTIFIER"] as const;
const saved = Object.fromEntries(ENV.map((k) => [k, process.env[k]]));
let log = "";
beforeEach(() => {
  resetFake();
  fake.prefs = { fabricPath: FAKE, defaultOutput: "clipboard" };
  log = join(tmp, `tlog-${Math.random().toString(36).slice(2)}`);
  for (const k of ENV) delete process.env[k];
  process.env.FAKE_FABRIC_LOG = log;
  process.env.FABRIC_BG_NOTIFIER = "/usr/bin/true"; // no real notifications from background runs
});
afterEach(() => {
  for (const v of mounted.splice(0)) v.unmount();
});
afterAll(() => {
  for (const k of ENV)
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
});

const argvSent = () => loggedArgv(readText(log));

async function runResult(dryRun = false) {
  const v = render(ResultView, {
    fabricPath: FAKE,
    spec: { input: { kind: "text", text: "hi" }, pattern: "summarize", dryRun },
    inputLabel: "Clipboard",
    output: "clipboard",
  });
  // The Detail stops loading once the run is over (a preview's Status never says Running).
  await until(() => elements(v.tree)[0]?.props.isLoading === false);
  await until(() => label(v.tree, "Delivered") || dryRun);
  // The chain preview's note never reaches a pattern's Result.
  expect(elements(v.tree)[0]?.props.markdown as string).not.toContain("previews a chain");
  return v;
}

describe("ISC-67/68: a real run asks for tokens and shows them", () => {
  test("argv carries --stream and --show-metadata; the Tokens row reads the fixture's counts", async () => {
    const v = await runResult();
    expect(argvSent()).toContain("--show-metadata");
    expect(argvSent()).toContain("--stream");
    expect(label(v.tree, "Tokens")).toBe("28 in · 3 out · 31 total");
  });

  test("Anthropic's two lines → the last one", async () => {
    process.env.FAKE_FABRIC_METADATA_FILE = join(FIXTURES, "metadata-anthropic.txt");
    const v = await runResult();
    expect(label(v.tree, "Tokens")).toBe("10 in · 5 out · 15 total");
  });

  test("no token line → no Tokens row at all", async () => {
    process.env.FAKE_FABRIC_METADATA_FILE = "/dev/null";
    const v = await runResult();
    expect(label(v.tree, "Status")).toMatch(/^Done/);
    expect(label(v.tree, "Tokens")).toBeUndefined();
  });

  test("ISC-69 (foreground): a label the redactor would eat still reads as tokens", async () => {
    process.env.FAKE_FABRIC_METADATA_FILE = join(FIXTURES, "metadata-de-token.txt");
    const v = await runResult();
    expect(label(v.tree, "Tokens")).toBe("12 in · 4 out · 16 total");
  });
});

describe("ISC-68.2: a dry run's made-up counts are never shown", () => {
  test("a preview never sends --show-metadata", async () => {
    await runResult(true);
    expect(argvSent()).toContain("--dry-run");
    expect(argvSent()).not.toContain("--show-metadata");
  });

  test("even when fabric prints counts on a preview, no Tokens row renders", async () => {
    process.env.FAKE_FABRIC_STDERR_FILE = join(FIXTURES, "metadata-dry-run.txt");
    const v = await runResult(true);
    expect(label(v.tree, "Tokens")).toBeUndefined();
  });
});

describe("ISC-74 + ISC-68.3: a background run saves into this run's folder and shows its tokens", () => {
  test("Configure's Save Folder wins over Preferences; Show Background Runs shows Tokens", async () => {
    const prefsFolder = join(tmp, "prefs-folder");
    const runFolder = join(tmp, "run-folder");
    mkdirSync(prefsFolder, { recursive: true });
    mkdirSync(runFolder, { recursive: true });
    fake.prefs = { ...fake.prefs, saveFolder: prefsFolder };
    const v = render(ConfigureRun, {
      pattern: "summarize",
      resolved: { source: "clipboard", text: "hello" },
      onRun: () => {},
    } as never);
    expect(elements(v.tree).some((e) => e.props.id === "runFolder")).toBe(false); // only with Run in Background
    field(v.tree, "background").onChange(true);
    expect(field(v.tree, "runFolder").value).toEqual([prefsFolder]);
    field(v.tree, "runFolder").onChange([runFolder]);
    await submit(v.tree).onSubmit();

    // Done once this run's record says so (other files' runs share RUNS_DIR): the answer file exists
    // before the wrapper finishes copying into it.
    const real = realpathSync(runFolder);
    await until(() => listRuns(RUNS_DIR).some((r) => r.status === "done" && r.output?.startsWith(`${real}/`)), 1000);
    expect(readdirSync(prefsFolder)).toEqual([]);
    const [saved] = readdirSync(runFolder);
    expect(readFileSync(join(runFolder, saved), "utf8")).toBe("chunk 1\nchunk 2\nchunk 3\n");
    expect(argvSent()).toEqual(expect.arrayContaining(["--stream", "--show-metadata"]));

    // Its own row: RUNS_DIR is shared, and every background run now reports the fake's 28/3/31.
    const id = listRuns(RUNS_DIR).find((r) => r.output?.startsWith(`${real}/`))!.id;
    try {
      const list = render(BackgroundRuns, {} as never);
      const row = () => elements(list.tree).find((e) => typeName(e) === "List.Item" && e.key === id)?.props.detail;
      await until(() => label(row(), "Tokens"), 400);
      expect(label(row(), "Tokens")).toBe("28 in · 3 out · 31 total");
      expect(label(row(), "Saved to")).toBe(join(real, saved));
    } finally {
      rmSync(join(RUNS_DIR, id), { recursive: true, force: true });
    }
  });

  test("ISC-72 (background route): a Save Folder in fabric's folder never starts a run", async () => {
    const answers = join(tmp, "fabric", "answers");
    const before = listRuns(RUNS_DIR).length;
    const v = render(ConfigureRun, {
      pattern: "summarize",
      resolved: { source: "clipboard", text: "hello" },
      onRun: () => {},
    } as never);
    field(v.tree, "background").onChange(true);
    field(v.tree, "runFolder").onChange([answers]);
    await submit(v.tree).onSubmit();
    expect(fake.toasts.at(-1)?.title).toBe("Couldn't start the run");
    expect(existsSync(answers)).toBe(false);
    expect(listRuns(RUNS_DIR).length).toBe(before);
  });
});

describe("ISC-68: only a run that asked for counts gets them", () => {
  test("a token-shaped stderr line on a run without --show-metadata is not tokens", async () => {
    const { runFabric } = await import("../lib/runner");
    process.env.FAKE_FABRIC_STDERR_FILE = join(FIXTURES, "metadata.txt");
    const without = await runFabric(FAKE, ["--pattern=summarize"]).done;
    expect(without.stderr).toContain("[Metadata]");
    expect(without.tokens).toBeUndefined();
    const asked = await runFabric(FAKE, ["--pattern=summarize", "--stream", "--show-metadata"]).done;
    expect(asked.tokens).toEqual({ input: 28, output: 3, total: 31 });
  });
});
