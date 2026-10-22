// At the view level: pinned models, the Vendor and Thinking fields,
// the Models view and Update Patterns, each proven from the strict fake's log where a run is sent.
// Views that load models (Manage Fabric's Models, Pin Model…) get them from the fake's `-L` fixture.
// Each claim here was shown red by reverting the code it covers; a mutation battery
// checked each one.
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactElement } from "react";
import { fake, resetFake, tmp } from "./raycast-mock";
import { elements, render as mount, typeName, until } from "./render-harness";
import { action, actions, dropdown, field, item, lists, loggedArgv, submit } from "./view-helpers";

const FAKE = join(import.meta.dir, "fake-fabric.sh");
const { parseModels, pairKey } = await import("../lib/models");
const { readText } = await import("../lib/loaders");
const Search = (await import("../src/search")).default;
const Browse = (await import("../src/browse")).default;
const { ConfigureRun } = await import("../src/configure");
const { PinModel } = await import("../src/pin-model");
const { ResultView } = await import("../src/result");
const { forgetItem, modelPinFor, movePin, usageStore } = await import("../src/storage");
const { modelText } = await import("../src/result");
const { PROFILES_DIR } = await import("../src/deliver");

const ROWS = parseModels(readFileSync(join(import.meta.dir, "fixtures", "models.txt"), "utf8"));
const VENDORS = ["Anthropic", "ClaudeCode", "Ollama", "OpenAI"];
const HAIKU_CC = { vendor: "ClaudeCode", model: "claude-haiku-4-5" };
const pins = () => (JSON.parse(fake.kv.get("models.v1") ?? '{"pins":{}}') as { pins: Record<string, unknown> }).pins;
const setPins = (p: Record<string, unknown>) => fake.kv.set("models.v1", JSON.stringify({ pins: p }));

// Every view is unmounted in afterEach, which stops its runs, timers and late re-renders.
const mounted: { unmount: () => void }[] = [];
const render: typeof mount = (fn, props) => {
  const v = mount(fn, props);
  mounted.push(v);
  return v;
};

let log = "";
const savedLog = process.env.FAKE_FABRIC_LOG;
beforeEach(() => {
  resetFake();
  fake.prefs = { fabricPath: FAKE, saveFolder: tmp, defaultOutput: "clipboard" };
  log = join(tmp, `log-${Math.random().toString(36).slice(2)}`);
  process.env.FAKE_FABRIC_LOG = log;
});
afterEach(() => {
  for (const v of mounted.splice(0)) v.unmount();
  if (savedLog === undefined) delete process.env.FAKE_FABRIC_LOG;
  else process.env.FAKE_FABRIC_LOG = savedLog;
});

const lastPushed = () => fake.nav.pushed.at(-1) as ReactElement<Record<string, unknown>>;
const isPinnedRow = (tree: unknown, id: string) =>
  (item(tree, id)?.props.accessories as { tooltip?: string }[] | undefined)?.some((a) => a.tooltip === "Pinned");
/** The rows under each List.Section, as `Section|title`. */
const sectionRows = (tree: unknown) =>
  elements(tree)
    .filter((e) => typeName(e) === "List.Section")
    .map((s) => [
      s.props.title,
      elements(s.props.children)
        .filter((e) => typeName(e) === "List.Item")
        .map((i) => `${s.props.title}|${i.props.title}`),
    ]);
const byVendor = (vendors = VENDORS) => vendors.map((v) => [v, ROWS.filter((r) => r.vendor === v).map(pairKey)]);

/**
 * Renders the Result a view pushed, waits for fake fabric's argv in the log and for delivery,
 * then unmounts it so nothing it does lands in a later test.
 */
async function sentArgv(): Promise<string[]> {
  const pushed = lastPushed();
  expect(typeName(pushed)).toBe("ResultView");
  const v = render(ResultView, pushed.props as never);
  await until(() => readText(log)?.includes("--stdin--"));
  await until(() => fake.copied.length > 0);
  v.unmount();
  return loggedArgv(readText(log));
}

const searchData = () => ({ patterns: [{ name: "summarize", description: "Summarize.", own: false }], sessions: [] });
const configureData = () => ({ strategies: [], contexts: [], models: ROWS, transcribeModels: [] });
const configure = (props: Record<string, unknown> = {}) =>
  render(ConfigureRun, {
    pattern: "summarize",
    resolved: { source: "clipboard", text: "hello" },
    onRun: () => {},
    ...props,
  } as never);

