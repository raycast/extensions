import { kindOf, type ResultItem } from "./outputs";
import { SITE_URL } from "./wiro";

// Workflows: their inputs (from Workflow/Detail) and what a finished run
// produced (from Workflow/RunDetail), following the run engine's references.

export type WorkflowInputKind = "text" | "longtext" | "select" | "number" | "checkbox" | "file";

export interface WorkflowInput {
  key: string;
  label: string;
  kind: WorkflowInputKind;
  /** For file inputs: image, video, audio or file. */
  fileKind?: "image" | "video" | "audio" | "file";
  description?: string;
  options: Array<{ value: string; title: string }>;
  required: boolean;
  /** The value saved in the workflow, or its default. Secret-looking values are not filled in. */
  initialValue: string;
  /** The workflow has a saved value for it, which a run uses when the input is left out. */
  hasSavedValue: boolean;
}

export interface WorkflowInfo {
  fullSlug: string;
  title: string;
  description?: string;
  url: string;
  stepCount: number;
  inputs: WorkflowInput[];
  contents: Record<string, unknown>;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function parseJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

/** "<slug>-<slugid>", the id Workflow/Detail and Workflow/Run take. */
export function fullSlugOf(row: Record<string, unknown>): string | undefined {
  const slug = text(row.slug);
  const id = text(row.slugid);
  return slug && id ? `${slug}-${id}` : undefined;
}

export function workflowUrl(fullSlug: string): string {
  return `${SITE_URL}/workflows/${fullSlug}`;
}

// Saved values of fields named like a secret are not shown or prefilled. Names such as
// max_tokens or tokenizer are not secrets.
const SECRET_KEY = /(^|[_-])(api[_-]?key|secret([_-]?key)?|password|(access|auth|api)?[_-]?token)$/i;

function inputKind(field: Record<string, unknown>): Pick<WorkflowInput, "kind" | "fileKind"> {
  const ui = isObject(field.ui) ? field.ui : {};
  const widget = String(ui.field ?? "").toLowerCase();
  const type = String(field.type ?? "").toLowerCase();
  if (["image", "video", "audio"].includes(widget))
    return { kind: "file", fileKind: widget as "image" | "video" | "audio" };
  if (["file", "document", "fileinput"].includes(widget)) return { kind: "file", fileKind: "file" };
  if (Array.isArray(ui.options) && ui.options.length > 0) return { kind: "select" };
  if (["select", "dropdown"].includes(widget)) return { kind: "select" };
  if (["checkbox", "switch", "toggle"].includes(widget) || type === "boolean") return { kind: "checkbox" };
  if (["number", "range", "slider"].includes(widget) || type === "number" || type === "integer")
    return { kind: "number" };
  if (widget === "textarea") return { kind: "longtext" };
  return { kind: "text" };
}

function stringValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** A workflow's title, inputs and contents from its Workflow/Detail row. */
export function parseWorkflow(row: Record<string, unknown>): WorkflowInfo {
  const fullSlug = fullSlugOf(row) ?? text(row.slug) ?? "";
  const contents = parseJson(row.contents);
  const contentsObject = isObject(contents) ? contents : {};
  const schema = isObject(contentsObject.schema) ? contentsObject.schema : {};
  const fields = isObject(schema.input) ? schema.input : {};
  const metadata = isObject(contentsObject.metadata) ? contentsObject.metadata : {};
  const metadataInput = isObject(metadata.input) ? metadata.input : {};
  const saved = isObject(metadataInput.values) ? metadataInput.values : {};
  const required = Array.isArray(row.requiredinputs) ? new Set(row.requiredinputs.map(String)) : undefined;
  const nodes = isObject(contentsObject.nodes) ? contentsObject.nodes : {};

  const inputs = Object.entries(fields).map(([key, raw]): WorkflowInput => {
    const field = isObject(raw) ? raw : {};
    const ui = isObject(field.ui) ? field.ui : {};
    const options = (Array.isArray(ui.options) ? ui.options : []).filter(isObject).map((option) => {
      const value = stringValue(option.value);
      return { value, title: stringValue(option.text ?? option.value) || value };
    });
    const secret = SECRET_KEY.test(key);
    const savedValue = Object.prototype.hasOwnProperty.call(saved, key) ? saved[key] : undefined;
    const hasSavedValue = savedValue !== undefined && savedValue !== null && savedValue !== "";
    const initial = secret
      ? ""
      : stringValue(savedValue === undefined || savedValue === "" ? field.defaultValue : savedValue);
    return {
      key,
      label: text(field.label) ?? text(field.name) ?? key,
      ...inputKind(field),
      description: text(field.description),
      options,
      required: required ? required.has(key) : field.required === true,
      initialValue: initial,
      hasSavedValue,
    };
  });

  return {
    fullSlug,
    title: text(row.title) ?? fullSlug,
    description: text(row.description),
    url: workflowUrl(fullSlug),
    stepCount: Number(row.stepcount) || Object.keys(nodes).filter((key) => key !== "output").length,
    inputs,
    contents: contentsObject,
  };
}

export type WorkflowValue = string | boolean | string[];

/**
 * The value a form field shows: what the user entered, else the saved value or default. A
 * dropdown with neither shows its first option, and that option is the value it sends.
 */
export function workflowFieldValue(input: WorkflowInput, values: Record<string, WorkflowValue>): WorkflowValue {
  if (input.key in values) return values[input.key];
  if (input.kind === "checkbox") return input.initialValue === "true";
  if (input.kind === "file") return [];
  if (input.kind === "select" && !input.initialValue) return input.options[0]?.value ?? "";
  return input.initialValue;
}

/**
 * Whether a field reaches the run without a value. An untouched field keeps the workflow's
 * saved value; a field the user cleared does not, except a number, which has no empty value.
 */
export function workflowFieldIsEmpty(input: WorkflowInput, values: Record<string, WorkflowValue>): boolean {
  if (input.kind === "checkbox") return false;
  const value = workflowFieldValue(input, values);
  if (input.kind === "file") return (value as string[]).length === 0 && !input.hasSavedValue;
  if (String(value ?? "").trim()) return false;
  if (input.kind === "number") return !input.hasSavedValue;
  return input.key in values || !input.hasSavedValue;
}

/**
 * The run input for every field except files. Untouched fields are left out, so the run uses
 * the workflow's saved values. A text field the user cleared is sent empty, so the run does not
 * fall back to the saved value; a cleared number is left out and uses it.
 */
export function workflowRunInput(
  inputs: WorkflowInput[],
  values: Record<string, WorkflowValue>,
): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  for (const field of inputs) {
    if (field.kind === "file") continue;
    const value = workflowFieldValue(field, values);
    if (field.kind === "checkbox") {
      input[field.key] = value === true;
    } else if (field.kind === "number") {
      if (String(value).trim()) input[field.key] = Number(value);
    } else {
      const text = String(value ?? "").trim();
      if (text) {
        if (text !== field.initialValue) input[field.key] = text;
      } else if (field.key in values && (field.initialValue !== "" || field.hasSavedValue)) {
        input[field.key] = "";
      }
    }
  }
  return input;
}

