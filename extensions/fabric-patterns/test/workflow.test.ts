import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  chainJson,
  isModelName,
  isVendorName,
  listWorkflows,
  parseStepLine,
  parseWorkflow,
  progressText,
  unionVariables,
  workflowVariableValues,
  type Workflow,
} from "../lib/workflow";

const fixture = (f: string) => readFileSync(join(import.meta.dir, "fixtures", f), "utf8");
const installed: ReadonlySet<string> = new Set(fixture("patterns.txt").split("\n").filter(Boolean));

/** The parsed workflow, or a failing assertion naming the refusal. */
function ok(raw: string, have = installed): Workflow {
  const r = parseWorkflow(raw, have);
  expect(r.ok ? "ok" : r.reason).toBe("ok");
  return (r as { workflow: Workflow }).workflow;
}

/** The refusal reason, or a failing assertion when the input parsed. */
function refused(raw: string, have = installed): string {
  const r = parseWorkflow(raw, have);
  expect(r.ok ? "parsed, expected a refusal" : "refused").toBe("refused");
  return (r as { reason: string }).reason;
}

const steps = (...s: unknown[]) => JSON.stringify({ steps: s });

describe("ISC-78: the golden chain round-trips through chainJson", () => {
  const raw = fixture("workflow-golden.json");

  test("it parses to a named 3-step chain ending at create_5_sentence_summary", () => {
    const wf = ok(raw);
    expect(wf.name).toBe("golden");
    expect(wf.steps.map((s) => s.pattern)).toEqual(["summarize", "translate", "create_5_sentence_summary"]);
    expect(wf.steps[0].input).toBeString();
    expect(wf.steps[1].variables).toEqual({ lang_code: "fr" });
    expect([wf.steps[2].model, wf.steps[2].vendor]).toEqual(["claude-sonnet-4-5-20250929", "Anthropic"]);
  });

  test("parse ∘ chainJson ∘ parse is the same workflow", () => {
    const wf = ok(raw);
    expect(ok(chainJson(wf))).toEqual(wf);
  });

  test("chainJson is byte-stable, and is the fixture's own bytes", () => {
    const once = chainJson(ok(raw));
    expect(chainJson(ok(once))).toBe(once);
    expect(once).toBe(raw);
  });

  test("keys come out in fabric's order whatever order they went in", () => {
    const wf = ok(
      JSON.stringify({
        steps: [{ vendor: "V", model: "m", variables: { a: "1" }, input: "i", pattern: "summarize" }],
        name: "n",
      }),
    );
    expect(chainJson(wf)).toBe(
      JSON.stringify(
        { name: "n", steps: [{ pattern: "summarize", input: "i", variables: { a: "1" }, model: "m", vendor: "V" }] },
        null,
        2,
      ) + "\n",
    );
  });

  test("absent keys stay absent and unknown step keys are not written", () => {
    const out = chainJson(ok(steps({ pattern: "summarize", extra: 1 })));
    expect(out).toBe('{\n  "steps": [\n    {\n      "pattern": "summarize"\n    }\n  ]\n}\n');
  });
});

describe("ISC-81: a step that repeats the previous one is refused", () => {
  test("summarize, summarize", () => {
    expect(refused(steps({ pattern: "summarize" }, { pattern: "summarize" }))).toContain("repeats");
  });

  test("a pattern may come back after another step", () => {
    ok(fixture("workflow-3step.json"));
  });
});

describe("ISC-86: a step pattern is one installed plain name", () => {
  // Each is "installed" here, so the refusal is the plain-name rule's, not the installed check's.
  for (const p of ["/etc/hosts", "../x", "~/x", "./x", "\\x", "a/b", "a..b", "", "-x"])
    test(`\`${p}\` refused even when installed`, () => {
      expect(refused(steps({ pattern: p }), new Set([...installed, p]))).toStartWith("step 1: pattern");
    });

  test("nope_xyz, a plain name nobody installed, is refused as not installed", () => {
    expect(refused(steps({ pattern: "nope_xyz" }))).toBe("step 1: pattern nope_xyz isn't installed");
  });

  test("a non-string pattern is refused", () => {
    expect(refused(steps({ pattern: 3 }))).toStartWith("step 1:");
    expect(refused(steps({}))).toStartWith("step 1:");
  });
});

describe("ISC-88: an uninstalled pattern names its step, and installing it clears the refusal", () => {
  const raw = steps({ pattern: "summarize" }, { pattern: "x" });

  test("missing", () => {
    expect(refused(raw)).toBe("step 2: pattern x isn't installed");
  });

  test("installed", () => {
    expect(ok(raw, new Set([...installed, "x"])).steps).toHaveLength(2);
  });

  test("a long name is quoted at 60 characters with backticks stripped", () => {
    const name = "a".repeat(70);
    expect(refused(steps({ pattern: name }))).toBe(`step 1: pattern ${"a".repeat(60)}… isn't installed`);
    expect(refused(steps({ pattern: "`/etc`" }))).not.toContain("`");
  });
});