describe("ISC-59: a pinned model runs on ↵ and fills the form; a Config still wins", () => {
  test("↵ in Run Fabric Pattern sends the pinned model with its vendor", async () => {
    setPins({ summarize: HAIKU_CC });
    fake.promiseData = searchData();
    fake.selected = "some text";
    const v = render(Search, undefined as never);
    await action(v.tree, "Run Pattern").onAction();
    const argv = await sentArgv();
    expect(argv).toContain("--pattern=summarize");
    expect(argv).toContain("--model=claude-haiku-4-5");
    expect(argv).toContain("--vendor=ClaudeCode");
  });

  test("with no pin, ↵ sends no model and no vendor", async () => {
    fake.promiseData = searchData();
    fake.selected = "some text";
    const v = render(Search, undefined as never);
    await action(v.tree, "Run Pattern").onAction();
    const argv = await sentArgv();
    expect(argv.filter((a) => a.startsWith("--model=") || a.startsWith("--vendor="))).toEqual([]);
  });

  test("Configure Run opens with the pin chosen, and Run sends it", async () => {
    setPins({ summarize: HAIKU_CC });
    fake.promiseData = searchData();
    fake.clipboard = "hello";
    const s = render(Search, undefined as never);
    await action(s.tree, "Configure Run").onAction();
    const form = lastPushed();
    expect(form.props.pinned).toEqual(HAIKU_CC);
    s.unmount();
    fake.promiseData = configureData();
    const v = render(ConfigureRun, form.props as never);
    field(v.tree, "advanced").onChange(true);
    expect(field(v.tree, "model").value).toBe("ClaudeCode|claude-haiku-4-5");
    await submit(v.tree).onSubmit();
    const argv = await sentArgv();
    expect(argv).toContain("--model=claude-haiku-4-5");
    expect(argv).toContain("--vendor=ClaudeCode");
  });

  test("a chosen Config's model wins over the pin, and the pin's vendor isn't sent with it", async () => {
    mkdirSync(PROFILES_DIR, { recursive: true });
    writeFileSync(join(PROFILES_DIR, "zz-opus.yaml"), "model: claude-opus-4-5\n");
    fake.promiseData = configureData();
    const v = configure({ pinned: HAIKU_CC });
    field(v.tree, "advanced").onChange(true);
    field(v.tree, "profile").onChange("zz-opus");
    await submit(v.tree).onSubmit();
    const argv = await sentArgv();
    expect(argv).toContain(`--config=${join(PROFILES_DIR, "zz-opus.yaml")}`);
    expect(argv).toContain("--model=claude-opus-4-5");
    expect(argv.filter((a) => a.startsWith("--vendor="))).toEqual([]);
  });

  test("Manage Fabric's Configure Run opens with the pin chosen too", async () => {
    setPins({ summarize: HAIKU_CC });
    fake.promiseData = lists();
    const v = render(Browse, undefined as never);
    await action(v.tree, "Configure Run").onAction();
    expect(lastPushed().props.pinned).toEqual(HAIKU_CC);
  });
});

describe("ISC-58: a vendor alone sends no --vendor= from the form", () => {
  test("Vendor chosen, Model left at fabric's choice", async () => {
    fake.promiseData = configureData();
    const v = configure();
    field(v.tree, "advanced").onChange(true);
    field(v.tree, "vendor").onChange("Anthropic");
    await submit(v.tree).onSubmit();
    const argv = await sentArgv();
    expect(argv.filter((a) => a.startsWith("--vendor=") || a.startsWith("--model="))).toEqual([]);
  });

  test("the pin is an item of the Model dropdown while -L loads, so its value always matches one", () => {
    fake.promiseData = undefined;
    const v = configure({ pinned: HAIKU_CC });
    field(v.tree, "advanced").onChange(true);
    const model = elements(v.tree).find((e) => e.props.id === "model")!;
    expect(model.props.value).toBe("ClaudeCode|claude-haiku-4-5");
    expect(elements(model.props.children).map((e) => e.props.value)).toContain("ClaudeCode|claude-haiku-4-5");
  });

  test("a pin fabric no longer lists is still sent", async () => {
    fake.promiseData = configureData();
    const v = configure({ pinned: { vendor: "Gone", model: "retired-1" } });
    await submit(v.tree).onSubmit();
    const argv = await sentArgv();
    expect(argv).toContain("--model=retired-1");
    expect(argv).toContain("--vendor=Gone");
  });

  test("Any vendor keeps the chosen model", () => {
    fake.promiseData = configureData();
    const v = configure({ pinned: HAIKU_CC });
    field(v.tree, "advanced").onChange(true);
    field(v.tree, "vendor").onChange("ClaudeCode");
    field(v.tree, "vendor").onChange("");
    expect(field(v.tree, "model").value).toBe("ClaudeCode|claude-haiku-4-5");
  });

  test("changing Vendor clears a model from another vendor", () => {
    fake.promiseData = configureData();
    const v = configure({ pinned: HAIKU_CC });
    field(v.tree, "advanced").onChange(true);
    field(v.tree, "vendor").onChange("Anthropic");
    expect(field(v.tree, "model").value).toBe("");
  });
});

