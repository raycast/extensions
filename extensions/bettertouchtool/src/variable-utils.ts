import { STANDARD_VARIABLES, type VariableDefinition } from "./variable-definitions";

export type VariableFilter = "all" | "context" | "dynamic" | "persistent";

export function filterVariableDefinitions(
  variables: readonly VariableDefinition[],
  filter: VariableFilter,
): VariableDefinition[] {
  if (filter === "all") return [...variables];
  return variables.filter((variable) => variable.category.toLowerCase() === filter);
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
