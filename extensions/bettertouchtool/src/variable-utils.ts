import { STANDARD_VARIABLES, type VariableDefinition } from "./variable-definitions";

export type VariableFilter = "all" | "context" | "dynamic" | "persistent" | "set";
export type WritableVariableType = "number" | "string";

export interface NewVariableFormValues {
  name: string;
  type: WritableVariableType;
  value: string;
}

export type ParsedNewVariable =
  { success: true; name: string; value: string | number } | { success: false; error: string };

export function parseNewVariable(
  values: NewVariableFormValues,
  existingNames: ReadonlySet<string> = new Set(),
): ParsedNewVariable {
  if (values.name.trim() === "") return { success: false, error: "Enter a variable name." };
  if (existingNames.has(values.name)) {
    return { success: false, error: `A variable named “${values.name}” already exists.` };
  }
  if (values.type === "string") return { success: true, name: values.name, value: values.value };

  const numberValue = Number(values.value);
  if (values.value.trim() === "" || !Number.isFinite(numberValue)) {
    return { success: false, error: "Enter a finite number." };
  }
  return { success: true, name: values.name, value: numberValue };
}

export function filterVariableDefinitions(
  variables: readonly VariableDefinition[],
  filter: VariableFilter,
  setVariableNames: ReadonlySet<string> = new Set(),
): VariableDefinition[] {
  if (filter === "all") return [...variables];
  if (filter === "set") return variables.filter((variable) => setVariableNames.has(variable.name));
  return variables.filter((variable) => variable.category.toLowerCase() === filter);
}

export function isVariableSet(variable: VariableDefinition, value: string | number, declaredType: string): boolean {
  if (variable.persistent) return true;
  const normalizedType = declaredType.trim().toLowerCase();
  return (normalizedType !== "" && normalizedType !== "unset") || value !== "";
}

export function formatVariableValuePreview(value: string | number, maximumLength = 60): string {
  const text = String(value).replace(/\s+/g, " ").trim();
  if (text === "") return '""';
  if (text.length <= maximumLength) return text;
  return `${text.slice(0, Math.max(0, maximumLength - 1))}…`;
}

export function mergeVariableDefinitions(persistentNames: readonly string[]): VariableDefinition[] {
  const variables = new Map(STANDARD_VARIABLES.map((variable) => [variable.name, variable]));

  for (const name of persistentNames) {
    variables.set(name, {
      name,
      category: "Persistent",
      persistent: true,
      readOnly: false,
    });
  }

  return [...variables.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function getPersistentVariableNames(root: unknown): string[] {
  if (!isRecord(root)) return [];
  const nestedVariables = root.BTTUserVariables;
  const variables = isRecord(nestedVariables) ? nestedVariables : root;
  return Object.keys(variables);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
