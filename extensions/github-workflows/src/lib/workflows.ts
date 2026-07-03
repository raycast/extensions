import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

export type WorkflowInputType = "string" | "boolean" | "choice" | "number" | "environment";

export interface WorkflowInput {
  name: string;
  description?: string;
  required?: boolean;
  default?: string | boolean;
  type: WorkflowInputType;
  options?: string[];
}

export interface WorkflowFile {
  /** File name inside `.github/workflows`, e.g. `ci.yml` */
  fileName: string;
  path: string;
  /** Display name: the workflow's `name:` field, falling back to the file name */
  name: string;
  hasWorkflowDispatch: boolean;
  inputs: WorkflowInput[];
}

/** Reads and parses all workflow files in `<repoPath>/.github/workflows`. */
export function listWorkflowFiles(repoPath: string): WorkflowFile[] {
  const workflowsPath = path.join(repoPath, ".github", "workflows");
  if (!fs.existsSync(workflowsPath)) return [];

  let fileNames: string[];
  try {
    fileNames = fs.readdirSync(workflowsPath).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));
  } catch {
    return [];
  }

  const workflows: WorkflowFile[] = [];
  for (const fileName of fileNames) {
    const filePath = path.join(workflowsPath, fileName);
    const parsed = parseWorkflow(filePath, fileName);
    if (parsed) workflows.push(parsed);
  }

  return workflows.sort((a, b) => a.name.localeCompare(b.name));
}

/** List only workflows that declare a `workflow_dispatch` trigger. */
export function listDispatchableWorkflows(repoPath: string): WorkflowFile[] {
  return listWorkflowFiles(repoPath).filter((w) => w.hasWorkflowDispatch);
}

export function parseWorkflow(filePath: string, fileName: string): WorkflowFile | undefined {
  let contents: string;
  try {
    contents = fs.readFileSync(filePath, "utf8");
  } catch {
    return undefined;
  }

  let doc: unknown;
  try {
    doc = YAML.parse(contents);
  } catch {
    return undefined;
  }

  if (!doc || typeof doc !== "object") return undefined;
  const record = doc as Record<string, unknown>;

  const name = typeof record.name === "string" && record.name.trim().length > 0 ? record.name : fileName;

  const on = record.on;
  const { hasWorkflowDispatch, dispatchConfig } = analyzeOn(on);

  const inputs = hasWorkflowDispatch ? extractInputs(dispatchConfig) : [];

  return {
    fileName,
    path: filePath,
    name,
    hasWorkflowDispatch,
    inputs,
  };
}

function analyzeOn(on: unknown): { hasWorkflowDispatch: boolean; dispatchConfig: unknown } {
  if (typeof on === "string") {
    return { hasWorkflowDispatch: on === "workflow_dispatch", dispatchConfig: undefined };
  }

  if (Array.isArray(on)) {
    return { hasWorkflowDispatch: on.includes("workflow_dispatch"), dispatchConfig: undefined };
  }

  if (on && typeof on === "object") {
    const onRecord = on as Record<string, unknown>;
    const hasKey = Object.prototype.hasOwnProperty.call(onRecord, "workflow_dispatch");
    return { hasWorkflowDispatch: hasKey, dispatchConfig: onRecord.workflow_dispatch };
  }

  return { hasWorkflowDispatch: false, dispatchConfig: undefined };
}

function extractInputs(dispatchConfig: unknown): WorkflowInput[] {
  if (!dispatchConfig || typeof dispatchConfig !== "object") return [];

  const inputsRaw = (dispatchConfig as Record<string, unknown>).inputs;
  if (!inputsRaw || typeof inputsRaw !== "object") return [];

  const inputs: WorkflowInput[] = [];
  for (const [inputName, rawValue] of Object.entries(inputsRaw as Record<string, unknown>)) {
    const value = (rawValue ?? {}) as Record<string, unknown>;
    const type = normalizeType(value.type);

    inputs.push({
      name: inputName,
      description: typeof value.description === "string" ? value.description : undefined,
      required: typeof value.required === "boolean" ? value.required : false,
      default: typeof value.default === "string" || typeof value.default === "boolean" ? value.default : undefined,
      type,
      options: Array.isArray(value.options) ? value.options.map(String) : undefined,
    });
  }

  return inputs;
}

function normalizeType(type: unknown): WorkflowInputType {
  if (type === "boolean" || type === "choice" || type === "number" || type === "environment") {
    return type;
  }
  return "string";
}
