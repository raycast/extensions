// At the view level: chains in Run Fabric Pattern and Manage Fabric, the
// chain editor, Configure's chain mode, step progress on the Result, and background chain runs.
// Runs go through the strict fake (its --workflow refusals mirror real fabric); background runs
// through the real wrapper.
import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactElement } from "react";
import { fake, resetFake, tmp } from "./raycast-mock";
import { elements, render as mount, typeName, until } from "./render-harness";
import { action, actions, dropdown, field, item, label, lists, loggedArgv, submit, titles } from "./view-helpers";

const FAKE = join(import.meta.dir, "fake-fabric.sh");
const { readText, PATTERNS_DIR } = await import("../lib/loaders");
const { listRuns } = await import("../lib/background");
const Search = (await import("../src/search")).default;
const Browse = (await import("../src/browse")).default;
const { ConfigureRun } = await import("../src/configure");
const { ResultView, modelText } = await import("../src/result");
const { EditChain, SaveChainAs, StepForm } = await import("../src/editors");
const { RUNS_DIR } = await import("../src/background");
const { WORKFLOWS_DIR } = await import("../src/deliver");

const mounted: { unmount: () => void }[] = [];
const render: typeof mount = (fn, props) => {
  const v = mount(fn, props);
  mounted.push(v);
  return v;
};

const ENV = ["FAKE_FABRIC_LOG", "FABRIC_BG_NOTIFIER"] as const;
const saved = Object.fromEntries(ENV.map((k) => [k, process.env[k]]));
let log = "";
beforeEach(() => {
  resetFake();
  fake.prefs = { fabricPath: FAKE, defaultOutput: "clipboard" };
  log = join(tmp, `clog-${Math.random().toString(36).slice(2)}`);
  for (const k of ENV) delete process.env[k];
  process.env.FAKE_FABRIC_LOG = log;
  process.env.FABRIC_BG_NOTIFIER = "/usr/bin/true";
  rmSync(WORKFLOWS_DIR, { recursive: true, force: true });
  mkdirSync(WORKFLOWS_DIR, { recursive: true });
});
afterEach(() => {
  for (const v of mounted.splice(0)) v.unmount();
});
afterAll(() => {
  for (const k of ENV)
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
});

const PATTERNS = ["summarize", "extract_wisdom", "create_5_sentence_summary"];
const searchData = (names = PATTERNS) => ({ patterns: names.map((name) => ({ name, own: false })), sessions: [] });
const chain = (name: string, body: unknown) => {
  const path = join(WORKFLOWS_DIR, name);
  writeFileSync(path, typeof body === "string" ? body : JSON.stringify(body));
  return path;
};
/** A built-in pattern with this system.md, under the test's patterns folder. */
const pattern = (name: string, systemMd: string) => {
  mkdirSync(join(PATTERNS_DIR, name), { recursive: true });
  writeFileSync(join(PATTERNS_DIR, name, "system.md"), systemMd);
};
/** Search over the fixture patterns plus `name`, then ↵ on its row with text selected. */
const runPattern = async (name: string) => {
  fake.promiseData = searchData([...PATTERNS, name]);
  fake.selected = "some text";
  const v = render(Search, undefined as never);
  await action(item(v.tree, `pattern:${name}`), "Run Pattern").onAction();
};
const steps = (...ps: string[]) => ({ steps: ps.map((pattern) => ({ pattern })) });
const argvSent = () => loggedArgv(readText(log));
const lastPushed = () => fake.nav.pushed.at(-1) as ReactElement<Record<string, unknown>>;
const subtitle = (tree: unknown, id: string) => item(tree, id)?.props.subtitle as string | undefined;

describe("ISC-87 / ISC-81 / ISC-86 / ISC-85.1: Search lists chains; a bad file is a refused row that runs nothing", () => {
  test("each invalid file shows its reason, offers no Run, and spawns nothing; dotfiles are not listed", async () => {
    chain("ok.json", steps("summarize", "extract_wisdom"));
    chain("bad.json", "not json");
    chain("arr.json", "[]");
    chain("rep.json", steps("summarize", "summarize"));
    chain("path.json", steps("summarize", "/etc/hosts"));
    chain("nul.json", { steps: [{ pattern: "summarize", input: "a\u0000b" }] });
    chain("notes.yaml", "steps: []");
    chain(".hidden.json", steps("summarize"));
    chain(".ok.json.123.tmp", steps("summarize"));
    fake.promiseData = searchData();
    fake.selected = "some text";
    const v = render(Search, undefined as never);
    expect(item(v.tree, "workflow:ok")).toBeDefined();
    expect(subtitle(v.tree, "workflow:ok")).toBeUndefined();
    const refused = {
      bad: /not valid JSON/,
      arr: /JSON object/,
      rep: /repeats/,
      path: /plain name/,
      nul: /NUL/,
      "notes.yaml": /only \.json/,
    };
    for (const [name, why] of Object.entries(refused)) {
      const row = item(v.tree, `workflow:${name}`);
      expect([name, subtitle(v.tree, `workflow:${name}`)]).toEqual([name, expect.stringMatching(why)]);
      expect([name, titles(row)]).toEqual([name, expect.not.arrayContaining(["Run Chain", "Configure Run"])]);
      for (const a of elements(row).filter((e) => typeName(e) === "Action"))
        await (a.props as { onAction?: () => unknown }).onAction?.();
    }
    expect(
      elements(v.tree).filter((e) => typeName(e) === "List.Item" && /hidden|tmp/.test(String(e.props.id))),
    ).toEqual([]);
    expect(readText(log)).toBeUndefined();
    expect(item(v.tree, "workflow:ok")?.props.accessories).toEqual([]);
  });
});

