// Render-level checks for wiring that only shows when a view re-renders:
// ViewSession tracking a rename, Result's "Delivered" label, Search's "Last read", and Stop's toasts.
import { beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactElement, ReactNode } from "react";
import { FAKE_ANTHROPIC_KEY } from "./fake-secrets";
import { fake, resetFake, tmp } from "./raycast-mock";
import { elements, render, settle, typeName, until } from "./render-harness";
import { action, dropdown, field, fixture, label, lists, submit, titles } from "./view-helpers";

// React's hooks and @raycast/api are the preloaded stand-ins (test/preload.ts).

const FAKE = join(import.meta.dir, "fake-fabric.sh");

const { ViewSession, EditStrategy, EditContext, EditProfile, RenameSession } = await import("../src/editors");
const { ResultView, stopToast } = await import("../src/result");
const { Toast } = await import("@raycast/api");
const Search = (await import("../src/search")).default;
const { default: BackgroundRuns, stopFeedback } = await import("../src/background-runs");
const { RUNS_DIR } = await import("../src/background");
const { LOST_NOTE, listRuns } = await import("../lib/background");
const { signalGroup } = await import("../lib/proc");
const { StateList } = await import("../src/states");
const { stateFor } = await import("../lib/states");
const { ConfigureRun } = await import("../src/configure");
const Browse = (await import("../src/browse")).default;
const { EditPattern } = await import("../src/edit-pattern");
const { FABRIC_DIR, PATTERNS_DIR, CUSTOM_DIR, STRATEGIES_DIR, CONTEXTS_DIR, SESSIONS_DIR } =
  await import("../lib/loaders");
const { PROFILES_DIR, errorText } = await import("../src/deliver");
const { parseModels } = await import("../lib/models");

beforeEach(() => {
  resetFake();
  fake.prefs = { fabricPath: FAKE, saveFolder: tmp, defaultOutput: "clipboard" };
});

/** The Detail's markdown: the one element in the tree that carries it. */
const markdown = (tree: unknown) =>
  elements(tree).find((e) => typeof e.props.markdown === "string")?.props.markdown as string | undefined;
/** A custom pattern under tmp with one variable, so the form doesn't depend on what fabric has installed. */
const withVariablePattern = () => {
  const dir = join(tmp, "custom-patterns");
  mkdirSync(join(dir, "zz-var"), { recursive: true });
  writeFileSync(join(dir, "zz-var", "system.md"), "Translate into {{lang_code}}.\n");
  fake.prefs = { ...fake.prefs, customPatternsFolder: dir };
};
/** The run form's Detected row. */
const detected = (tree: unknown) => elements(tree).find((e) => e.props.title === "Detected")!.props.text;

describe("ViewSession tracks a rename", () => {
  test("after Rename saves, the title, Continue and Delete all use the new name", async () => {
    const continued: string[] = [];
    const deleted: string[] = [];
    const v = render(ViewSession, {
      name: "zz-render-old",
      onContinue: (n: string) => continued.push(n),
      onRenamed: () => {},
      onDelete: async (n: string) => (deleted.push(n), false),
    });
    expect((v.tree as ReactElement<{ navigationTitle: string }>).props.navigationTitle).toBe("Session · zz-render-old");

    action(v.tree, "Rename").onAction();
    const form = fake.nav.pushed.at(-1) as ReactElement<{ onSaved: (n: string) => void }>;
    expect(typeName(form)).toBe("RenameSession");
    form.props.onSaved("zz-render-new");

    expect((v.tree as ReactElement<{ navigationTitle: string }>).props.navigationTitle).toBe("Session · zz-render-new");
    action(v.tree, "Continue").onAction();
    await action(v.tree, "Delete").onAction();
    expect({ continued, deleted, pops: fake.nav.pops }).toEqual({
      continued: ["zz-render-new"],
      deleted: ["zz-render-new"],
      pops: 0, // onDelete said it didn't delete, so the view stays
    });
  });

  test("a Delete that happened closes the view", async () => {
    const v = render(ViewSession, {
      name: "zz-render-gone",
      onContinue: () => {},
      onRenamed: () => {},
      onDelete: async () => true,
    });
    await action(v.tree, "Delete").onAction();
    expect(fake.nav.pops).toBe(1);
  });
});

describe('Result shows what delivery did, under "Delivered"', () => {
  const props = {
    fabricPath: FAKE,
    spec: { pattern: "summarize", input: { kind: "text" as const, text: "hello" } },
    inputLabel: "Selected text (TextEdit)",
    output: "clipboard" as const,
  };

  test("a finished run copies the answer and the panel says so", async () => {
    const v = render(ResultView, props);
    expect(label(v.tree, "Delivered")).toBeUndefined();
    await until(() => label(v.tree, "Delivered"));
    expect(label(v.tree, "Delivered")).toBe("Copied to clipboard");
    expect(fake.copied).toEqual(["chunk 1\nchunk 2\nchunk 3\n"]);
    // The mock's Keyboard is a stub, so the constant is checked by name; Raycast's own lint
    // (@raycast/prefer-common-shortcut) is what says Common.Copy is ⇧⌘C.
    const shortcut = (action(v.tree, "Copy Fabric Command") as { shortcut?: { displayName?: string } }).shortcut;
    expect(shortcut?.displayName).toBe("Keyboard.Shortcut.Common.Copy");
    // No two actions on the panel share a shortcut, or one of them is unreachable.
    const taken = elements(v.tree)
      .filter((e) => typeName(e).startsWith("Action"))
      .map((e) => (e.props.shortcut as { displayName?: string } | undefined)?.displayName)
      .filter(Boolean);
    expect(taken.length).toBeGreaterThan(1);
    expect(taken.filter((s, i) => taken.indexOf(s) !== i)).toEqual([]);
    v.unmount();
  });

  test("a delivery that fails says it wasn't delivered", async () => {
    fake.failCopy = true;
    const v = render(ResultView, props);
    await until(() => label(v.tree, "Delivered"));
    expect(label(v.tree, "Delivered")).toBe("Not delivered (see the error)");
    v.unmount();
  });
});

