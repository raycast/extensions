// fabric workflows (chains): a JSON file of steps fabric runs in turn, each
// step's output the next one's input. Pure except listWorkflows, which reads
// the chains folder. No @raycast imports.
//
// A step is exactly fabric's {pattern, input, variables, model, vendor}; other
// keys are ignored on read and never written. Every read is an own-property
// read, so a key named `__proto__` or `constructor` is data, never an
// inherited member.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { isPlainName, VAR_NAME } from "./argv";
import { variableSpellings, variableValues } from "./variables";

export interface WorkflowStep {
  pattern: string;
  input?: string;
  variables?: Record<string, string>;
  model?: string;
  vendor?: string;
}

export interface Workflow {
  name?: string;
  steps: WorkflowStep[];
}

export type Parsed = { ok: true; workflow: Workflow } | { ok: false; reason: string };

const MAX_BYTES = 1024 * 1024;
const MAX_STEPS = 50;
const MODEL = /^[A-Za-z0-9][A-Za-z0-9_.:/@-]*$/;
const VENDOR = /^[A-Za-z0-9][A-Za-z0-9_ .-]*$/;

// The first-character class refuses a leading `-`, and neither class admits NUL, CR or LF.
const goodField = (re: RegExp, v: string) => re.test(v) && v.length <= 128 && !v.includes("..");
export const isModelName = (v: string) => goodField(MODEL, v);
export const isVendorName = (v: string) => goodField(VENDOR, v);

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const own = (o: Record<string, unknown>, k: string) => (Object.hasOwn(o, k) ? o[k] : undefined);

/** A value for a reason: at most 60 characters, backticks stripped. */
function quote(v: unknown): string {
  const s = String(v).replaceAll("`", "");
  return s.length > 60 ? `${s.slice(0, 60)}…` : s;
}

class Refusal extends Error {}
const refuse = (reason: string): never => {
  throw new Refusal(reason);
};

function readStep(raw: unknown, n: number, installed?: ReadonlySet<string>): WorkflowStep {
  if (!isObject(raw)) refuse(`step ${n} must be an object`);
  const o = raw as Record<string, unknown>;
  const pattern = own(o, "pattern");
  if (typeof pattern !== "string" || !isPlainName(pattern))
    refuse(`step ${n}: pattern must be a plain name: ${quote(pattern)}`);
  const p = pattern as string;
  if (installed && !installed.has(p)) refuse(`step ${n}: pattern ${quote(p)} isn't installed`);
  const step: WorkflowStep = { pattern: p };

  const input = own(o, "input");
  if (input !== undefined) {
    if (typeof input !== "string" || input.includes("\0")) refuse(`step ${n}: input must be text with no NUL byte`);
    step.input = input as string;
  }

  const variables = own(o, "variables");
  if (variables !== undefined) {
    if (!isObject(variables)) refuse(`step ${n}: variables must be an object`);
    // No prototype: a variable named `__proto__` stays an own key on the copy.
    const out: Record<string, string> = Object.create(null);
    for (const [k, v] of Object.entries(variables as Record<string, unknown>)) {
      if (!VAR_NAME.test(k)) refuse(`step ${n}: variable name must be a plain identifier: ${quote(k)}`);
      if (typeof v !== "string" || v.includes("\0"))
        refuse(`step ${n}: variable ${quote(k)} must be text with no NUL byte`);
      out[k] = v as string;
    }
    step.variables = out;
  }

  for (const [key, check] of [
    ["model", isModelName],
    ["vendor", isVendorName],
  ] as const) {
    const v = own(o, key);
    if (v === undefined) continue;
    if (typeof v !== "string" || !check(v)) refuse(`step ${n}: ${key} isn't a ${key} name: ${quote(v)}`);
    step[key] = v as string;
  }
  return step;
}

/**
 * A chain file's text → its workflow, or why it can't run. Never throws. Without `installed`, step
 * patterns are checked only as plain names (the editor opens a chain whose pattern was deleted).
 */
export function parseWorkflow(raw: string, installed?: ReadonlySet<string>): Parsed {
  if (Buffer.byteLength(raw, "utf8") > MAX_BYTES) return { ok: false, reason: "chain is over 1 MB" };
  let doc: unknown;
  try {
    doc = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "not valid JSON" };
  }
  try {
    if (!isObject(doc)) refuse("a chain must be a JSON object with steps");
    const d = doc as Record<string, unknown>;
    const name = own(d, "name");
    if (name !== undefined && typeof name !== "string") refuse("name must be text");
    const steps = own(d, "steps");
    if (!Array.isArray(steps) || steps.length === 0) refuse("a chain needs a steps list with at least one step");
    const list = steps as unknown[];
    if (list.length > MAX_STEPS) refuse(`a chain has at most ${MAX_STEPS} steps, this one has ${list.length}`);
    const out: WorkflowStep[] = [];
    for (const [i, s] of list.entries()) {
      const step = readStep(s, i + 1, installed);
      // fabric's own words: `[step 2/2 summarize] repeats the previous step`.
      if (i > 0 && step.pattern === out[i - 1].pattern)
        refuse(`step ${i + 1}: ${quote(step.pattern)} repeats the previous step`);
      out.push(step);
    }
    return { ok: true, workflow: name === undefined ? { steps: out } : { name: name as string, steps: out } };
  } catch (e) {
    if (e instanceof Refusal) return { ok: false, reason: e.message };
    throw e;
  }
}