describe("ISC-86.1: model and vendor names", () => {
  test("real names are accepted", () => {
    expect(isModelName("llama3.2:1b")).toBe(true);
    expect(isModelName("openai/gpt-oss-20b")).toBe(true);
    expect(isModelName("claude-sonnet-4-5-20250929")).toBe(true);
    expect(isVendorName("LM Studio")).toBe(true);
    expect(isVendorName("Anthropic")).toBe(true);
    ok(steps({ pattern: "summarize", model: "llama3.2:1b", vendor: "LM Studio" }));
  });

  const bad: [string, string][] = [
    ["NUL", "a\0b"],
    ["newline", "a\nb"],
    ["CR", "a\rb"],
    ["trailing newline", "a\n"],
    ["leading -", "-a"],
    ["..", "a..b"],
    ["129 chars", "a".repeat(129)],
    ["empty", ""],
  ];
  for (const [what, v] of bad) {
    test(`${what} refused as a model and as a vendor`, () => {
      expect(isModelName(v)).toBe(false);
      expect(isVendorName(v)).toBe(false);
      expect(refused(steps({ pattern: "summarize", model: v }))).toStartWith("step 1: model");
      expect(refused(steps({ pattern: "summarize", vendor: v }))).toStartWith("step 1: vendor");
    });
  }

  test("128 chars is the limit, not 127", () => {
    expect(isModelName("a".repeat(128))).toBe(true);
    expect(isVendorName("a".repeat(128))).toBe(true);
  });

  test("a non-string model is refused", () => {
    expect(refused(steps({ pattern: "summarize", model: 1 }))).toStartWith("step 1: model");
  });
});

describe("ISC-87: invalid chains are refused with a reason, never thrown", () => {
  const corpus: [string, string][] = [
    ["not JSON", "{steps:"],
    ["a top-level array", "[]"],
    ["null", "null"],
    ["a string", '"x"'],
    ["no steps", "{}"],
    ["steps not an array", '{"steps":{}}'],
    ["empty steps", '{"steps":[]}'],
    ["51 steps", steps(...Array.from({ length: 51 }, (_, i) => ({ pattern: i % 2 ? "summarize" : "translate" })))],
    ["a step that is not an object", steps("summarize")],
    ["a step that is an array", steps(["summarize"])],
    ["NUL in input", steps({ pattern: "summarize", input: "a\0b" })],
    ["non-string input", steps({ pattern: "summarize", input: 1 })],
    ["bad variable key", steps({ pattern: "summarize", variables: { "a b": "1" } })],
    ["variable key with a colon", steps({ pattern: "summarize", variables: { "a:b": "1" } })],
    ["NUL in a variable value", steps({ pattern: "summarize", variables: { a: "1\0" } })],
    ["non-string variable value", steps({ pattern: "summarize", variables: { a: 1 } })],
    ["variables an array", steps({ pattern: "summarize", variables: ["a"] })],
    ["name not a string", JSON.stringify({ name: 1, steps: [{ pattern: "summarize" }] })],
    ["over 1 MB", steps({ pattern: "summarize", input: "a".repeat(1024 * 1024) })],
  ];
  for (const [what, raw] of corpus)
    test(what, () => {
      let r: ReturnType<typeof parseWorkflow> | undefined;
      expect(() => (r = parseWorkflow(raw, installed))).not.toThrow();
      expect(r!.ok ? "parsed" : r!.reason.length > 0 ? "refused" : "empty reason").toBe("refused");
    });

  test("50 steps is the limit", () => {
    ok(steps(...Array.from({ length: 50 }, (_, i) => ({ pattern: i % 2 ? "summarize" : "translate" }))));
  });

  test("the 1 MB cap counts bytes, not characters", () => {
    // 350,000 three-byte characters: under 1 MB of characters, over 1 MB of UTF-8.
    expect(refused(steps({ pattern: "summarize", input: "€".repeat(350_000) }))).toContain("1 MB");
  });

  test("an indented variable name, as fabric spells it, is accepted", () => {
    ok(steps({ pattern: "summarize", variables: { " lang ": "fr" } }));
  });
});