describe('Result\'s Stop shows "Stopping…" only when it signalled', () => {
  test("Stop pressed twice: one Stopping…, then Stopped once the run is over", async () => {
    process.env.FAKE_FABRIC_SLEEP = "20";
    try {
      const v = render(ResultView, {
        fabricPath: FAKE,
        spec: { pattern: "summarize", input: { kind: "text" as const, text: "hello" } },
        inputLabel: "Selected text (TextEdit)",
        output: "clipboard" as const,
      });
      await until(() => elements(v.tree).some((e) => e.props.title === "Stop Run"));
      action(v.tree, "Stop Run").onAction();
      action(v.tree, "Stop Run").onAction();
      const titles = () => fake.toasts.map((t) => t.title);
      await until(() => titles().includes("Stopped"));
      expect(titles()).toEqual(["Stopping…", "Stopped"]);
      // Nothing arrived, so neither the toast nor the view calls anything a partial answer.
      expect(fake.toasts[1].message).toBe("Nothing arrived before the stop.");
      expect(markdown(v.tree)).toBe("**Stopped.** Nothing arrived before the stop.");
      v.unmount();
    } finally {
      delete process.env.FAKE_FABRIC_SLEEP;
    }
  });

  // The toast reads the finished run's text, not the view's state from before the stop.
  test("Stop after some text: the toast and the view both keep the partial answer", async () => {
    process.env.FAKE_FABRIC_CHUNKS = "100";
    process.env.FAKE_FABRIC_DELAY = "0.1";
    try {
      const v = render(ResultView, {
        fabricPath: FAKE,
        spec: { pattern: "summarize", input: { kind: "text" as const, text: "hello" } },
        inputLabel: "Selected text (TextEdit)",
        output: "clipboard" as const,
      });
      await until(() => markdown(v.tree)?.includes("chunk 1"));
      action(v.tree, "Stop Run").onAction();
      const stopped = () => fake.toasts.find((t) => t.title === "Stopped");
      await until(stopped);
      expect(stopped()!.message).toBe("The partial answer stays here.");
      expect(markdown(v.tree)).toMatch(/^chunk 1\n[\s\S]*\n---\n\n\*\*Stopped\.\*\* This is the partial answer\.$/);
      v.unmount();
    } finally {
      delete process.env.FAKE_FABRIC_CHUNKS;
      delete process.env.FAKE_FABRIC_DELAY;
    }
  });

  // EPERM can't be produced on demand, so the first SIGTERM is denied through the seam; later
  // signals are real, which also ends the run.
  test("Stop denied: Couldn't stop it, and a later Stop still tries", async () => {
    process.env.FAKE_FABRIC_SLEEP = "20";
    let denials = 1;
    const sent: string[] = [];
    try {
      const v = render(ResultView, {
        fabricPath: FAKE,
        spec: { pattern: "summarize", input: { kind: "text" as const, text: "hello" } },
        inputLabel: "Selected text (TextEdit)",
        output: "clipboard" as const,
        signalGroup: (pgid: number, sig: NodeJS.Signals) => {
          sent.push(sig);
          return sig === "SIGTERM" && denials-- > 0 ? "denied" : signalGroup(pgid, sig);
        },
      });
      await until(() => elements(v.tree).some((e) => e.props.title === "Stop Run"));
      const titles = () => fake.toasts.map((t) => t.title);
      action(v.tree, "Stop Run").onAction();
      expect(fake.toasts).toEqual([
        {
          style: "failure",
          title: "Couldn't stop it",
          message: "macOS refused the signal (not permitted). The run goes on.",
        },
      ]);
      action(v.tree, "Stop Run").onAction();
      await until(() => titles().includes("Stopped"));
      expect(titles()).toEqual(["Couldn't stop it", "Stopping…", "Stopped"]);
      expect(sent.slice(0, 2)).toEqual(["SIGTERM", "SIGTERM"]);
      v.unmount();
    } finally {
      delete process.env.FAKE_FABRIC_SLEEP;
    }
  });
});

describe('Search\'s "Last read" follows each fresh read', () => {
  test("mount reads the clipboard; a quick run after selecting text shows the selection", async () => {
    fake.promiseData = {
      patterns: [{ name: "summarize", description: "Summarize.", own: false }],
      sessions: [],
    };
    fake.clipboard = "from the clipboard";
    const v = render(Search, undefined as never);
    const list = () =>
      elements(v.tree).find((e) => typeName(e) === "List")!.props as { onSelectionChange: (id: string) => void };
    const lastRead = () =>
      elements(v.tree).find((e) => typeName(e) === "Detail" && "input" in e.props)?.props.input as string | undefined;

    list().onSelectionChange("pattern:summarize");
    await until(() => lastRead() === "Clipboard");
    expect(lastRead()).toBe("Clipboard");

    fake.selected = "now some selected text";
    await action(v.tree, "Run Pattern").onAction();
    expect(lastRead()).toBe("Selected text (TextEdit)");
    expect(typeName(fake.nav.pushed.at(-1)!)).toBe("ResultView");

    // The run is counted under the row's id, and the row shows it once the count is saved.
    const runsTag = () =>
      (
        elements(v.tree).find((e) => typeName(e) === "List.Item" && e.props.id === "pattern:summarize")?.props
          .accessories as { tag?: string }[] | undefined
      )?.find((a) => a.tag?.endsWith(" run"))?.tag;
    await until(() => runsTag());
    expect(runsTag()).toBe("1 run");
  });

  // ISC-41: the sidebar truncates a long value, so Last read holds the source alone, and ↵ names none.
  test("with nothing selected, ↵ is Run Pattern and Last read is just the source", async () => {
    fake.promiseData = {
      patterns: [{ name: "summarize", description: "Summarize.", own: false }],
      sessions: [],
    };
    const v = render(Search, undefined as never);
    (
      elements(v.tree).find((e) => typeName(e) === "List")!.props as { onSelectionChange: (id: string) => void }
    ).onSelectionChange("pattern:summarize");
    const detail = () => elements(v.tree).find((e) => typeName(e) === "Detail" && "input" in e.props);
    await until(() => detail()?.props.input === "Nothing selected");
    const pane = detail()!;
    const inner = (pane.type as (p: unknown) => unknown)(pane.props);
    expect([label(inner, "Last read"), label(inner, "Strategy, Context")]).toEqual([
      "Nothing selected",
      "None (⌘↵ sets)",
    ]);
    expect(titles(v.tree)).toContain("Run Pattern");
    expect(titles(v.tree).filter((t) => /selection|clipboard/i.test(t))).toEqual([]);
  });
});

describe("Stop feedback names every outcome", () => {
  test("Result: stopping spins, denied fails and says the run goes on, over says nothing", () => {
    expect(stopToast("stopping")).toEqual({ style: Toast.Style.Animated, title: "Stopping…" });
    expect(stopToast("denied")).toMatchObject({ style: "failure", title: "Couldn't stop it" });
    expect(stopToast("denied")?.message).toContain("goes on");
    expect(stopToast("over")).toBeUndefined();
  });

  test("background: a spinner shows while stopRun waits, then its outcome replaces it", async () => {
    const TITLE = {
      stopped: "Stopped",
      stopping: "Still stopping. The list shows Stopped once it has ended",
      finished: "It had already finished",
      lost: "It had already ended without reporting back",
      refused: "Couldn't stop it safely",
    };
    for (const outcome of ["stopped", "stopping", "finished", "lost", "refused"] as const) {
      resetFake();
      let resolve!: (o: typeof outcome) => void;
      const done = stopFeedback(new Promise((r) => (resolve = r)));
      await Bun.sleep(0);
      expect(fake.toasts).toEqual([{ style: "animated", title: "Stopping…" }]);
      resolve(outcome);
      expect(await done).toBe(outcome);
      expect(fake.toasts[1]).toEqual({
        style: outcome === "refused" || outcome === "lost" ? "failure" : "success",
        title: TITLE[outcome],
      });
    }
  });

  test("background: a stopRun that throws ends the spinner as refused", async () => {
    expect(await stopFeedback(Promise.reject(new Error("ps vanished")))).toBe("refused");
    expect(fake.toasts).toEqual([
      { style: "animated", title: "Stopping…" },
      { style: "failure", title: "Couldn't stop it safely" },
    ]);
  });

  /** Writes a run record into the list's real runs folder; `files` adds exit, stderr and the like. */
  const record = (id: string, pid: number, files: Record<string, string> = {}) => {
    mkdirSync(join(RUNS_DIR, id), { recursive: true });
    const meta = { id, pattern: "summarize", inputLabel: "Clipboard", startedAt: new Date().toISOString(), pid };
    writeFileSync(join(RUNS_DIR, id, "meta.json"), JSON.stringify({ ...meta, finalDir: tmp, finalName: "a.md" }));
    for (const [name, text] of Object.entries(files)) writeFileSync(join(RUNS_DIR, id, name), text);
    return id;
  };
  const removeRecords = (...ids: string[]) =>
    ids.forEach((id) => rmSync(join(RUNS_DIR, id), { recursive: true, force: true }));

  test("Show Background Runs: a lost run says so; an exited one keeps its code", async () => {
    // pid 1 is never a wrapper of ours, so with no exit file a record is lost.
    // The key is written raw, as a stray write past the wrapper's sed would leave it: readRun redacts.
    const lost = record("20261018-180000-lost01", 1, { stderr: `partial\nkey ${FAKE_ANTHROPIC_KEY}\n` });
    const silent = record("20261018-180030-lost02", 1);
    const exited = record("20261018-180100-exit01", 1, { exit: "1\n", stderr: "HTTP Error 429\n" });
    const quiet = record("20261018-180130-exit02", 1, { exit: "1\n" });
    const ids = [lost, silent, exited, quiet];
    const v = render(BackgroundRuns, undefined as never);
    const body = (id: string) =>
      (
        elements(v.tree).find((e) => typeName(e) === "List.Item" && e.key === id)?.props.detail as
          ReactElement<{ markdown: string }> | undefined
      )?.props.markdown;
    try {
      await until(() => ids.every(body));
      const block = (s: string) => `\n\n\`\`\`\n${s}\n\`\`\``;
      expect(body(lost)).toBe(`## Lost\n\n${LOST_NOTE}${block("partial\nkey sk-[REDACTED]")}`);
      expect(body(silent)).toBe(`## Lost\n\n${LOST_NOTE}`);
      // A heading other than the generic one proves the failure was classified from fabric's stderr.
      expect(body(exited)).toBe(
        `## YouTube is rate-limiting you (exit 1)\n\nYouTube refused the transcript download for now. Try again in a few minutes.${block("HTTP Error 429")}`,
      );
      expect(body(quiet)).toEndWith(block("No error output."));
    } finally {
      v.unmount();
      removeRecords(...ids);
    }
  });

  // A record with no start time is refused before anything is signalled, so this drives the real
  // list's Stop Run (confirm, spinner, outcome) without touching a process.
  test("Show Background Runs: Stop Run confirms, spins, then says what happened", async () => {
    const id = record("20261018-170000-abc123", process.pid); // alive, so the record reads Running
    const v = render(BackgroundRuns, undefined as never);
    try {
      await until(() => elements(v.tree).some((e) => e.props.title === "Stop Run"));
      await action(v.tree, "Stop Run").onAction();
      expect(fake.toasts).toEqual([
        { style: "animated", title: "Stopping…" },
        { style: "failure", title: "Couldn't stop it safely" },
      ]);
    } finally {
      v.unmount(); // clears the list's 2 s refresh even when an expectation fails
      removeRecords(id);
    }
  });
});

