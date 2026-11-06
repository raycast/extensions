import { parse } from "yaml";

export type WorkflowDispatchInputType = "string" | "choice" | "boolean" | "environment";

export type WorkflowDispatchInput = {
  name: string;
  description?: string;
  required: boolean;
  defaultValue?: string;
  type: WorkflowDispatchInputType;
  options?: string[];
};

const WORKFLOW_DISPATCH_INPUT_TYPES = new Set<WorkflowDispatchInputType>([
  "choice",
  "boolean",
  "environment",
  "string",
]);

export function parseWorkflowDocument(content: string): unknown {
  try {
    return parse(content) as unknown;
  } catch {
    return null;
  }
}

/**
 * Returns the declared `workflow_dispatch` inputs for a parsed workflow document.
 * Returns `null` when the workflow cannot be dispatched manually, and an empty
 * array when it can be dispatched without declared inputs.
 */
export function getWorkflowDispatchInputs(document: unknown): WorkflowDispatchInput[] | null {
  if (!document || typeof document !== "object") {
    return null;
  }

  const root = document as Record<string, unknown>;
  // YAML 1.1 parsers coerce the unquoted `on` key to the boolean `true`.
  const onSection = root.on ?? root["true"];

  if (onSection === undefined) {
    return null;
  }

  if (typeof onSection === "string") {
    return onSection === "workflow_dispatch" ? [] : null;
  }

  if (Array.isArray(onSection)) {
    return onSection.includes("workflow_dispatch") ? [] : null;
  }

  if (typeof onSection !== "object" || onSection === null) {
    return null;
  }

  const workflowDispatch = (onSection as Record<string, unknown>).workflow_dispatch;
  if (workflowDispatch === undefined) {
    return null;
  }

  if (!workflowDispatch || typeof workflowDispatch !== "object") {
    return [];
  }

  const inputs = (workflowDispatch as Record<string, unknown>).inputs;
  if (!inputs || typeof inputs !== "object") {
    return [];
  }

  return Object.entries(inputs as Record<string, Record<string, unknown> | null>).map(([name, value]) => {
    const input = value ?? {};
    const rawType = typeof input.type === "string" ? input.type : "string";
    const type = WORKFLOW_DISPATCH_INPUT_TYPES.has(rawType as WorkflowDispatchInputType)
      ? (rawType as WorkflowDispatchInputType)
      : "string";

    return {
      name,
      description: typeof input.description === "string" ? input.description : undefined,
      required: input.required === true,
      defaultValue: input.default != null ? String(input.default) : undefined,
      type,
      options: Array.isArray(input.options) ? input.options.map(String) : undefined,
    };
  });
}