describe("ISC-57: Thinking from the form", () => {
  test("a level is sent as --thinking=", async () => {
    fake.promiseData = configureData();
    const v = configure();
    field(v.tree, "advanced").onChange(true);
    field(v.tree, "thinking").onChange("high");
    await submit(v.tree).onSubmit();
    expect(await sentArgv()).toContain("--thinking=high");
  });

  test("a token count is sent; a bad one stops the run on its field", async () => {
    fake.promiseData = configureData();
    const v = configure();
    field(v.tree, "advanced").onChange(true);
    field(v.tree, "thinking").onChange("tokens");
    field(v.tree, "thinkingTokens").onChange("-1");
    await submit(v.tree).onSubmit();
    expect(fake.nav.pushed).toEqual([]);
    expect(fake.toasts.at(-1)).toMatchObject({ title: "Can't run yet", message: "Check Thinking Tokens" });
    field(v.tree, "thinkingTokens").onChange(" 4096 ");
    await submit(v.tree).onSubmit();
    expect(await sentArgv()).toContain("--thinking=4096");
  });

  test("Model default sends no --thinking=", async () => {
    fake.promiseData = configureData();
    const v = configure();
    await submit(v.tree).onSubmit();
    expect((await sentArgv()).filter((a) => a.startsWith("--thinking"))).toEqual([]);
  });
});

describe("ISC-61: vendors and models come from -L", () => {
  test("the Vendor dropdown lists -L's vendors, not --listvendors' 55", () => {
    fake.promiseData = configureData();
    const v = configure();
    field(v.tree, "advanced").onChange(true);
    const vendor = elements(v.tree).find((e) => e.props.id === "vendor")!;
    expect(elements(vendor.props.children).map((e) => e.props.value)).toEqual(["", ...VENDORS]);
  });

  test("the Model dropdown has one section per vendor with every -L row, and narrows to a chosen vendor", () => {
    fake.promiseData = configureData();
    const v = configure();
    field(v.tree, "advanced").onChange(true);
    const sections = () => {
      const model = elements(v.tree).find((e) => e.props.id === "model")!;
      return elements(model.props.children)
        .filter((e) => typeName(e) === "Form.Dropdown.Section")
        .map((s) => [s.props.title, elements(s.props.children).map((i) => i.props.value)]);
    };
    expect(sections()).toEqual(byVendor());
    field(v.tree, "vendor").onChange("Ollama");
    expect(sections()).toEqual(byVendor(["Ollama"]));
  });

  test("Manage Fabric's Models view lists every -L row under its vendor, with Copy Name, loaded only when shown", async () => {
    fake.promiseData = lists();
    const v = render(Browse, undefined as never);
    await Bun.sleep(50);
    expect(readText(log)).toBeUndefined();
    dropdown(v.tree).onChange("model");
    await until(() => sectionRows(v.tree).length);
    expect(readText(log)).toBe("--listmodels\n");
    expect(sectionRows(v.tree)).toEqual(byVendor());
    expect(actions(item(v.tree, "ClaudeCode|claude-haiku-4-5")).map((a) => a.props.title)).toContain("Copy Name");
  });
});