describe("Preferences is offered when the path is a suspect", () => {
  test("fabric failed: Copy Fabric Command, Copy Error, then Open Extension Preferences", () => {
    const v = render(StateList, {
      state: stateFor("failed", { error: "fabric exited 1" }),
      handlers: { fabricPath: "/usr/bin/false", command: "/usr/bin/false --listpatterns", error: "fabric exited 1" },
    });
    expect(titles(v.tree)).toEqual(["Copy Fabric Command", "Copy Error", "Open Extension Preferences"]);
  });

  test("a bad key offers no Preferences: fabric ran, so the path is fine", () => {
    const v = render(StateList, {
      state: stateFor("bad-key"),
      // Shaped like production: every classified failure hands over fabric's error.
      handlers: { fabricPath: FAKE, command: `${FAKE} --setup`, error: "401 Unauthorized" },
    });
    expect(titles(v.tree)).toEqual(["Copy Fabric Command", "Copy Error"]);
  });

  test("no patterns: Download Patterns, then Preferences (a binary that prints nothing lands here)", () => {
    const v = render(StateList, { state: stateFor("no-patterns"), handlers: { fabricPath: "/usr/bin/true" } });
    expect(titles(v.tree)).toEqual(["Download Patterns", "Open Extension Preferences"]);
  });

  test("fabric not found offers Preferences once, as its own action", () => {
    const v = render(StateList, { state: stateFor("fabric-missing"), handlers: { fabricPath: "/nope/fabric" } });
    expect(titles(v.tree)).toEqual(["Open Extension Preferences"]);
  });
});

describe("Configure says why Run or Preview did nothing", () => {
  // Revert the toast in spec() and these two fail.
  test("an invalid form shows a failure toast naming the fields, even ones scrolled out of view", () => {
    const v = render(ConfigureRun, { session: "bad name!", resolved: { source: "none" }, onRun: () => {} });
    action(v.tree, "Preview Prompt").onAction();
    expect(fake.toasts).toEqual([{ style: "failure", title: "Can't run yet", message: "Check URL or Text, Session" }]);
    expect(fake.nav.pushed).toEqual([]);
  });

  test("an empty variable is named by its own name, the field the eye test lost above the scroll", () => {
    withVariablePattern();
    const v = render(ConfigureRun, {
      pattern: "zz-var",
      resolved: { source: "clipboard", text: "hello" },
      onRun: () => {},
    });
    action(v.tree, "Preview Prompt").onAction();
    expect(fake.toasts).toEqual([{ style: "failure", title: "Can't run yet", message: "Check lang_code" }]);
  });

  test("a valid form shows no such toast", async () => {
    withVariablePattern();
    const v = render(ConfigureRun, {
      pattern: "zz-var",
      resolved: { source: "clipboard", text: "hello" },
      onRun: () => {},
    });
    (elements(v.tree).find((e) => e.props.id === "var:lang_code")!.props as { onChange: (s: string) => void }).onChange(
      "es",
    );
    action(v.tree, "Preview Prompt").onAction();
    await settle(10);
    expect(fake.toasts.filter((t) => t.title === "Can't run yet")).toEqual([]);
  });
});

describe("A Config's model is a vendor and model pair", () => {
  const file = join(PROFILES_DIR, "zz-vendor.yaml");
  const edit = (yaml = "model: claude-haiku-4-5\nvendor: ClaudeCode\ntemperature: 0.7\n") => {
    writeFileSync(file, yaml);
    return render(EditProfile, { name: "zz-vendor" });
  };
  const save = async (v: { tree: unknown }) => {
    await submit(v.tree).onSubmit();
    return readFileSync(file, "utf8");
  };
  /** The Model dropdown's item values. */
  const models = (tree: unknown) =>
    elements(elements(tree).find((e) => e.props.id === "model"))
      .filter((e) => typeName(e) === "Form.Dropdown.Item")
      .map((e) => e.props.value as string);
  beforeEach(() => {
    mkdirSync(PROFILES_DIR, { recursive: true });
    fake.promiseData = parseModels(fixture("models.txt"));
  });

  test("the Model list holds one item per pair, so a name two vendors share is two items", () => {
    const v = edit();
    expect(field(v.tree, "model").value).toBe("ClaudeCode|claude-haiku-4-5");
    expect(models(v.tree)).toEqual(
      expect.arrayContaining(["Anthropic|claude-haiku-4-5", "ClaudeCode|claude-haiku-4-5"]),
    );
  });

  test("changing only Temperature keeps model and vendor", async () => {
    const v = edit();
    field(v.tree, "temperature").onChange("0.2");
    expect(await save(v)).toBe("model: claude-haiku-4-5\nvendor: ClaudeCode\ntemperature: 0.2\n");
  });

  test("picking the same model under another vendor saves that vendor", async () => {
    const v = edit();
    field(v.tree, "model").onChange("Anthropic|claude-haiku-4-5");
    expect(await save(v)).toBe("model: claude-haiku-4-5\nvendor: Anthropic\ntemperature: 0.7\n");
  });

  test("picking another model under another vendor saves both", async () => {
    const v = edit();
    field(v.tree, "model").onChange("Anthropic|claude-opus-4-5");
    expect(await save(v)).toBe("model: claude-opus-4-5\nvendor: Anthropic\ntemperature: 0.7\n");
  });

  test("Let fabric choose drops the saved model and its vendor", async () => {
    const v = edit();
    field(v.tree, "model").onChange("");
    expect(await save(v)).toBe("temperature: 0.7\n");
  });

  test("a saved pair fabric lists is one item, not two", () => {
    const v = edit();
    expect(models(v.tree).filter((m) => m === "ClaudeCode|claude-haiku-4-5")).toHaveLength(1);
  });

  test("a saved pair fabric doesn't list stays an item and round-trips", async () => {
    const v = edit("model: zz-gone\nvendor: Gone\ntemperature: 0.7\n");
    expect(models(v.tree)).toContain(field(v.tree, "model").value as string);
    field(v.tree, "temperature").onChange("0.2");
    expect(await save(v)).toBe("model: zz-gone\nvendor: Gone\ntemperature: 0.2\n");
  });

  test("a hand-written model with no vendor round-trips with none", async () => {
    const v = edit("model: gpt-4o\ntemperature: 0.7\n");
    expect(models(v.tree)).toContain(field(v.tree, "model").value as string);
    field(v.tree, "temperature").onChange("0.2");
    expect(await save(v)).toBe("model: gpt-4o\ntemperature: 0.2\n");
  });
});