/** The file fabric reads: present keys only, in fabric's order, 2-space JSON plus a newline. */
export function chainJson(wf: Workflow): string {
  const steps = wf.steps.map((s) => {
    const o: Record<string, unknown> = { pattern: s.pattern };
    if (s.input !== undefined) o.input = s.input;
    if (s.variables !== undefined) o.variables = s.variables;
    if (s.model !== undefined) o.model = s.model;
    if (s.vendor !== undefined) o.vendor = s.vendor;
    return o;
  });
  return JSON.stringify(wf.name === undefined ? { steps } : { name: wf.name, steps }, null, 2) + "\n";
}

export type WorkflowItem = { name: string; path: string } & Parsed;

/** A chain file as it reads now: every view that lists, runs or edits one reads it here. */
export function readWorkflow(path: string, installed?: ReadonlySet<string>): Parsed {
  let raw: string;
  try {
    // Checked before the read, so a stray large file is refused without loading it.
    if (statSync(path).size > MAX_BYTES) return { ok: false, reason: "chain is over 1 MB" };
    raw = readFileSync(path, "utf8");
  } catch {
    return { ok: false, reason: "couldn't read the file" };
  }
  return parseWorkflow(raw, installed);
}

/**
 * Every chain in `dir`, a .json chain by its file stem. A file refused by its name keeps its whole name
 * (foo.yaml beside foo.json is its own row, never foo's id, pin or file). Dotfiles (saveOwnFile's `.<file>.<pid>.tmp` too) and folders are skipped. */
export function listWorkflows(dir: string, installed: ReadonlySet<string>): WorkflowItem[] {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: WorkflowItem[] = [];
  for (const e of entries) {
    if (e.name.startsWith(".") || !e.isFile()) continue;
    const ext = extname(e.name);
    const name = e.name.slice(0, e.name.length - ext.length);
    const path = join(dir, e.name);
    // An extensionless `foo` would read as the chain foo.json's name; the suffix can't be a plain name.
    if (ext !== ".json")
      out.push({
        name: ext ? e.name : `${e.name} (no extension)`,
        path,
        ok: false,
        reason: "only .json chains run from here",
      });
    else if (!isPlainName(name))
      out.push({ name: e.name, path, ok: false, reason: `not a plain name: ${quote(name)}` });
    else out.push({ name, path, ...readWorkflow(path, installed) });
  }
  return out.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

type SystemFor = (pattern: string) => string | undefined;

/** A chain's steps in order, e.g. "summarize → extract_wisdom". */
export const stepsText = (steps: readonly Pick<WorkflowStep, "pattern">[]) => steps.map((s) => s.pattern).join(" → ");

/** A model as shown beside a step or on a Result, e.g. "llama3.2:1b (Ollama)". */
export const modelLabel = (model: string, vendor?: string) => (vendor ? `${model} (${vendor})` : model);

/** A chain's step count, e.g. "1 step", "3 steps": Manage's row subtitle. */
export const stepsLabel = (wf: Workflow) => `${wf.steps.length} step${wf.steps.length === 1 ? "" : "s"}`;

/**
 * Every step pattern's {{variables}}, deduped, first-seen order: one form field each. A variable a step
 * sets itself, under every spelling its pattern uses, is skipped for that step: fabric lets the step's
 * value win, so a field would be ignored. Spellings are exact (`{{ name }}` and `{{name}}` are two to fabric).
 */
export function unionVariables(steps: readonly WorkflowStep[], systemFor: SystemFor): string[] {
  const needed = (s: WorkflowStep) =>
    [...variableSpellings(systemFor(s.pattern))]
      .filter(([, raws]) => ![...raws].every((raw) => s.variables && Object.hasOwn(s.variables, raw)))
      .map(([name]) => name);
  return [...new Set(steps.flatMap(needed))];
}

/** The chain's `--variable` map: each form value under every spelling any step uses. */
export function workflowVariableValues(
  steps: readonly WorkflowStep[],
  systemFor: SystemFor,
  values: Record<string, string>,
): Record<string, string> {
  return Object.assign({}, ...steps.map((s) => variableValues(systemFor(s.pattern), values)));
}

export interface StepProgress {
  step: number;
  total: number;
  pattern?: string;
}

const STEP_LINE = /^\[step (\d+)\/(\d+) ([^\]\n]{1,80})\] (.*)$/;

/** fabric's `[step 2/3 summarize] …` stderr line. The label is a pattern only when it is a plain name. */
export function parseStepLine(line: string): StepProgress | undefined {
  const m = STEP_LINE.exec(line);
  if (!m) return undefined;
  const p: StepProgress = { step: Number(m[1]), total: Number(m[2]) };
  if (isPlainName(m[3])) p.pattern = m[3];
  return p;
}

export const progressText = (p: StepProgress) => `Step ${p.step}/${p.total}${p.pattern ? ` ${p.pattern}` : ""}`;