describe("ISC-61.1 / ISC-60: Pin Model stores the pair it was picked under", () => {
  test("Result offers Pin Model…, and picking ClaudeCode's haiku pins ClaudeCode, not Anthropic", async () => {
    const r = render(ResultView, {
      fabricPath: FAKE,
      spec: { pattern: "summarize", input: { kind: "text", text: "x" } },
      inputLabel: "Clipboard",
      output: "clipboard",
    } as never);
    action(r.tree, "Pin Model…").onAction();
    const picker = lastPushed();
    expect(typeName(picker)).toBe("PinModel");
    expect(picker.props).toEqual({ pattern: "summarize" });

    const v = render(PinModel, picker.props as never);
    await until(() => item(v.tree, "ClaudeCode|claude-haiku-4-5"));
    await action(item(v.tree, "ClaudeCode|claude-haiku-4-5"), "Pin Model").onAction();
    expect(pins()).toEqual({ summarize: HAIKU_CC });
    expect(fake.nav.pops).toBe(1);
  });

  test("the picker marks the current pin and Unpin Model removes it", async () => {
    setPins({ summarize: HAIKU_CC });
    const v = render(PinModel, { pattern: "summarize", rows: ROWS } as never);
    await until(() => isPinnedRow(v.tree, "ClaudeCode|claude-haiku-4-5"));
    expect(isPinnedRow(v.tree, "ClaudeCode|claude-haiku-4-5")).toBe(true);
    expect(isPinnedRow(v.tree, "Anthropic|claude-haiku-4-5")).toBe(false);
    await action(v.tree, "Unpin Model").onAction();
    expect(pins()).toEqual({});
  });

  test("Manage Fabric offers Pin Model… on pattern rows only, and hands it the models it loaded", async () => {
    fake.promiseData = lists({ strategy: [{ id: "strategy:cot", name: "cot", type: "strategy", own: false }] });
    const v = render(Browse, undefined as never);
    dropdown(v.tree).onChange("model");
    await until(() => sectionRows(v.tree).length);
    dropdown(v.tree).onChange("pattern");
    action(item(v.tree, "pattern:summarize"), "Pin Model…").onAction();
    expect(lastPushed().props).toEqual({ pattern: "summarize", rows: ROWS });
    dropdown(v.tree).onChange("strategy");
    expect(item(v.tree, "strategy:cot")).toBeDefined();
    expect(actions(item(v.tree, "strategy:cot")).map((a) => a.props.title)).not.toContain("Pin Model…");
  });
});

describe("ISC-84 / ISC-84.1: a chain's pin and run count follow it, and model pins never do", () => {
  const usage = () => JSON.parse(fake.kv.get("usage.v1") ?? "{}") as { pins: string[]; counts: Record<string, number> };

  test("renaming a chain moves its Search pin and run count", async () => {
    fake.kv.set("usage.v1", JSON.stringify({ pins: ["workflow:a"], counts: { "workflow:a": 3 } }));
    await movePin("workflow", "a", "b");
    expect(usage()).toEqual({ pins: ["workflow:b"], counts: { "workflow:b": 3 } });
  });

  test("a chain named like a pattern never writes models.v1 and leaves that pattern's pin", async () => {
    await movePin("workflow", "summarize", "zz-chain");
    expect(fake.kv.get("models.v1")).toBeUndefined();
    setPins({ summarize: HAIKU_CC });
    await movePin("workflow", "summarize", "zz-chain");
    expect(pins()).toEqual({ summarize: HAIKU_CC });
  });

  test("deleting a chain forgets only its own pin and count", async () => {
    setPins({ summarize: HAIKU_CC });
    fake.kv.set(
      "usage.v1",
      JSON.stringify({
        pins: ["workflow:summarize", "pattern:summarize"],
        counts: { "workflow:summarize": 2, "pattern:summarize": 5 },
      }),
    );
    await forgetItem(usageStore(), "workflow", "summarize");
    expect(usage()).toEqual({ pins: ["pattern:summarize"], counts: { "pattern:summarize": 5 } });
    expect(pins()).toEqual({ summarize: HAIKU_CC });
  });
});

