export type NamedTriggerInputType = "number" | "text";

export interface NamedTriggerInputDefinition {
  name: string;
  type: NamedTriggerInputType;
  description?: string;
  options: string[];
}

interface NamedTriggerInputConfig {
  [key: string]: unknown;
}

export function getNamedTriggerInputDefinitions(configValue: unknown): NamedTriggerInputDefinition[] {
  const config = parseConfig(configValue);
  if (!config) return [];

  const definitions: NamedTriggerInputDefinition[] = [];
  for (let index = 1; index <= 10; index++) {
    const name = readString(config[`BTTNamedTriggerAIVar${index}Name`]);
    if (!name) continue;

    const description = readString(config[`BTTNamedTriggerAIVar${index}Description`]);
    const options = readString(config[`BTTNamedTriggerAIVar${index}Options`])
      ?.split(/\r?\n/)
      .filter((option) => option.length > 0);

    definitions.push({
      name,
      type: parseInputType(config[`BTTNamedTriggerAIVar${index}Type`]),
      ...(description ? { description } : {}),
      options: options ?? [],
    });
  }

  return definitions;
}

export function parseNamedTriggerInputValues(
  definitions: readonly NamedTriggerInputDefinition[],
  values: Record<string, string>,
): { success: true; variables: Record<string, string | number> } | { success: false; error: string } {
  const variables: Record<string, string | number> = {};

  for (const [index, definition] of definitions.entries()) {
    const value = values[getNamedTriggerInputFieldId(index)] ?? "";
    if (definition.type === "text") {
      variables[definition.name] = value;
      continue;
    }

    const numberValue = Number(value);
    if (value.trim() === "" || !Number.isFinite(numberValue)) {
      return { success: false, error: `“${definition.name}” must be a finite number.` };
    }
    variables[definition.name] = numberValue;
  }

  return { success: true, variables };
}

export function getNamedTriggerInputFieldId(index: number): string {
  return `named-trigger-variable-${index}`;
}

function parseConfig(value: unknown): NamedTriggerInputConfig | undefined {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as NamedTriggerInputConfig;
  }
  if (typeof value !== "string") return undefined;

  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as NamedTriggerInputConfig)
      : undefined;
  } catch {
    return undefined;
  }
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function parseInputType(value: unknown): NamedTriggerInputType {
  return value === 1 || value === "1" || value === "number" ? "number" : "text";
}