describe("ISC-79 / ISC-79.3: ↵ on a chain sends --workflow and never --pattern", () => {
  test("Search ↵ runs the chain on the selection; Copy Fabric Command names the chain's file", async () => {
    const path = chain("ok.json", steps("summarize", "extract_wisdom"));
    fake.promiseData = searchData();
    fake.selected = "some text";
    const v = render(Search, undefined as never);
    await action(item(v.tree, "workflow:ok"), "Run Chain").onAction();
    const pushed = lastPushed();
    expect(pushed.props.spec).toMatchObject({ workflow: { name: "ok", path } });
    expect((pushed.props.spec as { pattern?: string }).pattern).toBeUndefined();
    const r = render(ResultView, pushed.props as never);
    await until(() => label(r.tree, "Delivered"));
    expect(argvSent()).toContain(`--workflow=${path}`);
    expect(argvSent().filter((a) => a.startsWith("--pattern"))).toEqual([]);
    const copy = elements(r.tree).find((e) => e.props.title === "Copy Fabric Command")!;
    expect(copy.props.content).toContain(`--workflow=${path}`);
    await until(() => JSON.parse(fake.kv.get("usage.v1") ?? "{}").counts?.["workflow:ok"]);
    expect(JSON.parse(fake.kv.get("usage.v1")!).counts).toEqual({ "workflow:ok": 1 });
  });
});

describe("ISC-88 / ISC-88.1: a missing pattern is refused, not a crash; ↵ re-checks the file", () => {
  test("a chain whose pattern isn't installed is refused, and runnable once it is back", () => {
    chain("two.json", steps("summarize", "extract_wisdom"));
    fake.promiseData = searchData(["summarize"]);
    const v = render(Search, undefined as never);
    expect(subtitle(v.tree, "workflow:two")).toBe("step 2: pattern extract_wisdom isn't installed");
    expect(titles(item(v.tree, "workflow:two"))).not.toContain("Run Chain");
    fake.promiseData = searchData();
    const w = render(Search, undefined as never);
    expect(titles(item(w.tree, "workflow:two"))).toContain("Run Chain");
  });

  test("a file edited to a path after listing is refused at ↵ with zero spawns", async () => {
    chain("ok.json", steps("summarize", "extract_wisdom"));
    fake.promiseData = searchData();
    fake.selected = "some text";
    const v = render(Search, undefined as never);
    const run = action(item(v.tree, "workflow:ok"), "Run Chain");
    chain("ok.json", steps("summarize", "/etc/hosts"));
    await run.onAction();
    expect(fake.toasts.at(-1)).toMatchObject({ style: "failure", title: "Can't run this chain" });
    expect(fake.toasts.at(-1)?.message).toMatch(/plain name/);
    expect(fake.nav.pushed).toEqual([]);
    expect(readText(log)).toBeUndefined();
  });
});

describe("ISC-88.2: ↵ on a chain whose steps need variables opens Configure", () => {
  test("one field per variable across the steps, deduped", async () => {
    pattern("zz_vars", "Write in {{lang}} with {{ tone }}.\n");
    pattern("zz_vars2", "Again {{lang}}, then {{input}}.\n");
    const path = chain("vars.json", steps("zz_vars", "zz_vars2"));
    fake.promiseData = searchData([...PATTERNS, "zz_vars", "zz_vars2"]);
    fake.selected = "some text";
    const v = render(Search, undefined as never);
    await action(item(v.tree, "workflow:vars"), "Run Chain").onAction();
    expect(typeName(lastPushed())).toBe("ConfigureRun");
    expect(lastPushed().props.workflow).toMatchObject({ name: "vars", path });
    expect(readText(log)).toBeUndefined();
    const c = render(ConfigureRun, lastPushed().props as never);
    const varFields = elements(c.tree)
      .map((e) => e.props.id as string)
      .filter((id) => id?.startsWith("var:"));
    expect(varFields).toEqual(["var:lang", "var:tone"]);
  });
});