describe("A variable named __proto__ reaches fabric", () => {
  beforeEach(() => {
    const dir = join(tmp, "custom-patterns");
    mkdirSync(join(dir, "zz-proto"), { recursive: true });
    writeFileSync(join(dir, "zz-proto", "system.md"), "Use {{__proto__}} and {{ __proto__ }}.\n");
    mkdirSync(join(dir, "zz-ctor"), { recursive: true });
    writeFileSync(join(dir, "zz-ctor", "system.md"), "Use {{lang}} and {{constructor}}.\n");
    fake.prefs = { ...fake.prefs, customPatternsFolder: dir };
  });
  const form = () =>
    render(ConfigureRun, { pattern: "zz-proto", resolved: { source: "clipboard", text: "hello" }, onRun: () => {} });

  test("the run sends it under both spellings", async () => {
    const v = form();
    field(v.tree, "var:__proto__").onChange("fr");
    await submit(v.tree).onSubmit();
    const vars = (fake.nav.pushed.at(-1)!.props as { spec: { variables: Record<string, string> } }).spec.variables;
    expect(Object.entries(vars)).toEqual([
      ["__proto__", "fr"],
      [" __proto__ ", "fr"],
    ]);
  });

  // After a keystroke the form's values are rebuilt; a plain object there would hand {{constructor}}
  // Object's constructor function as its value.
  test("after typing in another field, an untouched {{constructor}} is still blank and a field error", () => {
    const v = render(ConfigureRun, {
      pattern: "zz-ctor",
      resolved: { source: "clipboard", text: "hello" },
      onRun: () => {},
    });
    field(v.tree, "var:lang").onChange("fr");
    expect(field(v.tree, "var:constructor").value).toBe("");
    action(v.tree, "Preview Prompt").onAction();
    expect(fake.toasts).toEqual([{ style: "failure", title: "Can't run yet", message: "Check constructor" }]);
  });

  test("left blank, it is a field error, not a crash", async () => {
    const v = form();
    expect(field(v.tree, "var:__proto__").value).toBe("");
    action(v.tree, "Preview Prompt").onAction();
    expect(fake.toasts).toEqual([{ style: "failure", title: "Can't run yet", message: "Check __proto__" }]);
  });
});

describe("An editor's save error is visible even with Name scrolled away", () => {
  // Revert saveFailed in useSave and this fails. An empty name throws before anything is written.
  test("a new strategy with no name says Couldn't save", async () => {
    const v = render(EditStrategy, {});
    await submit(v.tree).onSubmit();
    expect(fake.toasts.at(-1)).toMatchObject({ style: "failure", title: "Couldn't save" });
  });
});

describe("Manage Fabric's empty list tells a filtered-out list from an empty one", () => {
  const strategy = { id: "strategy:zz-one", name: "zz-one", type: "strategy", own: true };
  const empty = (tree: unknown) =>
    elements(tree).find((e) => typeName(e) === "List.EmptyView")!.props as { title: string; description?: string };
  const show = (view: string, rows: unknown[]) => {
    fake.promiseData = lists({ [view]: rows });
    const v = render(Browse, undefined as never);
    dropdown(v.tree).onChange(view);
    return empty(v.tree);
  };

  // Raycast shows the empty view only when no row is visible, so rows that exist were filtered out.
  test('rows that exist but show none say no match, not "yet"', () => {
    expect(show("strategy", [strategy]).title).toBe("No strategies match your search");
  });

  test('a view with no rows says "yet"', () => {
    expect(show("strategy", []).title).toBe("No strategies yet");
  });

  test("the ⌘N hint shows only on an empty Custom Patterns view", () => {
    expect(show("mine", []).description).toContain("⌘N");
    expect(show("mine", [{ id: "pattern:zz-mine", name: "zz-mine", type: "pattern", own: true }]).description).toBe(
      undefined,
    );
  });
});

// ISC-39: the error can sit above the scroll, so the cursor goes to the field that has it.
describe("A failed Run or Save puts the cursor in the field with the error", () => {
  /** Hands every field a stand-in ref and returns the ids focused, in order. */
  const watchFocus = (tree: unknown) => {
    const focused: string[] = [];
    for (const el of elements(tree)) {
      const ref = el.props.ref as ((r: unknown) => void) | { current: unknown } | undefined;
      const r = { focus: () => focused.push(el.props.id as string) };
      if (typeof ref === "function") ref(r);
      else if (ref) ref.current = r;
    }
    return focused;
  };

  test("Configure focuses the first bad field in form order: the variable below a filled text", () => {
    withVariablePattern();
    const v = render(ConfigureRun, {
      pattern: "zz-var",
      resolved: { source: "clipboard", text: "hello" },
      onRun: () => {},
    });
    const focused = watchFocus(v.tree);
    action(v.tree, "Preview Prompt").onAction();
    expect(focused).toEqual(["var:lang_code"]);
  });

  test("Configure focuses Session when it is the only bad field", () => {
    const v = render(ConfigureRun, {
      session: "bad name!",
      resolved: { source: "clipboard", text: "hello" },
      onRun: () => {},
    });
    const focused = watchFocus(v.tree);
    action(v.tree, "Preview Prompt").onAction();
    expect(focused).toEqual(["session"]);
  });

  test("Configure focuses the text when both it and the session are bad", () => {
    const v = render(ConfigureRun, { session: "bad name!", resolved: { source: "none" }, onRun: () => {} });
    const focused = watchFocus(v.tree);
    action(v.tree, "Preview Prompt").onAction();
    expect(focused).toEqual(["text"]);
  });

  test("a file fabric can't read is the file's error alone: focus and toast name only it", () => {
    const pdf = join(tmp, "focus.pdf");
    writeFileSync(pdf, "%PDF-1.4");
    const v = render(ConfigureRun, {
      pattern: "summarize",
      resolved: { source: "finder", paths: [pdf] },
      onRun: () => {},
    });
    const focused = watchFocus(v.tree);
    action(v.tree, "Preview Prompt").onAction();
    expect(focused).toEqual(["file"]);
    // The text field is fine, so the toast names only the file.
    expect(fake.toasts).toEqual([{ style: "failure", title: "Can't run yet", message: "Check Or a File" }]);
  });

  // Every editor with a Name field: a new item with no name, and a rename to a name fabric refuses.
  test.each([
    ["strategy", EditStrategy, {}],
    ["pattern", EditPattern, {}],
    ["context", EditContext, {}],
    ["config", EditProfile, {}],
    ["session rename", RenameSession, { name: "bad name!" }],
  ] as const)("the %s editor's failed save focuses Name", async (_, Editor, props) => {
    const v = render(Editor as (p: object) => unknown, props);
    const focused = watchFocus(v.tree);
    await submit(v.tree).onSubmit();
    expect(focused).toEqual(["name"]);
  });
});