describe("ISC-60.1 / ISC-60.2: a model pin follows a rename and goes with a delete", () => {
  test("renaming a pattern moves its model pin (movePin, the editors' one rename path)", async () => {
    setPins({ "zz-a": HAIKU_CC });
    await movePin("pattern", "zz-a", "zz-b");
    expect(pins()).toEqual({ "zz-b": HAIKU_CC });
  });

  test("renaming a strategy never touches model pins", async () => {
    setPins({ "zz-a": HAIKU_CC });
    await movePin("strategy", "zz-a", "zz-b");
    expect(pins()).toEqual({ "zz-a": HAIKU_CC });
  });

  test("deleting a custom pattern that shadows a built-in keeps the pin, which is the built-in's now", async () => {
    const dir = join(tmp, "custom-shadow");
    mkdirSync(join(dir, "zz-shadow"), { recursive: true });
    writeFileSync(join(dir, "zz-shadow", "system.md"), "x\n");
    fake.prefs = { ...fake.prefs, customPatternsFolder: dir };
    setPins({ "zz-shadow": HAIKU_CC });
    fake.promiseData = lists({
      pattern: [{ id: "pattern:zz-shadow", name: "zz-shadow", type: "pattern", own: false }],
      mine: [{ id: "pattern:zz-shadow", name: "zz-shadow", type: "pattern", own: true }],
    });
    const v = render(Browse, undefined as never);
    dropdown(v.tree).onChange("mine");
    await action(v.tree, "Delete").onAction();
    await until(() => fake.toasts.length > 0);
    await Bun.sleep(20);
    expect(fake.toasts.map((t) => t.title)).toEqual(["Deleted zz-shadow"]);
    expect(pins()).toEqual({ "zz-shadow": HAIKU_CC });
  });

  test("deleting a custom pattern drops its model pin, run count and pin", async () => {
    const dir = join(tmp, "custom-del");
    mkdirSync(join(dir, "zz-del"), { recursive: true });
    writeFileSync(join(dir, "zz-del", "system.md"), "x\n");
    fake.prefs = { ...fake.prefs, customPatternsFolder: dir };
    setPins({ "zz-del": HAIKU_CC, summarize: HAIKU_CC });
    fake.kv.set("usage.v1", JSON.stringify({ pins: ["pattern:zz-del"], counts: { "pattern:zz-del": 2 } }));
    fake.promiseData = lists({ mine: [{ id: "pattern:zz-del", name: "zz-del", type: "pattern", own: true }] });
    const v = render(Browse, undefined as never);
    dropdown(v.tree).onChange("mine");
    await action(v.tree, "Delete").onAction();
    await until(() => !pins()["zz-del"]);
    expect(pins()).toEqual({ summarize: HAIKU_CC });
    expect(JSON.parse(fake.kv.get("usage.v1")!)).toEqual({ pins: [], counts: {} });
  });
});

describe("ISC-63: Manage Fabric's Update Patterns", () => {
  test("confirms, runs --updatepatterns through the strict fake, and re-lists", async () => {
    fake.promiseData = lists();
    fake.relist = lists({
      pattern: [
        { id: "pattern:summarize", name: "summarize", type: "pattern", own: false },
        { id: "pattern:zz-new", name: "zz-new", type: "pattern", own: false },
      ],
    });
    const v = render(Browse, undefined as never);
    expect(item(v.tree, "pattern:zz-new")).toBeUndefined();
    await action(v.tree, "Update Patterns").onAction();
    await until(() => item(v.tree, "pattern:zz-new"));
    expect(readText(log)).toBe("--updatepatterns\n");
    expect(item(v.tree, "pattern:zz-new")).toBeDefined();
  });

  test("a failed update shows fabric's error with the path fix, and doesn't re-list", async () => {
    fake.promiseData = lists();
    const relist = lists({ pattern: [{ id: "pattern:zz-new", name: "zz-new", type: "pattern", own: false }] });
    fake.relist = relist;
    process.env.FAKE_FABRIC_EXIT = "1";
    process.env.FAKE_FABRIC_STDERR = "could not reach github.com\nsecond line";
    try {
      const v = render(Browse, undefined as never);
      await action(v.tree, "Update Patterns").onAction();
      await until(() => fake.toasts.some((t) => t.style === "failure"));
      expect(fake.toasts.find((t) => t.style === "failure")).toMatchObject({
        title: "Update failed",
        message: "could not reach github.com\nsecond line",
        primaryAction: { title: "Open Preferences" },
      });
      expect(fake.relist).toBe(relist); // untouched: nothing asked for a re-list
    } finally {
      delete process.env.FAKE_FABRIC_EXIT;
      delete process.env.FAKE_FABRIC_STDERR;
    }
  });

  test("declining the confirm runs nothing", async () => {
    fake.promiseData = lists();
    fake.confirm = false;
    const v = render(Browse, undefined as never);
    await action(v.tree, "Update Patterns").onAction();
    await Bun.sleep(50);
    expect(readText(log)).toBeUndefined();
    expect(fake.toasts).toEqual([]);
  });
});