describe("↵ on a pattern whose system.md needs variables opens Configure, as a chain does", () => {
  test("Run Pattern pushes ConfigureRun with the pattern and its pin, and spawns nothing", async () => {
    pattern("zz_pvars", "Translate into {{lang_code}}.\n");
    fake.kv.set("models.v1", JSON.stringify({ pins: { zz_pvars: { vendor: "Ollama", model: "llama3.2:1b" } } }));
    await runPattern("zz_pvars");
    expect(typeName(lastPushed())).toBe("ConfigureRun");
    expect(lastPushed().props).toMatchObject({
      pattern: "zz_pvars",
      pinned: { vendor: "Ollama", model: "llama3.2:1b" },
    });
    expect(readText(log)).toBeUndefined();
  });

  test("a pattern with only {{input}} still runs straight away", async () => {
    pattern("zz_novars", "Summarize {{input}}.\n");
    await runPattern("zz_novars");
    expect(typeName(lastPushed())).not.toBe("ConfigureRun");
    expect(lastPushed().props.spec).toMatchObject({ pattern: "zz_novars" });
  });
});

describe("ISC-83.1 / ISC-79.2: Configure for a chain has no Session field and sends the form's model", () => {
  test("no session field even under Advanced; the run sends --workflow, --model and --vendor, no --session", async () => {
    const path = chain("ok.json", steps("summarize", "extract_wisdom"));
    const v = render(ConfigureRun, {
      workflow: { name: "ok", path, steps: steps("summarize", "extract_wisdom").steps },
      resolved: { source: "clipboard", text: "hello" },
      onRun: () => {},
    } as never);
    field(v.tree, "advanced").onChange(true);
    expect(elements(v.tree).some((e) => e.props.id === "session")).toBe(false);
    const model = elements(v.tree).find((e) => e.props.id === "model")!;
    expect(model.props.info).toMatch(/a step's model wins/);
    field(v.tree, "model").onChange("Ollama|llama3.2:1b");
    await submit(v.tree).onSubmit();
    const spec = lastPushed().props.spec as Record<string, unknown>;
    expect(spec.session).toBeUndefined();
    expect(spec.workflow).toEqual({ name: "ok", path, steps: steps("summarize", "extract_wisdom").steps });
    const r = render(ResultView, lastPushed().props as never);
    await until(() => label(r.tree, "Delivered"));
    expect(argvSent()).toEqual(
      expect.arrayContaining([`--workflow=${path}`, "--model=llama3.2:1b", "--vendor=Ollama"]),
    );
    expect(argvSent().filter((a) => a.startsWith("--session") || a.startsWith("--pattern"))).toEqual([]);
    expect(label(r.tree, "Chain")).toBe("ok: summarize → extract_wisdom");
    expect(label(r.tree, "Model")).toBe("llama3.2:1b (Ollama)");
    // The preview note is for a chain's preview only, never a real run.
    expect(elements(r.tree)[0]?.props.markdown as string).not.toContain("previews a chain");
    expect(label(r.tree, "Tokens (last step)")).toBe("28 in · 3 out · 31 total");
    expect(elements(r.tree).some((e) => e.props.title === "Pin Model…")).toBe(false);
  });
});

describe("ISC-82: a running chain shows its step in the title", () => {
  test("Step 2/3 then 3/3; a label that isn't a plain name shows no pattern", async () => {
    const script = join(tmp, "steps.sh");
    writeFileSync(
      script,
      [
        "#!/bin/sh",
        "cat > /dev/null",
        "echo '[step 1/3 summarize] running...' >&2; sleep 0.3",
        "echo '[step 2/3 extract_wisdom] running...' >&2; sleep 0.3",
        "echo '[step 3/3 ../x] running...' >&2; sleep 0.3",
        "echo answer",
      ].join("\n"),
    );
    chmodSync(script, 0o755);
    const v = render(ResultView, {
      fabricPath: script,
      spec: {
        input: { kind: "text", text: "hi" },
        workflow: { name: "three", path: "/tmp/three.json", steps: steps("summarize", "extract_wisdom", "x").steps },
      },
      inputLabel: "Clipboard",
      output: "clipboard",
    } as never);
    const title = () => elements(v.tree)[0]?.props.navigationTitle as string;
    const md = () => elements(v.tree)[0]?.props.markdown as string;
    await until(() => title().includes("Step 2/3"), 400);
    expect(title()).toMatch(/^three · Step 2\/3 extract_wisdom · Running/);
    expect(md()).toBe("_Step 2/3 extract_wisdom running…_");
    await until(() => title().includes("Step 3/3"), 400);
    expect(title()).toMatch(/^three · Step 3\/3 · Running/);
    expect(title()).not.toContain("../x");
  });
});

describe("ISC-79.1: a background chain run sends --workflow and --output, and names the chain", () => {
  test("argv, record and notification", async () => {
    const path = chain("bgchain.json", steps("summarize", "extract_wisdom"));
    const folder = join(tmp, "chain-folder");
    mkdirSync(folder, { recursive: true });
    const notes = join(tmp, `notes-${Math.random().toString(36).slice(2)}`);
    const notifier = join(tmp, "notifier.sh");
    writeFileSync(notifier, `#!/bin/sh\nfor a in "$@"; do last="$a"; done\nprintf '%s\\n' "$last" >> "${notes}"\n`);
    chmodSync(notifier, 0o755);
    process.env.FABRIC_BG_NOTIFIER = notifier;
    fake.prefs = { ...fake.prefs, saveFolder: folder };
    const v = render(ConfigureRun, {
      workflow: { name: "bgchain", path, steps: steps("summarize", "extract_wisdom").steps },
      resolved: { source: "clipboard", text: "hello" },
      onRun: () => {},
    } as never);
    field(v.tree, "background").onChange(true);
    await submit(v.tree).onSubmit();
    const real = realpathSync(folder);
    await until(() => listRuns(RUNS_DIR).some((r) => r.status === "done" && r.output?.startsWith(`${real}/`)), 1000);
    const run = listRuns(RUNS_DIR).find((r) => r.output?.startsWith(`${real}/`))!;
    try {
      expect(run.pattern).toBe("bgchain");
      expect(readdirSync(folder)[0]).toMatch(/ - bgchain - /);
      expect(argvSent()).toContain(`--workflow=${path}`);
      expect(argvSent().some((a) => a.startsWith("--output="))).toBe(true);
      expect(argvSent().filter((a) => a.startsWith("--pattern"))).toEqual([]);
      await until(() => existsSync(notes), 400);
      expect(readText(notes)).toBe("Done: bgchain. Saved to your Save Folder.\n");
    } finally {
      rmSync(join(RUNS_DIR, run.id), { recursive: true, force: true });
    }
  });
});

describe("ISC-84.2: a pinned chain whose file is gone shows a gone row", () => {
  test("Search shows it in Pinned with an Unpin action", async () => {
    chain("here.json", steps("summarize"));
    fake.kv.set("usage.v1", JSON.stringify({ pins: ["workflow:gone", "workflow:here"], counts: {} }));
    fake.promiseData = searchData();
    const v = render(Search, undefined as never);
    await until(() => item(v.tree, "workflow:gone"));
    expect(subtitle(v.tree, "workflow:gone")).toBe("Pinned chain is gone");
    expect(titles(item(v.tree, "workflow:gone"))).toEqual(["Unpin"]);
    expect(item(v.tree, "workflow:here")).toBeDefined();
    expect(subtitle(v.tree, "workflow:here")).toBeUndefined();
  });
});

describe("ISC-81.1: the chain editor refuses a repeat and writes nothing", () => {
  test("Save chain as… puts the reason on Name, and no file lands", async () => {
    fake.promiseData = PATTERNS;
    const v = render(SaveChainAs, {
      steps: steps("summarize", "summarize").steps,
      installed: new Set(PATTERNS),
      onSaved: () => {},
    } as never);
    field(v.tree, "name").onChange("rep");
    await submit(v.tree).onSubmit();
    expect(field(v.tree, "name") as unknown).toMatchObject({ error: expect.stringMatching(/repeats/) });
    expect(readdirSync(WORKFLOWS_DIR)).toEqual([]);
  });

  test("a good chain saves, moves its pin on rename, and the editor lists its steps", async () => {
    fake.kv.set("usage.v1", JSON.stringify({ pins: ["workflow:old"], counts: { "workflow:old": 2 } }));
    chain("old.json", steps("summarize", "extract_wisdom"));
    let savedAs = "";
    const v = render(SaveChainAs, {
      steps: steps("summarize", "extract_wisdom").steps,
      installed: new Set(PATTERNS),
      previousName: "old",
      onSaved: (n: string) => (savedAs = n),
    } as never);
    expect(field(v.tree, "name").value).toBe("old");
    field(v.tree, "name").onChange("renamed");
    await submit(v.tree).onSubmit();
    expect(readdirSync(WORKFLOWS_DIR)).toEqual(["renamed.json"]);
    expect(savedAs).toBe("renamed");
    expect(JSON.parse(fake.kv.get("usage.v1")!)).toEqual({
      pins: ["workflow:renamed"],
      counts: { "workflow:renamed": 2 },
    });

    fake.promiseData = PATTERNS;
    const e = render(EditChain, { name: "renamed" } as never);
    const rows = elements(e.tree).filter((x) => typeName(x) === "List.Item");
    expect(rows.map((r) => r.props.title)).toEqual(["summarize", "extract_wisdom"]);
    expect(titles(e.tree)).toEqual(expect.arrayContaining(["Add Step", "Edit Step", "Remove Step", "Save Chain"]));
  });
});

describe("Manage Fabric's Chains view", () => {
  test("lists chains; a refused one carries a tag and offers only Edit, Open and Delete", () => {
    chain("ok.json", steps("summarize", "summarize_b"));
    chain("bad.json", "not json");
    fake.promiseData = lists({
      pattern: ["summarize", "summarize_b"].map((name) => ({
        id: `pattern:${name}`,
        name,
        type: "pattern",
        own: false,
      })),
    });
    const v = render(Browse, undefined as never);
    dropdown(v.tree).onChange("workflow");
    expect(titles(item(v.tree, "workflow:ok"))).toEqual(expect.arrayContaining(["View", "Configure Run", "Edit"]));
    const bad = item(v.tree, "workflow:bad")!;
    const tags = (bad.props.accessories as { tag?: { value?: string } }[]).map((a) => a.tag?.value).filter(Boolean);
    expect(tags).toEqual(["refused"]);
    expect(bad.props.subtitle).toBe("not valid JSON");
    expect(item(v.tree, "workflow:ok")?.props.subtitle).toBe("2 steps");
    expect(titles(bad).filter((t) => ["View", "Configure Run", "Edit", "Delete"].includes(t))).toEqual([
      "Edit",
      "Delete",
    ]);
    expect(elements(bad).some((e) => typeName(e) === "OpenInEditor")).toBe(true);
  });
});

describe("every route to a chain run re-checks the file", () => {
  const rewriteToPath = () => chain("ok.json", steps("summarize", "/etc/hosts"));

  test("Configure's Run refuses a chain edited after the form opened, with zero spawns", async () => {
    const path = chain("ok.json", steps("summarize", "extract_wisdom"));
    const v = render(ConfigureRun, {
      workflow: { name: "ok", path, steps: steps("summarize", "extract_wisdom").steps },
      resolved: { source: "clipboard", text: "hello" },
      onRun: () => {},
    } as never);
    rewriteToPath();
    await submit(v.tree).onSubmit();
    expect(fake.toasts.at(-1)).toMatchObject({ style: "failure", title: "Can't run this chain" });
    expect(fake.nav.pushed).toEqual([]);
    expect(readText(log)).toBeUndefined();
  });

  test("a chain whose steps changed (still valid) is refused too: the form's variables may be stale", async () => {
    const path = chain("ok.json", steps("summarize", "extract_wisdom"));
    const v = render(ConfigureRun, {
      workflow: { name: "ok", path, steps: steps("summarize", "extract_wisdom").steps },
      resolved: { source: "clipboard", text: "hello" },
      onRun: () => {},
    } as never);
    chain("ok.json", steps("summarize", "translate"));
    await submit(v.tree).onSubmit();
    expect(fake.toasts.at(-1)?.message).toMatch(/changed since/);
    expect(readText(log)).toBeUndefined();
  });

  test("Search's ⌘↵ re-checks; so does ↵ for a pattern that is no longer installed", async () => {
    chain("ok.json", steps("summarize", "extract_wisdom"));
    fake.promiseData = searchData();
    fake.selected = "some text";
    const v = render(Search, undefined as never);
    const configure = action(item(v.tree, "workflow:ok"), "Configure Run");
    const run = action(item(v.tree, "workflow:ok"), "Run Chain");
    rewriteToPath();
    await configure.onAction();
    expect(fake.nav.pushed).toEqual([]);
    chain("ok.json", steps("summarize", "nope_xyz"));
    await run.onAction();
    expect(fake.toasts.at(-1)?.message).toBe("step 2: pattern nope_xyz isn't installed");
    expect(fake.nav.pushed).toEqual([]);
    expect(readText(log)).toBeUndefined();
  });

  test("Manage Fabric's Configure Run re-checks the chain's own file", async () => {
    const path = chain("ok.json", steps("summarize", "extract_wisdom"));
    fake.promiseData = lists({
      pattern: PATTERNS.map((name) => ({ id: `pattern:${name}`, name, type: "pattern", own: false })),
      workflow: [{ id: "workflow:ok", name: "ok", path, type: "workflow", own: true }],
    });
    const v = render(Browse, undefined as never);
    dropdown(v.tree).onChange("workflow");
    rewriteToPath();
    await action(item(v.tree, "workflow:ok"), "Configure Run").onAction();
    expect(fake.toasts.at(-1)).toMatchObject({ title: "Can't run this chain" });
    expect(fake.nav.pushed).toEqual([]);
  });
});

describe("Manage Fabric acts on the row's own file", () => {
  test("deleting a refused foo.yaml keeps the chain foo.json; deleting a chain forgets its pin and count", async () => {
    const good = chain("foo.json", steps("summarize"));
    const yaml = chain("foo.yaml", "steps: []");
    fake.kv.set("usage.v1", JSON.stringify({ pins: ["workflow:foo"], counts: { "workflow:foo": 2 } }));
    fake.promiseData = lists({
      workflow: [
        { id: "workflow:foo", name: "foo", path: good, type: "workflow", own: true },
        { id: "workflow:foo.yaml", name: "foo.yaml", path: yaml, type: "workflow", own: true, refused: "x" },
      ],
    });
    const v = render(Browse, undefined as never);
    dropdown(v.tree).onChange("workflow");
    await action(item(v.tree, "workflow:foo.yaml"), "Delete").onAction();
    await until(() => !existsSync(yaml));
    expect(readdirSync(WORKFLOWS_DIR)).toEqual(["foo.json"]);
    await until(() => !item(v.tree, "workflow:foo.yaml"));
    expect(item(v.tree, "workflow:foo.yaml")).toBeUndefined();
    expect(item(v.tree, "workflow:foo")).toBeDefined();
    await action(item(v.tree, "workflow:foo"), "Delete").onAction();
    await until(() => JSON.parse(fake.kv.get("usage.v1")!).pins.length === 0);
    expect(readdirSync(WORKFLOWS_DIR)).toEqual([]);
    expect(JSON.parse(fake.kv.get("usage.v1")!)).toEqual({ pins: [], counts: {} });
  });
});

describe("Configure sends every spelling; a failed chain toasts its error, not its progress", () => {
  test("ISC-88.2 at submit: each value under every spelling the steps use", async () => {
    pattern("zz_vars", "Write in {{lang}} with {{ tone }}.\n");
    const path = chain("vars.json", steps("zz_vars"));
    const v = render(ConfigureRun, {
      workflow: { name: "vars", path, steps: steps("zz_vars").steps },
      resolved: { source: "clipboard", text: "hello" },
      onRun: () => {},
    } as never);
    field(v.tree, "var:lang").onChange("en");
    field(v.tree, "var:tone").onChange("dry");
    await submit(v.tree).onSubmit();
    expect((lastPushed().props.spec as { variables: unknown }).variables).toEqual({ lang: "en", " tone ": "dry" });
  });

  test("the failure toast skips fabric's step lines", async () => {
    process.env.FAKE_FABRIC_EXIT = "1";
    // A blank line between fabric's progress and the error must not become the message.
    const errFile = join(tmp, "err-401.txt");
    writeFileSync(errFile, "\n401 Unauthorized: bad key\n");
    process.env.FAKE_FABRIC_STDERR_FILE = errFile;
    try {
      const path = chain("ok.json", steps("summarize", "extract_wisdom"));
      const v = render(ResultView, {
        fabricPath: FAKE,
        spec: {
          input: { kind: "text", text: "hi" },
          workflow: { name: "ok", path, steps: steps("summarize", "extract_wisdom").steps },
        },
        inputLabel: "Clipboard",
        output: "clipboard",
      } as never);
      await until(() => fake.toasts.length);
      expect(fake.toasts.at(-1)?.message).toBe("401 Unauthorized: bad key");
      expect(elements(v.tree)[0]?.props.navigationTitle).not.toContain("Step");
    } finally {
      delete process.env.FAKE_FABRIC_EXIT;
      delete process.env.FAKE_FABRIC_STDERR_FILE;
    }
  });

  test("a finished chain's Save as… names the chain", async () => {
    const path = chain("ok.json", steps("summarize", "extract_wisdom"));
    const v = render(ResultView, {
      fabricPath: FAKE,
      spec: {
        input: { kind: "text", text: "hi" },
        workflow: { name: "ok", path, steps: steps("summarize", "extract_wisdom").steps },
      },
      inputLabel: "Clipboard",
      output: "clipboard",
    } as never);
    await until(() => label(v.tree, "Delivered"));
    action(v.tree, "Save as…").onAction();
    expect(lastPushed().props.defaultName).toMatch(/ - ok - /);
  });
});

describe("the chain editor", () => {
  test("Add Step and Save Chain wait for the pattern list", () => {
    chain("two.json", steps("summarize", "extract_wisdom"));
    fake.promiseData = undefined;
    for (const props of [{}, { name: "two" }]) {
      const v = render(EditChain, props as never);
      expect(titles(v.tree)).not.toContain("Add Step");
      expect(titles(v.tree)).not.toContain("Save Chain");
    }
    fake.promiseData = PATTERNS;
    const ready = render(EditChain, { name: "two" } as never);
    expect(titles(ready.tree)).toEqual(expect.arrayContaining(["Add Step", "Save Chain"]));
  });

  test("a chain file that isn't a chain opens read-only, never blank (Save would overwrite it)", () => {
    chain("broken.json", "not json");
    fake.promiseData = PATTERNS;
    const v = render(EditChain, { name: "broken" } as never);
    expect(typeName(elements(v.tree)[0])).toBe("Detail");
    expect(titles(v.tree)).not.toContain("Save Chain");
  });

  test("StepForm keeps a step's variables, and drops them when the pattern changes", async () => {
    const got: unknown[] = [];
    const step = { pattern: "translate", variables: { lang_code: "fr" }, model: "m1" };
    const v = render(StepForm, { step, patterns: PATTERNS, onSubmit: (s: unknown) => got.push(s) } as never);
    await submit(v.tree).onSubmit();
    expect(got.at(-1)).toEqual(step);
    field(v.tree, "pattern").onChange("summarize");
    await submit(v.tree).onSubmit();
    expect(got.at(-1)).toEqual({ pattern: "summarize", model: "m1" });
  });
});

describe("a row refused for its file name offers no Edit", () => {
  test("foo.yaml offers Open in Editor and Delete, never Edit (the editor reads and saves <name>.json)", () => {
    const yaml = chain("foo.yaml", "steps: []");
    fake.promiseData = lists({
      workflow: [{ id: "workflow:foo.yaml", name: "foo.yaml", path: yaml, type: "workflow", own: true, refused: "x" }],
    });
    const v = render(Browse, undefined as never);
    dropdown(v.tree).onChange("workflow");
    const row = item(v.tree, "workflow:foo.yaml")!;
    expect(titles(row)).not.toContain("Edit");
    expect(titles(row)).toContain("Delete");
  });
});

describe("manual test 2026-10-20: Manage Fabric's chain list", () => {
  const list = (tree: unknown) => elements(tree).find((e) => typeName(e) === "List")!.props;

  test("an empty list's panel leads with a plain New action for its type, holding ⌘N", () => {
    fake.promiseData = lists();
    const v = render(Browse, undefined as never);
    const panel = () => actions(elements(v.tree).find((e) => typeName(e) === "List.EmptyView"));
    const lead = () => ({
      title: panel()[0]?.props.title,
      kind: typeName(panel()[0]!),
      keys:
        (panel()[0]?.props.shortcut as { displayName?: string } | undefined)?.displayName ===
        "Keyboard.Shortcut.Common.New",
    });
    dropdown(v.tree).onChange("workflow");
    expect(lead()).toEqual({ title: "New Chain", kind: "Action", keys: true });
    expect(panel().filter((a) => a.props.shortcut).length).toBe(1);
    (panel()[0]!.props.onAction as () => void)();
    expect(typeName(lastPushed())).toBe("EditChain");
    dropdown(v.tree).onChange("strategy");
    expect(lead()).toEqual({ title: "New Strategy", kind: "Action", keys: true });
    dropdown(v.tree).onChange("mine");
    expect(lead()).toEqual({ title: "New Pattern", kind: "Action", keys: true });
    // No type of its own to make: the submenu leads and keeps ⌘N.
    dropdown(v.tree).onChange("session");
    expect(lead()).toEqual({ title: "New", kind: "ActionPanel.Submenu", keys: true });
    // A list with rows keeps ⌘N on each row's New submenu.
    chain("one.json", steps("summarize"));
    dropdown(v.tree).onChange("workflow");
    const menu = elements(item(v.tree, "workflow:one")).find((e) => typeName(e) === "ActionPanel.Submenu");
    expect((menu?.props.shortcut as { displayName?: string } | undefined)?.displayName).toBe(
      "Keyboard.Shortcut.Common.New",
    );
  });

  test("a dropdown switch never hands Raycast a selected row the new view doesn't have", () => {
    // After a switch to an empty Chains view, ↵, ⌘N, ⌘K and the action button did nothing (re-check,
    // 2026-10-20); likely cause, unconfirmed live: the row selected in the old view was still passed.
    chain("one.json", steps("summarize"));
    fake.promiseData = lists();
    const v = render(Browse, undefined as never);
    // The selection is mirrored without a re-render; the next render (any switch) passes it on.
    (list(v.tree).onSelectionChange as (id: string) => void)("pattern:summarize");
    dropdown(v.tree).onChange("pattern");
    expect(list(v.tree).selectedItemId).toBe("pattern:summarize");
    dropdown(v.tree).onChange("strategy");
    expect(list(v.tree).selectedItemId).toBeUndefined();
    dropdown(v.tree).onChange("pattern");
    expect(list(v.tree).selectedItemId).toBe("pattern:summarize");
  });

  test("deleting the selected last row, or searching, leaves no selected row behind", async () => {
    chain("one.json", steps("summarize"));
    fake.promiseData = lists();
    const v = render(Browse, undefined as never);
    dropdown(v.tree).onChange("workflow");
    (list(v.tree).onSelectionChange as (id: string) => void)("workflow:one");
    dropdown(v.tree).onChange("workflow");
    expect(list(v.tree).selectedItemId).toBe("workflow:one");
    await action(item(v.tree, "workflow:one"), "Delete").onAction();
    await until(() => !item(v.tree, "workflow:one"));
    expect(list(v.tree).selectedItemId).toBeUndefined();

    dropdown(v.tree).onChange("pattern");
    (list(v.tree).onSelectionChange as (id: string) => void)("pattern:summarize");
    dropdown(v.tree).onChange("pattern");
    expect(list(v.tree).selectedItemId).toBe("pattern:summarize");
    (list(v.tree).onSearchTextChange as (t: string) => void)("zzz");
    expect(list(v.tree).selectedItemId).toBeUndefined();
  });

  test("chains are re-read from disk each time the view is shown", () => {
    chain("ok.json", steps("summarize"));
    fake.promiseData = lists();
    const v = render(Browse, undefined as never);
    dropdown(v.tree).onChange("workflow");
    expect(item(v.tree, "workflow:ok")?.props.subtitle).toBe("1 step");
    chain("ok.json", steps("summarize", "/etc/hosts"));
    dropdown(v.tree).onChange("pattern");
    dropdown(v.tree).onChange("workflow");
    expect(item(v.tree, "workflow:ok")?.props.subtitle).toMatch(/plain name/);
  });

  test("a save clears the search, so the saved row isn't hidden behind it", () => {
    fake.promiseData = lists();
    const v = render(Browse, undefined as never);
    (list(v.tree).onSearchTextChange as (t: string) => void)("summarize");
    expect(list(v.tree).searchText).toBe("summarize");
    dropdown(v.tree).onChange("workflow");
    action(v.tree, "New Chain").onAction();
    (lastPushed().props.onSaved as (n: string) => void)("copy-chain");
    expect(list(v.tree).searchText).toBe("");
    // Controlled search turns Raycast's own filtering off unless it is asked for.
    expect(list(v.tree).filtering).toBe(true);
  });
});

describe("manual test 2026-10-20: what a chain run shows", () => {
  const llama = { model: "llama3.2:1b", vendor: "Ollama" };

  test("Model names the steps' own models; mixed steps are named one by one", () => {
    const spec = (s: { pattern: string; model?: string; vendor?: string }[], model?: string) =>
      ({ input: { kind: "text", text: "hi" }, model, workflow: { name: "c", path: "/tmp/c.json", steps: s } }) as never;
    expect(
      modelText(
        spec([
          { pattern: "summarize", ...llama },
          { pattern: "extract_wisdom", ...llama },
        ]),
      ),
    ).toBe("llama3.2:1b (Ollama)");
    expect(modelText(spec([{ pattern: "summarize", ...llama }, { pattern: "extract_wisdom" }]))).toBe(
      "summarize: llama3.2:1b (Ollama) · extract_wisdom: fabric chooses",
    );
    expect(modelText(spec([{ pattern: "summarize" }, { pattern: "extract_wisdom" }], "gpt-x"))).toBe("gpt-x");
    // The run's model fills only the steps that set none.
    expect(
      modelText(
        spec(
          [
            { pattern: "summarize", ...llama },
            { pattern: "extract_wisdom", ...llama },
          ],
          "gpt-x",
        ),
      ),
    ).toBe("llama3.2:1b (Ollama)");
    expect(modelText(spec([{ pattern: "summarize", ...llama }, { pattern: "extract_wisdom" }], "gpt-x"))).toBe(
      "summarize: llama3.2:1b (Ollama) · extract_wisdom: gpt-x",
    );
  });

  test("Search ↵ and Configure hand the Result the chain's steps", async () => {
    const path = chain("ok.json", { steps: [{ pattern: "summarize", ...llama }, { pattern: "extract_wisdom" }] });
    fake.promiseData = searchData();
    fake.selected = "some text";
    const v = render(Search, undefined as never);
    await action(item(v.tree, "workflow:ok"), "Run Chain").onAction();
    expect((lastPushed().props.spec as { workflow: unknown }).workflow).toEqual({
      name: "ok",
      path,
      steps: [{ pattern: "summarize", ...llama }, { pattern: "extract_wisdom" }],
    });
  });

  test("a chain's Preview names its steps in the title and the Chain row, and says how fabric nests them", async () => {
    const path = chain("ok.json", steps("summarize", "extract_wisdom"));
    const v = render(ResultView, {
      fabricPath: FAKE,
      spec: {
        input: { kind: "text", text: "hi" },
        dryRun: true,
        workflow: { name: "ok", path, steps: steps("summarize", "extract_wisdom").steps },
      },
      inputLabel: "Clipboard",
      output: "clipboard",
    } as never);
    expect(elements(v.tree)[0]?.props.navigationTitle).toBe("ok: summarize → extract_wisdom · Preview Prompt");
    expect(label(v.tree, "Chain")).toBe("ok: summarize → extract_wisdom");
    await until(() => elements(v.tree)[0]?.props.isLoading === false);
    expect(elements(v.tree)[0]?.props.markdown as string).toMatch(/^_fabric previews a chain from its last step/);
  });

  test("Search's chain row carries only the pin and run tag; its steps are in the detail panel", async () => {
    // Search shows a detail panel, so rows are narrow: a merged "2 steps · 3 runs" tag, then a "2 steps"
    // subtitle, each cut the run tag off beside the pin (re-checks, 2026-10-20).
    chain("ok.json", steps("summarize", "extract_wisdom"));
    fake.kv.set("usage.v1", JSON.stringify({ pins: ["workflow:ok"], counts: { "workflow:ok": 3 } }));
    fake.promiseData = searchData();
    const v = render(Search, undefined as never);
    await until(() => JSON.stringify(item(v.tree, "workflow:ok")?.props.accessories).includes("3 runs"));
    expect(item(v.tree, "workflow:ok")?.props.subtitle).toBeUndefined();
    const tags = (item(v.tree, "workflow:ok")?.props.accessories as { tag?: unknown }[]).filter((a) => a.tag);
    expect(tags).toEqual([{ tag: "3 runs" }]);
    const searchList = elements(v.tree).find((e) => typeName(e) === "List")!.props;
    (searchList.onSelectionChange as (id: string) => void)("workflow:ok");
    await until(() => item(v.tree, "workflow:ok")?.props.detail);
    // The harness leaves child components as elements: render the row's detail component on its own.
    const el = item(v.tree, "workflow:ok")!.props.detail as ReactElement;
    const panel = render(el.type as never, el.props as never);
    const detail = elements(panel.tree).find((e) => typeName(e) === "List.Item.Detail");
    expect(detail?.props.markdown as string).toContain("1. summarize\n2. extract_wisdom");
  });
});