// ISC-40: after an editor saves, Manage Fabric selects the saved row, in a view that shows it.
describe("Manage Fabric selects the row an editor just saved", () => {
  const old = { id: "strategy:aa-old", name: "aa-old", type: "strategy", own: true };
  const list = (tree: unknown) =>
    elements(tree).find((e) => typeName(e) === "List")!.props as { selectedItemId?: string };
  /** Opens New › <title> and returns the editor's onSaved. */
  const newItem = (tree: unknown, title: string) => {
    action(tree, title).onAction();
    return (fake.nav.pushed.at(-1)!.props as { onSaved: (name: string) => void }).onSaved;
  };

  test("a new strategy is selected once the re-list holds it", async () => {
    fake.promiseData = lists({ strategy: [old] });
    const v = render(Browse, undefined as never);
    dropdown(v.tree).onChange("strategy");
    const onSaved = newItem(v.tree, "Strategy");
    fake.promiseData = lists({
      strategy: [old, { id: "strategy:zz-new", name: "zz-new", type: "strategy", own: true }],
    });
    onSaved("zz-new");
    await until(() => list(v.tree).selectedItemId === "strategy:zz-new");
    expect(list(v.tree).selectedItemId).toBe("strategy:zz-new");
    expect(dropdown(v.tree).value).toBe("strategy");
  });

  test("a new pattern fabric doesn't list yet switches Patterns to Custom Patterns to show it", async () => {
    fake.promiseData = lists();
    const v = render(Browse, undefined as never);
    const onSaved = newItem(v.tree, "Pattern");
    fake.promiseData = lists({ mine: [{ id: "pattern:zz-mine", name: "zz-mine", type: "pattern", own: true }] });
    onSaved("zz-mine");
    await until(() => list(v.tree).selectedItemId === "pattern:zz-mine");
    expect([dropdown(v.tree).value, list(v.tree).selectedItemId]).toEqual(["mine", "pattern:zz-mine"]);
  });

  test("a new pattern fabric lists stays selected in Patterns, the view it was made from", async () => {
    fake.promiseData = lists();
    const v = render(Browse, undefined as never);
    const onSaved = newItem(v.tree, "Pattern");
    const mine = { id: "pattern:zz-both", name: "zz-both", type: "pattern", own: true };
    fake.promiseData = lists({ pattern: [...lists().pattern, mine], mine: [mine] });
    onSaved("zz-both");
    await until(() => list(v.tree).selectedItemId === "pattern:zz-both");
    expect([dropdown(v.tree).value, list(v.tree).selectedItemId]).toEqual(["pattern", "pattern:zz-both"]);
  });

  test("nothing is selected while the re-list doesn't hold the row yet", async () => {
    fake.promiseData = lists({ strategy: [old] });
    const v = render(Browse, undefined as never);
    dropdown(v.tree).onChange("strategy");
    newItem(v.tree, "Strategy")("zz-late");
    await settle(10);
    expect(list(v.tree).selectedItemId).toBe(undefined);
  });

  // The re-list lands after onSaved, as revalidate() does in Raycast (fake.relist), for every way an
  // editor can save: new, edit, rename and duplicate, in each view.
  const row = (type: string, name: string) => ({ id: `${type}:${name}`, name, type, own: true });
  test.each([
    ["New › Context", "context", "Context", "context"],
    ["New › Config", "profile", "Config", "profile"],
    ["Edit on a strategy", "strategy", "Edit", "strategy"],
    ["Duplicate to Edit on a strategy", "strategy", "Duplicate to Edit", "strategy"],
    ["Edit on a context", "context", "Edit", "context"],
    ["Edit on a config", "profile", "Edit", "profile"],
    ["Rename on a session", "session", "Rename", "session"],
    ["Edit on a custom pattern", "mine", "Edit", "pattern"],
  ] as const)("%s selects the saved row once the later re-list holds it", async (_, view, title, type) => {
    const existing = row(type, "aa-old");
    fake.promiseData = lists({ [view]: [existing] });
    const v = render(Browse, undefined as never);
    dropdown(v.tree).onChange(view);
    const onSaved = newItem(v.tree, title);
    fake.relist = lists({ [view]: [existing, row(type, "zz-saved")] });
    onSaved("zz-saved");
    await until(() => list(v.tree).selectedItemId === `${type}:zz-saved`);
    expect([dropdown(v.tree).value, list(v.tree).selectedItemId]).toEqual([view, `${type}:zz-saved`]);
    // The row Raycast is told to select carries that id.
    const item = elements(v.tree).find((e) => typeName(e) === "List.Item" && e.props.title === "zz-saved");
    expect(item?.props.id).toBe(`${type}:zz-saved`);
  });

  test("New › Strategy from Patterns switches to Strategies to show it", async () => {
    fake.promiseData = lists();
    const v = render(Browse, undefined as never);
    const onSaved = newItem(v.tree, "Strategy");
    fake.relist = lists({ strategy: [old, row("strategy", "zz-new")] });
    onSaved("zz-new");
    await until(() => list(v.tree).selectedItemId === "strategy:zz-new");
    expect([dropdown(v.tree).value, list(v.tree).selectedItemId]).toEqual(["strategy", "strategy:zz-new"]);
  });

  test("once selected, the saved row lets go: the dropdown and the arrow keys move freely", async () => {
    fake.promiseData = lists({ strategy: [old] });
    const v = render(Browse, undefined as never);
    dropdown(v.tree).onChange("strategy");
    const onSaved = newItem(v.tree, "Strategy");
    fake.relist = lists({ strategy: [old, row("strategy", "zz-new")] });
    onSaved("zz-new");
    await until(() => list(v.tree).selectedItemId === "strategy:zz-new");
    // The user moves to another row, then to Contexts and back: no snap back to the saved row or view.
    (list(v.tree) as unknown as { onSelectionChange: (id: string | null) => void }).onSelectionChange(
      "strategy:aa-old",
    );
    dropdown(v.tree).onChange("context");
    await settle(5);
    expect(dropdown(v.tree).value).toBe("context");
    dropdown(v.tree).onChange("strategy");
    expect(list(v.tree).selectedItemId).toBe("strategy:aa-old");
  });
});

// ISC-39: Session sits under Show Advanced Options; a bad session with Advanced closed opens it first.
describe("A bad Session under closed Advanced Options still gets the cursor", () => {
  test("Preview opens Advanced and focuses Session", () => {
    const v = render(ConfigureRun, {
      session: "bad name!",
      resolved: { source: "clipboard", text: "hello" },
      onRun: () => {},
    });
    const focused: string[] = [];
    const sessionRef = elements(v.tree).find((e) => e.props.id === "session")!.props.ref as (r: unknown) => void;
    sessionRef({ focus: () => focused.push("session") });
    const advanced = () =>
      elements(v.tree).find((e) => e.props.id === "advanced")!.props as {
        value: boolean;
        onChange: (b: boolean) => void;
      };
    advanced().onChange(false);
    expect(elements(v.tree).some((e) => e.props.id === "session")).toBe(false);
    action(v.tree, "Preview Prompt").onAction();
    expect([advanced().value, focused]).toEqual([true, ["session"]]);
  });
});