export const RUN_TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled", "stopped"]);

export function isRunFinished(status: unknown): boolean {
  return RUN_TERMINAL_STATUSES.has(String(status));
}

export interface RunProgress {
  status: string;
  done: number;
  total: number;
  failedSteps: number;
}

export function runProgress(run: Record<string, unknown>, nodes: Array<Record<string, unknown>>): RunProgress {
  const status = text(run.status) ?? "running";
  return {
    status,
    done: nodes.filter((node) => node.status === "completed").length,
    total: nodes.length,
    failedSteps: nodes.filter((node) => ["failed", "aborted", "cancelled"].includes(String(node.status))).length,
  };
}

function pushValue(value: unknown, items: ResultItem[], prefix: string, depth = 0): void {
  if (depth > 6 || value === null || value === undefined) return;
  const id = () => `${prefix}-${items.length}`;
  if (Array.isArray(value)) {
    for (const entry of value) pushValue(entry, items, prefix, depth + 1);
    return;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (/^https?:\/\/\S+$/i.test(trimmed)) {
      const name = trimmed.split("?")[0].split("/").pop() || "output";
      items.push({ id: id(), kind: kindOf(undefined, trimmed), url: trimmed, name });
    } else {
      items.push({ id: id(), kind: "text", text: trimmed, name: `${prefix}.txt` });
    }
    return;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    items.push({ id: id(), kind: "text", text: String(value), name: `${prefix}.txt` });
    return;
  }
  if (!isObject(value)) return;
  if (Array.isArray(value.children) && value.children.length > 0) {
    pushValue(value.children, items, prefix, depth + 1);
    return;
  }
  if (value.contenttype === "raw" && isObject(value.content)) {
    const answer = value.content.answer;
    const joined = Array.isArray(answer)
      ? answer.map((part) => (typeof part === "string" ? part : isObject(part) ? String(part.text ?? "") : "")).join("")
      : stringValue(answer);
    if (joined.trim()) items.push({ id: id(), kind: "text", text: joined.trim(), name: `${prefix}.txt` });
    return;
  }
  if (typeof value.url === "string" && /^https?:\/\//i.test(value.url)) {
    const name = text(value.name) ?? value.url.split("?")[0].split("/").pop() ?? "output";
    items.push({
      id: id(),
      kind: kindOf(text(value.contenttype), name),
      url: value.url,
      name,
      mimeType: text(value.contenttype),
    });
  }
}