describe("the Result names the model with its vendor", () => {
  test("a pair shows both; a Config's model shows only the Config's vendor; none says fabric chooses", () => {
    const input = { kind: "text" as const, text: "x" };
    expect(modelText({ input, model: "m", vendor: "V" })).toBe("m (V)");
    expect(modelText({ input, model: "m", vendor: "V", profile: { path: "/p.yaml", model: "pm" } })).toBe("pm");
    expect(modelText({ input })).toBe("fabric chooses");
  });
});

describe("storage failures never stop a run or touch another type's pin", () => {
  test("a pin that can't be read runs unpinned", async () => {
    setPins({ summarize: HAIKU_CC });
    fake.failReads = true;
    expect(await modelPinFor("summarize")).toBeUndefined();
  });

  test("deleting a strategy named like a pattern leaves the pattern's model pin", async () => {
    setPins({ summarize: HAIKU_CC });
    await forgetItem(usageStore(), "strategy", "summarize");
    expect(pins()).toEqual({ summarize: HAIKU_CC });
  });

  test("after a delete, the list stops showing the deleted item's pin before any re-list", async () => {
    const dir = join(tmp, "custom-tack");
    mkdirSync(join(dir, "zz-tack"), { recursive: true });
    writeFileSync(join(dir, "zz-tack", "system.md"), "x\n");
    fake.prefs = { ...fake.prefs, customPatternsFolder: dir };
    fake.kv.set("usage.v1", JSON.stringify({ pins: ["pattern:zz-tack"], counts: {} }));
    fake.promiseData = lists({ mine: [{ id: "pattern:zz-tack", name: "zz-tack", type: "pattern", own: true }] });
    const v = render(Browse, undefined as never);
    dropdown(v.tree).onChange("mine");
    await until(() => isPinnedRow(v.tree, "pattern:zz-tack"));
    expect(isPinnedRow(v.tree, "pattern:zz-tack")).toBe(true);
    await action(v.tree, "Delete").onAction();
    await until(() => !isPinnedRow(v.tree, "pattern:zz-tack"));
    expect(isPinnedRow(v.tree, "pattern:zz-tack")).toBe(false);
  });
});

describe("pattern names that are Object members", () => {
  test("a pattern called constructor has no pin unless one was set, and its own pin works", async () => {
    fake.promiseData = { patterns: [{ name: "constructor", own: true }], sessions: [] };
    fake.selected = "some text";
    const v = render(Search, undefined as never);
    await action(v.tree, "Run Pattern").onAction();
    const argv = await sentArgv();
    expect(argv.filter((a) => a.startsWith("--model=") || a.startsWith("--vendor="))).toEqual([]);
  });

  test("__proto__ and constructor pins load, rename and unpin as ordinary names", async () => {
    // Raw JSON: an object literal's `__proto__:` would set the prototype, not a key.
    const pin = JSON.stringify(HAIKU_CC);
    fake.kv.set("models.v1", `{"pins":{"__proto__":${pin},"constructor":${pin}}}`);
    expect(Object.keys(pins())).toEqual(["__proto__", "constructor"]);
    await movePin("pattern", "__proto__", "zz-x");
    expect(pins()).toEqual({ constructor: HAIKU_CC, "zz-x": HAIKU_CC });
    await movePin("pattern", "constructor", "zz-y");
    // Onto a name with no pin of its own: an inherited `constructor` must not count as one.
    await movePin("pattern", "zz-x", "constructor");
    expect(pins()).toEqual({ constructor: HAIKU_CC, "zz-y": HAIKU_CC });
  });
});

describe("ISC-64: Run Fabric Pattern tags a pattern's pinned model", () => {
  test("the row shows the model; an unpinned row shows none", async () => {
    setPins({ summarize: HAIKU_CC });
    fake.promiseData = {
      patterns: [
        { name: "summarize", own: false },
        { name: "extract_wisdom", own: false },
      ],
      sessions: [],
    };
    const v = render(Search, undefined as never);
    const tag = (id: string) =>
      (item(v.tree, id)?.props.accessories as { tag?: { value?: string } | string }[] | undefined)
        ?.map((a) => (typeof a.tag === "object" ? a.tag.value : undefined))
        .filter(Boolean);
    await until(() => tag("pattern:summarize")?.length);
    expect(tag("pattern:summarize")).toEqual(["claude-haiku-4-5"]);
    expect(tag("pattern:extract_wisdom")).toEqual([]);
  });
});