// ISC-40's other half: the editor hands its saved name on (EditPattern writes under tmp, so it runs here).
describe("An editor reports the name it saved under", () => {
  test("a renamed custom pattern reports the new, trimmed name", async () => {
    const dir = join(tmp, "custom-patterns-rename");
    mkdirSync(join(dir, "zz-a"), { recursive: true });
    writeFileSync(join(dir, "zz-a", "system.md"), "Old.\n");
    fake.prefs = { ...fake.prefs, customPatternsFolder: dir };
    const saved: string[] = [];
    const v = render(EditPattern, { name: "zz-a", onSaved: (n: string) => saved.push(n) });
    field(v.tree, "name").onChange(" zz-b ");
    await submit(v.tree).onSubmit();
    expect(saved).toEqual(["zz-b"]);
  });

  // ISC-47.1: the preload points FABRIC_DIR at tmp (FABRIC_RAYCAST_TEST_DIR) and refuses to run otherwise,
  // so the saves below never reach the real folder. PROFILES_DIR is ours, under the mocked supportPath.
  test("every folder an editor writes resolves under tmp", () => {
    for (const dir of [FABRIC_DIR, PATTERNS_DIR, CUSTOM_DIR, STRATEGIES_DIR, CONTEXTS_DIR, SESSIONS_DIR, PROFILES_DIR])
      expect(dir.startsWith(`${tmp}/`)).toBe(true);
  });

  // ISC-47: each editor, new and renamed, reports the trimmed name it wrote under.
  // Sessions are only renamed here (fabric creates them), so that row has no "new" case.
  type Saved = { onSaved?: (n: string) => void };
  type Creator = (p: Saved & { name?: string }) => unknown;
  type Renamer = (p: Saved & { name: string }) => unknown;
  // RenameSession needs a name, so a `create: true` session row is a type error (`bun run typecheck`).
  // `keeps` is a piece of `seed` that must survive a rename: an editor that drops a field loses the user's text.
  type Case = { what: string; dir: string; ext: string; seed: string; keeps: string } & (
    { create: true; editor: Creator } | { create: false; editor: Renamer }
  );
  const cases: Case[] = [
    {
      what: "strategy",
      dir: STRATEGIES_DIR,
      ext: ".json",
      editor: EditStrategy,
      seed: '{"description":"d","prompt":"keep me"}\n',
      keeps: "keep me",
      create: true,
    },
    { what: "context", dir: CONTEXTS_DIR, ext: "", editor: EditContext, seed: "ctx\n", keeps: "ctx", create: true },
    {
      what: "config",
      dir: PROFILES_DIR,
      ext: ".yaml",
      editor: EditProfile,
      seed: "model: m\n",
      keeps: "model: m",
      create: true,
    },
    {
      what: "session",
      dir: SESSIONS_DIR,
      ext: ".json",
      editor: RenameSession,
      seed: "[]\n",
      keeps: "[]",
      create: false,
    },
  ];
  for (const c of cases) {
    const path = (name: string) => join(c.dir, name + c.ext);
    const rename: Renamer = c.editor;
    if (c.create) {
      const create = c.editor;
      test(`a new ${c.what} reports its trimmed name`, async () => {
        const name = `zz-new-${c.what}`;
        const saved: string[] = [];
        const v = render(create, { onSaved: (n: string) => saved.push(n) });
        field(v.tree, "name").onChange(` ${name} `);
        await submit(v.tree).onSubmit();
        expect(saved).toEqual([name]);
        expect(existsSync(path(name))).toBe(true);
      });
    }

    test(`a renamed ${c.what} reports the new name`, async () => {
      const [old, name] = [`zz-old-${c.what}`, `zz-renamed-${c.what}`];
      mkdirSync(c.dir, { recursive: true });
      writeFileSync(path(old), c.seed);
      const saved: string[] = [];
      const v = render(rename, { name: old, onSaved: (n: string) => saved.push(n) });
      field(v.tree, "name").onChange(` ${name} `);
      await submit(v.tree).onSubmit();
      expect(saved).toEqual([name]);
      expect(existsSync(path(name))).toBe(true);
      expect(existsSync(path(old))).toBe(false);
      expect(readFileSync(path(name), "utf8")).toContain(c.keeps);
    });
  }
});

describe("ISC-48: Rename Session to the name it already has", () => {
  const path = (name: string) => join(SESSIONS_DIR, `${name}.json`);
  const failures = () => fake.toasts.filter((t) => t.style === "failure");
  const renameTo = async (from: string, typed: string | undefined) => {
    const saved: string[] = [];
    const v = render(RenameSession, { name: from, onSaved: (n: string) => saved.push(n) });
    if (typed !== undefined) field(v.tree, "name").onChange(typed);
    await submit(v.tree).onSubmit();
    return saved;
  };
  beforeEach(() => mkdirSync(SESSIONS_DIR, { recursive: true }));

  for (const [how, typed] of [
    ["untouched", undefined],
    ["padded with spaces", " vendor-risk-review "],
  ] as const) {
    // The fake fabric lists only vendor-risk-review (fixtures/sessions.txt), so the save runs to "Saved".
    test(`${how}: saves with no error and keeps the file`, async () => {
      writeFileSync(path("vendor-risk-review"), "[keep]\n");
      expect(await renameTo("vendor-risk-review", typed)).toEqual(["vendor-risk-review"]);
      expect(failures()).toEqual([]);
      expect(fake.toasts.at(-1)).toMatchObject({ style: "success", title: "Saved" });
      expect(readFileSync(path("vendor-risk-review"), "utf8")).toBe("[keep]\n");
    });
  }

  test("ISC-48.1: another session's name is still refused and nothing is overwritten", async () => {
    writeFileSync(path("zz-mine"), "[mine]\n");
    writeFileSync(path("zz-taken"), "[taken]\n");
    expect(await renameTo("zz-mine", " zz-taken ")).toEqual([]);
    expect(failures().at(-1)).toMatchObject({ message: "A session with that name exists" });
    expect(readFileSync(path("zz-mine"), "utf8")).toBe("[mine]\n");
    expect(readFileSync(path("zz-taken"), "utf8")).toBe("[taken]\n");
  });
});

// 2026-10-19 manual test follow-ups.
describe("Manual-test fixes: blank names, the Detected row, the Last read label", () => {
  const IGNORED = " The text above isn't used while a file is chosen.";

  test("a blank Name says Name is required, not the allowed characters", async () => {
    const v = render(EditStrategy, {});
    await submit(v.tree).onSubmit();
    expect(fake.toasts.at(-1)).toMatchObject({ title: "Couldn't save", message: "Name is required" });
  });

  test("Detected names the launch source only until the box is cleared or typed into", () => {
    const v = render(ConfigureRun, {
      pattern: "summarize",
      resolved: { source: "clipboard", text: "hello" },
      onRun: () => {},
    });
    expect(detected(v.tree)).toBe("Text. Filled from: Clipboard.");
    field(v.tree, "text").onChange("");
    expect(detected(v.tree)).toBe("Nothing yet.");
    field(v.tree, "text").onChange("typed by hand");
    expect(detected(v.tree)).toBe("Text. Filled from: this box (you edited it).");
    field(v.tree, "text").onChange("hello");
    expect(detected(v.tree)).toBe("Text. Filled from: Clipboard.");
  });

  // 2026-10-20 manual test: typed text ran with a Result reading "Input: Clipboard".
  test("the Result's Input names the launch source only while the box is untouched", async () => {
    const inputLabel = async (resolved: object, typed?: string) => {
      const v = render(ConfigureRun, { pattern: "summarize", resolved, onRun: () => {} } as never);
      if (typed !== undefined) field(v.tree, "text").onChange(typed);
      await submit(v.tree).onSubmit();
      const pushed = fake.nav.pushed.at(-1)!;
      expect(typeName(pushed)).toBe("ResultView");
      return (pushed.props as { inputLabel: string }).inputLabel;
    };
    expect(await inputLabel({ source: "clipboard", text: "hello" })).toBe("Clipboard");
    expect(await inputLabel({ source: "clipboard", text: "hello" }, "typed by hand")).toBe("Typed in the run form");
    expect(await inputLabel({ source: "none" }, "typed by hand")).toBe("Typed in the run form");
    expect(await inputLabel({ source: "clipboard", text: "hello" }, "hello")).toBe("Clipboard");
  });

  test("Detected after a Finder launch: the launch file, then a chosen file, then nothing", () => {
    const launch = join(tmp, "detected-launch.txt");
    const other = join(tmp, "detected-other.txt");
    writeFileSync(launch, "from finder");
    writeFileSync(other, "chosen later");
    const v = render(ConfigureRun, {
      pattern: "summarize",
      resolved: { source: "finder", paths: [launch] },
      onRun: () => {},
    });
    expect(detected(v.tree)).toBe("Text. Filled from: Finder file.");
    field(v.tree, "file").onChange([other]);
    expect(detected(v.tree)).toBe("Text. Filled from: the file you chose.");
    field(v.tree, "file").onChange([]);
    expect(detected(v.tree)).toBe("Nothing yet.");
    field(v.tree, "file").onChange([launch]);
    expect(detected(v.tree)).toBe("Text. Filled from: Finder file.");
    // ISC-46: the file wins, and the form says so where the user looks, not only in a tooltip.
    field(v.tree, "text").onChange("typed too");
    expect(detected(v.tree)).toBe(`Text. Filled from: Finder file.${IGNORED}`);
  });

  test("Detected says the text isn't used while a file is chosen", () => {
    const other = join(tmp, "detected-other.txt");
    writeFileSync(other, "chosen later");
    const v = render(ConfigureRun, {
      pattern: "summarize",
      resolved: { source: "clipboard", text: "hello" },
      onRun: () => {},
    });
    field(v.tree, "file").onChange([other]);
    expect(detected(v.tree)).toBe(`Text. Filled from: the file you chose.${IGNORED}`);
    field(v.tree, "text").onChange("   ");
    expect(detected(v.tree)).toBe("Text. Filled from: the file you chose.");
    field(v.tree, "file").onChange([]);
    field(v.tree, "text").onChange("typed by hand");
    expect(detected(v.tree)).toBe("Text. Filled from: this box (you edited it).");
    // A file fabric can't read still wins: the run is blocked on it, and the text stays unused.
    field(v.tree, "file").onChange([join(tmp, "unreadable.pdf")]);
    expect(detected(v.tree)).toBe(`Nothing yet. Filled from: the file you chose.${IGNORED}`);
  });

  // A placeholder fixed the row's width in Raycast ("Noth…ted"), so the row appears only with the real value.
  test("Last read is absent until the read lands, then holds the source alone", async () => {
    fake.promiseData = { patterns: [{ name: "summarize", description: "S.", own: false }], sessions: [] };
    const v = render(Search, undefined as never);
    (
      elements(v.tree).find((e) => typeName(e) === "List")!.props as { onSelectionChange: (id: string) => void }
    ).onSelectionChange("pattern:summarize");
    const pane = () => elements(v.tree).find((e) => typeName(e) === "Detail" && "input" in e.props)!;
    // Synchronously after selecting, the launch read is still pending: no placeholder value is passed.
    expect(pane().props.input).toBe(undefined);
    await until(() => pane().props.input === "Nothing selected");
    const lastRead = elements((pane().type as (p: unknown) => unknown)(pane().props)).find(
      (e) => e.props.title === "Last read",
    )!;
    expect(lastRead.props.text).toBe("Nothing selected");
    const before = elements((pane().type as (p: unknown) => unknown)({ ...pane().props, input: undefined }));
    expect(before.filter((e) => e.props.title === "Last read")).toEqual([]);
  });
});