describe("prototype keys never resolve to inherited members", () => {
  test("a step's own __proto__ is not read as its model", () => {
    const wf = ok('{"steps":[{"pattern":"summarize","__proto__":{"model":"x"}}]}');
    expect(wf.steps[0].model).toBeUndefined();
    expect(chainJson(wf)).not.toContain('"x"');
  });

  test("a polluted Object.prototype lends a step no model, vendor or input", () => {
    for (const k of ["model", "vendor", "input", "variables"])
      Object.defineProperty(Object.prototype, k, { value: "x", configurable: true });
    try {
      // Own keys only: the parsed step itself inherits the polluted members like any object.
      expect(Object.keys(ok(steps({ pattern: "summarize" })).steps[0])).toEqual(["pattern"]);
    } finally {
      for (const k of ["model", "vendor", "input", "variables"])
        delete (Object.prototype as Record<string, unknown>)[k];
    }
  });

  test("a step with no own pattern doesn't find one on the prototype", () => {
    expect(refused('{"steps":[{"__proto__":{"pattern":"summarize"}}]}')).toStartWith("step 1:");
  });

  test("an own pattern of constructor is just a name", () => {
    expect(refused(steps({ pattern: "constructor" }))).toBe("step 1: pattern constructor isn't installed");
  });

  test("variables { __proto__: v } is an own variable, not a prototype", () => {
    const wf = ok('{"steps":[{"pattern":"summarize","variables":{"__proto__":"v"}}]}');
    const vars = wf.steps[0].variables!;
    expect(Object.hasOwn(vars, "__proto__")).toBe(true);
    expect(vars["__proto__"]).toBe("v");
    expect(ok(chainJson(wf)).steps[0].variables!["__proto__"]).toBe("v");
  });

  test("an own steps key is required at the top level", () => {
    expect(refused('{"__proto__":{"steps":[{"pattern":"summarize"}]}}')).toContain("steps");
  });
});

describe("listWorkflows: the chains folder", () => {
  const dir = mkdtempSync(join(tmpdir(), "fr-wf-"));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(join(dir, "b.json"), steps({ pattern: "summarize" }));
  writeFileSync(join(dir, "a.json"), steps({ pattern: "summarize" }, { pattern: "summarize" }));
  writeFileSync(join(dir, "c.yaml"), "steps: []\n");
  writeFileSync(join(dir, "bad name!.json"), steps({ pattern: "summarize" }));
  writeFileSync(join(dir, ".hidden.json"), steps({ pattern: "summarize" }));
  writeFileSync(join(dir, ".x.json.123.tmp"), "half a write");
  mkdirSync(join(dir, "sub.json"));
  const list = listWorkflows(dir, installed);

  test("ISC-85.1: dotfiles and saveOwnFile leftovers are neither listed nor refused", () => {
    expect(list.map((w) => w.name)).not.toContain(".hidden");
    expect(list.some((w) => w.name.startsWith(".") || w.path.includes(".tmp"))).toBe(false);
  });

  test("directories are skipped; the rest is sorted by name (a chain's stem, a refused file's whole name)", () => {
    expect(list.map((w) => w.name)).toEqual(["a", "b", "bad name!.json", "c.yaml"]);
    expect(list.map((w) => w.path)).toEqual(["a.json", "b.json", "bad name!.json", "c.yaml"].map((f) => join(dir, f)));
  });

  test("a good chain parses; a bad one carries parseWorkflow's reason", () => {
    const by = Object.fromEntries(list.map((w) => [w.name, w]));
    expect(by.b.ok ? by.b.workflow.steps.length : by.b.reason).toBe(1);
    expect(by.a.ok ? "parsed" : by.a.reason).toContain("repeats");
  });

  test("ISC-87: a .yaml file is listed refused", () => {
    const c = list.find((w) => w.name === "c.yaml")!;
    expect(c.ok ? "parsed" : c.reason).toBe("only .json chains run from here");
  });

  test("a stem that isn't a plain name is refused", () => {
    const w = list.find((x) => x.name === "bad name!.json")!;
    expect(w.ok ? "parsed" : "refused").toBe("refused");
  });

  test("a missing folder is an empty list", () => {
    expect(listWorkflows(join(dir, "nope"), installed)).toEqual([]);
  });
});

describe("variables across a chain", () => {
  const systems: Record<string, string> = {
    a: "Say {{lang}} and {{ tone }} for {{input}}.",
    b: "Use {{tone}} and {{ lang }} plus {{extra}}.",
  };
  const systemFor = (p: string) => (Object.hasOwn(systems, p) ? systems[p] : undefined);
  const chain = [{ pattern: "a" }, { pattern: "b" }, { pattern: "none" }];

  test("unionVariables dedupes in first-seen order and skips {{input}}", () => {
    expect(unionVariables(chain, systemFor)).toEqual(["lang", "tone", "extra"]);
  });

  test("workflowVariableValues sends every spelling any step uses", () => {
    expect(workflowVariableValues(chain, systemFor, { lang: "fr", tone: "dry" })).toEqual({
      lang: "fr",
      " tone ": "dry",
      tone: "dry",
      " lang ": "fr",
      extra: "",
    });
  });
});