/**
 * What a finished run produced, field by field, resolving the End step's references:
 * "$node-X.outputs" is a model step's output list, "$node-X.<port>" a utility port,
 * "$input.<key>" the run's start value, anything else a literal.
 */
export function runOutputs(
  contents: unknown,
  nodes: Array<Record<string, unknown>>,
): Array<{ field: string; items: ResultItem[] }> {
  const contentsObject = isObject(contents) ? contents : {};
  const graph = isObject(contentsObject.nodes) ? contentsObject.nodes : {};
  const end = isObject(graph.output) ? graph.output : {};
  const fields = isObject(end.fields) ? end.fields : {};
  const schema = isObject(contentsObject.schema) ? contentsObject.schema : {};
  const schemaInput = isObject(schema.input) ? schema.input : {};
  const metadata = isObject(contentsObject.metadata) ? contentsObject.metadata : {};
  const metadataInput = isObject(metadata.input) ? metadata.input : {};
  const values = isObject(metadataInput.values) ? metadataInput.values : {};
  const byId = new Map(nodes.map((node) => [String(node.nodeId ?? ""), node]));

  const results: Array<{ field: string; items: ResultItem[] }> = [];
  Object.entries(fields).forEach(([field, reference], fieldIndex) => {
    const items: ResultItem[] = [];
    const prefix = `field${fieldIndex}`;
    for (const ref of Array.isArray(reference) ? reference : [reference]) {
      if (typeof ref !== "string" || !ref.startsWith("$")) {
        pushValue(ref, items, prefix);
        continue;
      }
      if (ref.startsWith("$input.")) {
        const key = ref.slice("$input.".length);
        const definition = isObject(schemaInput[key]) ? (schemaInput[key] as Record<string, unknown>) : {};
        const stored = values[key];
        pushValue(stored === undefined || stored === "" ? definition.defaultValue : stored, items, prefix);
        continue;
      }
      const match = /^\$(node-[^.]+)\.(.+)$/.exec(ref);
      const node = match ? byId.get(match[1]) : undefined;
      if (!match || !node || node.status !== "completed") continue;
      const outputs = parseJson(node.outputs);
      if (match[2] === "outputs" && Array.isArray(outputs)) pushValue(outputs, items, prefix);
      else if (isObject(outputs) && match[2] in outputs) pushValue(outputs[match[2]], items, prefix);
    }
    results.push({ field, items });
  });
  return results;
}