describe("labels and notices at render level", () => {
  // ISC-100.1: the cleanup that kills a foreground run on unmount says so, once, and only then.
  const slowResult = (notices: string[]) => ({
    fabricPath: FAKE,
    spec: { pattern: "summarize", input: { kind: "text" as const, text: "hello" } },
    inputLabel: "Clipboard",
    output: "clipboard" as const,
    notice: (t: string) => void notices.push(t),
  });

  test("an unmount mid-run sends the stopped notice", async () => {
    process.env.FAKE_FABRIC_SLEEP = "20";
    try {
      const notices: string[] = [];
      const v = render(ResultView, slowResult(notices));
      await until(() => elements(v.tree).some((e) => e.props.title === "Stop Run"));
      v.unmount();
      expect(notices).toEqual([
        "Stopped: summarize. Its Result view closed before it finished. To keep a long run going, use ⌘↵ › Run in Background.",
      ]);
    } finally {
      delete process.env.FAKE_FABRIC_SLEEP;
    }
  });

  test("an unmount after the run finished, or after Stop, sends nothing", async () => {
    const notices: string[] = [];
    const done = render(ResultView, slowResult(notices));
    await until(() => label(done.tree, "Delivered"));
    done.unmount();

    process.env.FAKE_FABRIC_SLEEP = "20";
    try {
      const stopped = render(ResultView, slowResult(notices));
      await until(() => elements(stopped.tree).some((e) => e.props.title === "Stop Run"));
      action(stopped.tree, "Stop Run").onAction();
      stopped.unmount();
    } finally {
      delete process.env.FAKE_FABRIC_SLEEP;
    }
    expect(notices).toEqual([]);
  });

  // ISC-101: both ways into a run label a link with what it is.
  test("a URL from the clipboard reads 'Web page · Clipboard' from the form and from a quick run", async () => {
    fake.prefs = { ...fake.prefs, longInputs: "foreground" };
    const form = render(ConfigureRun, {
      pattern: "summarize",
      resolved: { source: "clipboard", text: "https://en.wikipedia.org/wiki/X" },
      onRun: () => {},
    });
    await submit(form.tree).onSubmit();
    expect((fake.nav.pushed.at(-1)!.props as { inputLabel: string }).inputLabel).toBe("Web page · Clipboard");

    fake.promiseData = { patterns: [{ name: "summarize", description: "Summarize.", own: false }], sessions: [] };
    fake.clipboard = "https://youtu.be/abc";
    const v = render(Search, undefined as never);
    await action(v.tree, "Run Pattern").onAction();
    expect((fake.nav.pushed.at(-1)!.props as { inputLabel: string }).inputLabel).toBe("YouTube video · Clipboard");
    v.unmount();
  });

  test("a preview that unmounts sends nothing", async () => {
    process.env.FAKE_FABRIC_SLEEP = "20";
    try {
      const notices: string[] = [];
      const props = slowResult(notices);
      const v = render(ResultView, { ...props, spec: { ...props.spec, dryRun: true } });
      await until(() => elements(v.tree).some((e) => e.props.title === "Stop Run"));
      v.unmount();
      expect(notices).toEqual([]);
    } finally {
      delete process.env.FAKE_FABRIC_SLEEP;
    }
  });

  // ISC-103.2: fabric's own stderr names home paths ("open /Users/x/.config/fabric/.env: …").
  test("a failed run shows fabric's error with home as ~, in the toast and the view", async () => {
    const home = process.env.HOME;
    process.env.FAKE_FABRIC_EXIT = "1";
    process.env.FAKE_FABRIC_STDERR = `error loading .env file: open ${tmp}/.config/fabric/.env: no such file`;
    try {
      process.env.HOME = tmp;
      const v = render(ResultView, slowResult([]));
      await until(() => fake.toasts.some((t) => t.style === "failure"));
      const toast = fake.toasts.find((t) => t.style === "failure")!;
      expect(toast.message).toBe("error loading .env file: open ~/.config/fabric/.env: no such file");
      expect(markdown(v.tree)).toContain("open ~/.config/fabric/.env");
      expect(markdown(v.tree)).not.toContain(tmp);
      v.unmount();
    } finally {
      process.env.HOME = home;
      delete process.env.FAKE_FABRIC_EXIT;
      delete process.env.FAKE_FABRIC_STDERR;
    }
  });

  // ISC-103: the Result's Delivered row, from the run's own save and from Save to File.
  test("Saved paths in the Result read ~/", async () => {
    const home = process.env.HOME;
    try {
      process.env.HOME = tmp;
      const v = render(ResultView, { ...slowResult([]), output: "file" as const });
      await until(() => label(v.tree, "Delivered"));
      expect(label(v.tree, "Delivered")).toMatch(/^Saved: ~\//);
      await action(v.tree, "Save to File").onAction();
      expect(label(v.tree, "Delivered")).toMatch(/^Saved: ~\//);
      v.unmount();
    } finally {
      process.env.HOME = home;
    }
  });

  // ISC-101 on the default path: a web page now runs in the background, and its record carries the label.
  test("a web page run in the background records 'Web page · Clipboard'", async () => {
    process.env.FABRIC_BG_NOTIFIER = "/usr/bin/true";
    fake.prefs = { ...fake.prefs, longInputs: "background" };
    const before = new Set(listRuns(RUNS_DIR).map((r) => r.id));
    const form = render(ConfigureRun, {
      pattern: "summarize",
      resolved: { source: "clipboard", text: "https://example.com/article" },
      onRun: () => {},
    });
    await submit(form.tree).onSubmit();
    const mine = () => listRuns(RUNS_DIR).find((r) => !before.has(r.id));
    try {
      await until(() => mine(), 1000);
      expect(mine()!.inputLabel).toBe("Web page · Clipboard");
      expect(fake.nav.pushed.filter((e) => typeName(e) === "ResultView")).toEqual([]);
    } finally {
      const id = mine()?.id;
      if (id) {
        await until(() => listRuns(RUNS_DIR).find((r) => r.id === id)?.status !== "running", 2000);
        rmSync(join(RUNS_DIR, id), { recursive: true, force: true });
      }
      delete process.env.FABRIC_BG_NOTIFIER;
    }
  });

  const bgRecord = (id: string, finalDir: string) => {
    mkdirSync(join(RUNS_DIR, id), { recursive: true });
    const meta = { id, pattern: "youtube_summary", inputLabel: "YouTube video · Clipboard" };
    writeFileSync(
      join(RUNS_DIR, id, "meta.json"),
      JSON.stringify({ ...meta, startedAt: new Date().toISOString(), pid: 1, finalDir, finalName: "a.md" }),
    );
    writeFileSync(join(RUNS_DIR, id, "exit"), "0\n");
    writeFileSync(join(RUNS_DIR, id, "output"), `${join(finalDir, "a.md")}\n`);
    return id;
  };

  // ISC-102 + ISC-103: no subtitle to truncate the name; the input and a ~ path sit in the detail panel.
  test("Show Background Runs: no row subtitle, Input in the detail, Saved to with ~", async () => {
    const home = process.env.HOME;
    const id = "20261020-150000-ux5170";
    let v: ReturnType<typeof render> | undefined;
    try {
      process.env.HOME = tmp;
      bgRecord(id, join(tmp, "answers"));
      v = render(BackgroundRuns, undefined as never);
      const tree = () => v!.tree;
      const row = () => elements(tree()).find((e) => typeName(e) === "List.Item" && e.key === id);
      await until(() => row());
      expect(row()!.props.subtitle).toBeUndefined();
      expect(label(row()!.props.detail, "Input")).toBe("YouTube video · Clipboard");
      expect(label(row()!.props.detail, "Saved to")).toBe("~/answers/a.md");
    } finally {
      v?.unmount();
      process.env.HOME = home;
      rmSync(join(RUNS_DIR, id), { recursive: true, force: true });
    }
  });

  // ISC-103: the editor forms' "Saved in" rows.
  test("New Context and New Strategy show Saved in with ~", () => {
    const home = process.env.HOME;
    process.env.HOME = FABRIC_DIR;
    try {
      const savedIn = (tree: unknown) => elements(tree).find((e) => e.props.title === "Saved in")!.props.text;
      expect(savedIn(render(EditContext, {}).tree)).toBe(`~/${CONTEXTS_DIR.slice(FABRIC_DIR.length + 1)}/…`);
      expect(savedIn(render(EditStrategy, {} as never).tree)).toBe(
        `~/${STRATEGIES_DIR.slice(FABRIC_DIR.length + 1)}/….json`,
      );
    } finally {
      process.env.HOME = home;
    }
  });
});

// ISC-103.2: errorText is the boundary every caught error crosses on its way to a toast or view.
describe("errorText scrubs home and survives a non-Error", () => {
  test("an Error naming a home path, and a thrown string", () => {
    const home = process.env.HOME;
    try {
      process.env.HOME = tmp;
      expect(errorText(new Error(`EACCES: open '${tmp}/answers/a.md'`))).toBe("EACCES: open '~/answers/a.md'");
      expect(errorText(`never saved into ${tmp}/.ssh`)).toBe("never saved into ~/.ssh");
    } finally {
      process.env.HOME = home;
    }
  });
});

// Homebrew installs fabric as fabric-ai, so the setup hints name the Fabric Path's own --setup: the state
// list, the can't-see page, a failed Result and a failed background run. Browse and Search pass the same path.
const { shownText } = await import("../src/deliver");
describe("setup hints name the Fabric Path", () => {
  const content = (tree: unknown) => (action(tree, "Copy Setup Command") as unknown as { content: string }).content;

  test("a setup state's action copies it", () => {
    const v = render(StateList, { state: stateFor("no-model", { fabricPath: FAKE }), handlers: { fabricPath: FAKE } });
    expect(content(v.tree)).toBe(`${FAKE} --setup`);
  });

  test("the can't-see page names and copies it", async () => {
    const dir = join(tmp, "custom-patterns-invisible");
    fake.prefs = { ...fake.prefs, customPatternsFolder: dir };
    const v = render(EditPattern, {});
    field(v.tree, "name").onChange("zz_unlisted");
    field(v.tree, "system").onChange("Hi.");
    await submit(v.tree).onSubmit();
    const pushed = fake.nav.pushed.at(-1) as ReactElement<object, (p: object) => ReactNode>;
    expect(pushed).toBeDefined();
    const page = render(pushed.type, pushed.props);
    expect(content(page.tree)).toBe(`${FAKE} --setup`);
    const md = elements(page.tree).find((e) => typeof e.props.markdown === "string")?.props.markdown as string;
    // Shown with the home folder as ~, so a screenshot doesn't carry the user name; copied whole.
    expect(md).toContain(shownText(`Run \`${FAKE} --setup\` in a terminal`));
    expect(md).not.toContain(`${process.env.HOME}/`);
  });

  test("a failed run's Result copies it and names it", async () => {
    process.env.FAKE_FABRIC_EXIT = "1";
    process.env.FAKE_FABRIC_STDERR = "error loading .env file";
    try {
      const v = render(ResultView, {
        fabricPath: FAKE,
        spec: { pattern: "summarize", input: { kind: "text" as const, text: "hello" } },
        inputLabel: "Clipboard",
        output: "clipboard" as const,
      });
      await until(() => fake.toasts.some((t) => t.style === "failure"));
      expect(content(v.tree)).toBe(`${FAKE} --setup`);
      expect(markdown(v.tree)).toContain(shownText(`Run ${FAKE} --setup in a terminal once.`));
      v.unmount();
    } finally {
      delete process.env.FAKE_FABRIC_EXIT;
      delete process.env.FAKE_FABRIC_STDERR;
    }
  });

  test("a failed background run's detail names it", async () => {
    const id = "20261021-090000-setup1";
    let v: ReturnType<typeof render> | undefined;
    const body = () =>
      (
        elements(v?.tree).find((e) => typeName(e) === "List.Item" && e.key === id)?.props.detail as
          ReactElement<{ markdown: string }> | undefined
      )?.props.markdown;
    try {
      mkdirSync(join(RUNS_DIR, id), { recursive: true });
      const meta = { id, pattern: "summarize", inputLabel: "Clipboard", startedAt: new Date().toISOString(), pid: 1 };
      writeFileSync(join(RUNS_DIR, id, "meta.json"), JSON.stringify({ ...meta, finalDir: tmp, finalName: "a.md" }));
      writeFileSync(join(RUNS_DIR, id, "exit"), "1\n");
      writeFileSync(join(RUNS_DIR, id, "stderr"), "error loading .env file\n");
      v = render(BackgroundRuns, undefined as never);
      await until(() => body());
      expect(body()).toContain(shownText(`Run ${FAKE} --setup in a terminal once.`));
    } finally {
      v?.unmount();
      rmSync(join(RUNS_DIR, id), { recursive: true, force: true });
    }
  });
});