describe("fabric's step progress lines", () => {
  const lines = fixture("workflow-progress-3step.txt").split("\n").filter(Boolean);

  test("every fixture line parses to its step, total and pattern", () => {
    expect(lines).toHaveLength(9);
    const parsed = lines.map(parseStepLine);
    expect(parsed.map((p) => p && `${p.step}/${p.total} ${p.pattern}`)).toEqual(
      lines.map((l) => {
        const m = /^\[step (\d)\/(\d) (\w+)\]/.exec(l)!;
        return `${m[1]}/${m[2]} ${m[3]}`;
      }),
    );
    expect(parsed.map((p) => progressText(p!))).toEqual([
      ...Array(3).fill("Step 1/3 summarize"),
      ...Array(3).fill("Step 2/3 extract_wisdom"),
      ...Array(3).fill("Step 3/3 summarize"),
    ]);
  });

  test("a path-shaped label keeps the step but no pattern", () => {
    for (const label of ["../x", "/etc/hosts", "a b", "..", "x..y"]) {
      const p = parseStepLine(`[step 1/3 ${label}] running...`);
      expect(p).toEqual({ step: 1, total: 3 });
      expect(progressText(p!)).toBe("Step 1/3");
    }
  });

  test("anything else is not a step line", () => {
    for (const l of ["step 1/3 summarize] running", "[step x/3 summarize] running", "[step 1/3 summarize]", "hello"])
      expect(parseStepLine(l)).toBeUndefined();
    expect(parseStepLine(`[step 1/3 ${"a".repeat(81)}] running...`)).toBeUndefined();
  });
});

describe("chain ids, step variables and the golden capture", () => {
  test("a non-.json file keeps its whole file name, so it never shares an id with the .json chain", () => {
    const dir = mkdtempSync(join(tmpdir(), "fr-wf-ids-"));
    try {
      writeFileSync(join(dir, "foo.json"), steps({ pattern: "summarize" }));
      writeFileSync(join(dir, "foo.yaml"), "steps: []");
      const list = listWorkflows(dir, installed);
      expect(list.map((w) => [w.name, w.path, w.ok])).toEqual([
        ["foo", join(dir, "foo.json"), true],
        ["foo.yaml", join(dir, "foo.yaml"), false],
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a variable a step sets itself is not asked for; one a later step needs still is", () => {
    const md: Record<string, string> = { translate: "To {{lang_code}}, {{ tone }}.", summarize: "{{lang_code}}" };
    const sys = (p: string) => md[p];
    expect(unionVariables([{ pattern: "translate", variables: { lang_code: "fr" } }], sys)).toEqual(["tone"]);
    expect(unionVariables([{ pattern: "translate", variables: { " tone ": "dry" } }], sys)).toEqual(["lang_code"]);
    expect(
      unionVariables([{ pattern: "translate", variables: { lang_code: "fr" } }, { pattern: "summarize" }], sys),
    ).toEqual(["tone", "lang_code"]);
  });

  test("every step line of real fabric's golden capture parses, in order", () => {
    const lines = fixture("workflow-golden-progress.txt").split("\n").filter(Boolean);
    const parsed = lines.map(parseStepLine);
    expect(parsed.every(Boolean)).toBe(true);
    expect([...new Set(parsed.map((p) => `${p!.step}/${p!.total} ${p!.pattern}`))]).toEqual([
      "1/3 summarize",
      "2/3 translate",
      "3/3 create_5_sentence_summary",
    ]);
  });
});

describe("extensionless files and variable spelling", () => {
  test("an extensionless file never takes a chain's name", () => {
    const dir = mkdtempSync(join(tmpdir(), "fr-wf-noext-"));
    try {
      writeFileSync(join(dir, "foo.json"), steps({ pattern: "summarize" }));
      writeFileSync(join(dir, "foo"), "x");
      const names = listWorkflows(dir, installed).map((w) => w.name);
      expect(names.length).toBe(2);
      expect(new Set(names).size).toBe(2);
      expect(names).toContain("foo");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a step's own variable hides a field only under the exact spelling the pattern uses", () => {
    expect(unionVariables([{ pattern: "p", variables: { name: "x" } }], () => "Hi {{ name }}")).toEqual(["name"]);
    expect(unionVariables([{ pattern: "p", variables: { " name ": "x" } }], () => "Hi {{name}}")).toEqual(["name"]);
    expect(unionVariables([{ pattern: "p", variables: { name: "x" } }], () => "{{name}} and {{ name }}")).toEqual([
      "name",
    ]);
    expect(
      unionVariables([{ pattern: "p", variables: { name: "x", " name ": "y" } }], () => "{{name}} and {{ name }}"),
    ).toEqual([]);
  });
});
