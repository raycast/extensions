import type {
  AggregatedCondition,
  AggregatedParameter,
  FirebaseValueType,
  ParsedValue,
  ProjectConfig,
  ProjectSnapshot,
  RemoteConfigCondition,
  RemoteConfigParameter,
  RemoteConfigTemplate,
  SemanticValueType,
} from "./types";

function stableClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function cloneTemplate(
  template: RemoteConfigTemplate,
): RemoteConfigTemplate {
  return stableClone(template);
}

export function inferSemanticType(
  raw: string,
  firebaseValueType?: FirebaseValueType,
): SemanticValueType {
  const normalized = raw.trim();
  if (firebaseValueType === "BOOLEAN") return "bool";
  if (firebaseValueType === "JSON") return "json";
  if (firebaseValueType === "NUMBER") {
    return normalized.includes(".") ? "float" : "int";
  }

  if (/^(true|false)$/i.test(normalized)) return "bool";
  if (/^-?(0|[1-9]\d*)$/.test(normalized)) return "int";
  if (/^-?(0|[1-9]\d*)\.\d+$/.test(normalized)) return "float";
  if (
    (normalized.startsWith("{") && normalized.endsWith("}")) ||
    (normalized.startsWith("[") && normalized.endsWith("]"))
  ) {
    try {
      JSON.parse(normalized);
      return "json";
    } catch {
      return "string";
    }
  }

  return "string";
}

export function parseRemoteConfigValue(
  raw: string,
  firebaseValueType?: FirebaseValueType,
): ParsedValue {
  const semanticType = inferSemanticType(raw, firebaseValueType);

  switch (semanticType) {
    case "bool":
      return { raw, semanticType, parsed: raw.trim().toLowerCase() === "true" };
    case "int":
      return { raw, semanticType, parsed: Number.parseInt(raw, 10) };
    case "float":
      return { raw, semanticType, parsed: Number.parseFloat(raw) };
    case "json":
      try {
        return {
          raw,
          semanticType,
          parsed: JSON.parse(raw) as unknown[] | Record<string, unknown>,
        };
      } catch {
        return { raw, semanticType: "string", parsed: raw };
      }
    default:
      return { raw, semanticType, parsed: raw };
  }
}

export function formatParsedValue(value: ParsedValue | null): string {
  if (!value) return "missing";
  if (value.semanticType === "json") {
    return JSON.stringify(value.parsed, null, 2);
  }
  return String(value.raw);
}

export function getConditions(
  template: RemoteConfigTemplate,
): RemoteConfigCondition[] {
  return [...(template.conditions ?? [])].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

export function getParameters(
  template: RemoteConfigTemplate,
): Array<[string, RemoteConfigParameter]> {
  return Object.entries(template.parameters ?? {}).sort(([left], [right]) =>
    left.localeCompare(right),
  );
}

export function getConditionReferences(
  template: RemoteConfigTemplate,
  conditionName: string,
): string[] {
  return getParameters(template)
    .filter(([, parameter]) =>
      Boolean(parameter.conditionalValues?.[conditionName]),
    )
    .map(([key]) => key);
}

export function aggregateParameters(
  snapshots: ProjectSnapshot[],
): AggregatedParameter[] {
  const keySet = new Set<string>();
  for (const snapshot of snapshots) {
    for (const key of Object.keys(snapshot.template.parameters ?? {})) {
      keySet.add(key);
    }
  }

  const rows: AggregatedParameter[] = [];
  for (const key of [...keySet].sort((left, right) =>
    left.localeCompare(right),
  )) {
    const projectValues = [];
    const projectsMissing: ProjectConfig[] = [];
    const firebaseValueTypes = new Set<FirebaseValueType>();
    const semanticTypes = new Set<SemanticValueType>();
    const defaultValues = new Set<string>();
    let hasConditionalValues = false;

    for (const snapshot of snapshots) {
      const parameter = snapshot.template.parameters?.[key];
      if (!parameter) {
        projectsMissing.push(snapshot.project);
        continue;
      }

      const rawDefault = parameter.defaultValue?.value;
      const parsedDefault =
        typeof rawDefault === "string"
          ? parseRemoteConfigValue(rawDefault, parameter.valueType)
          : null;
      if (parameter.valueType) firebaseValueTypes.add(parameter.valueType);
      if (parsedDefault) semanticTypes.add(parsedDefault.semanticType);
      if (rawDefault !== undefined) defaultValues.add(rawDefault);

      const conditionalValues = Object.entries(
        parameter.conditionalValues ?? {},
      )
        .sort(([left], [right]) => left.localeCompare(right))
        .filter(([, value]) => typeof value.value === "string")
        .map(([conditionName, value]) => {
          hasConditionalValues = true;
          const parsedValue = parseRemoteConfigValue(
            value.value,
            parameter.valueType,
          );
          semanticTypes.add(parsedValue.semanticType);
          return {
            conditionName,
            value,
            parsedValue,
          };
        });

      projectValues.push({
        project: snapshot.project,
        parameter,
        parsedDefault,
        conditionalValues,
      });
    }

    rows.push({
      key,
      projectValues,
      projectsMissing,
      firebaseValueTypes: [...firebaseValueTypes],
      semanticTypes: [...semanticTypes],
      hasConditionalValues,
      divergentDefaults: defaultValues.size > 1,
    });
  }

  return rows;
}

export function aggregateConditions(
  snapshots: ProjectSnapshot[],
): AggregatedCondition[] {
  const conditionNames = new Set<string>();
  for (const snapshot of snapshots) {
    for (const condition of snapshot.template.conditions ?? []) {
      conditionNames.add(condition.name);
    }
  }

  const rows: AggregatedCondition[] = [];
  for (const name of [...conditionNames].sort((left, right) =>
    left.localeCompare(right),
  )) {
    const projectValues = [];
    const projectsMissing: ProjectConfig[] = [];
    const expressions = new Set<string>();

    for (const snapshot of snapshots) {
      const condition = (snapshot.template.conditions ?? []).find(
        (entry) => entry.name === name,
      );
      if (!condition) {
        projectsMissing.push(snapshot.project);
        continue;
      }

      expressions.add(condition.expression);
      projectValues.push({
        project: snapshot.project,
        condition,
        parameterReferences: getConditionReferences(snapshot.template, name),
      });
    }

    rows.push({
      name,
      projectValues,
      projectsMissing,
      divergentExpressions: expressions.size > 1,
    });
  }

  return rows;
}

export function buildParameterMarkdown(row: AggregatedParameter): string {
  const lines = [`# ${row.key}`, ""];
  lines.push(`- Projects with key: ${row.projectValues.length}`);
  lines.push(`- Projects missing key: ${row.projectsMissing.length}`);
  lines.push(
    `- Firebase value types: ${row.firebaseValueTypes.join(", ") || "unknown"}`,
  );
  lines.push(`- Semantic types: ${row.semanticTypes.join(", ") || "unknown"}`);
  lines.push(
    `- Conditional values: ${row.hasConditionalValues ? "yes" : "no"}`,
  );
  lines.push(`- Divergent defaults: ${row.divergentDefaults ? "yes" : "no"}`);
  lines.push("");

  for (const projectValue of row.projectValues) {
    lines.push(`## ${projectValue.project.displayName}`);
    lines.push(
      `- Default: \`${projectValue.parsedDefault ? formatParsedValue(projectValue.parsedDefault) : "missing"}\``,
    );
    lines.push(
      `- Description: ${projectValue.parameter.description || "none"}`,
    );
    lines.push(
      `- Firebase type: ${projectValue.parameter.valueType || "unknown"}`,
    );
    if (projectValue.conditionalValues.length > 0) {
      lines.push("- Overrides:");
      for (const override of projectValue.conditionalValues) {
        lines.push(
          `  - ${override.conditionName}: \`${formatParsedValue(override.parsedValue)}\``,
        );
      }
    }
    lines.push("");
  }

  if (row.projectsMissing.length > 0) {
    lines.push("## Missing In");
    for (const project of row.projectsMissing) {
      lines.push(`- ${project.displayName}`);
    }
  }

  return lines.join("\n");
}

export function buildConditionMarkdown(row: AggregatedCondition): string {
  const lines = [`# ${row.name}`, ""];
  lines.push(`- Projects with condition: ${row.projectValues.length}`);
  lines.push(`- Projects missing condition: ${row.projectsMissing.length}`);
  lines.push(
    `- Divergent expressions: ${row.divergentExpressions ? "yes" : "no"}`,
  );
  lines.push("");

  for (const projectValue of row.projectValues) {
    lines.push(`## ${projectValue.project.displayName}`);
    lines.push("```");
    lines.push(projectValue.condition.expression);
    lines.push("```");
    lines.push(
      `Referenced by: ${projectValue.parameterReferences.length > 0 ? projectValue.parameterReferences.join(", ") : "no parameters"}`,
    );
    lines.push("");
  }

  if (row.projectsMissing.length > 0) {
    lines.push("## Missing In");
    for (const project of row.projectsMissing) {
      lines.push(`- ${project.displayName}`);
    }
  }

  return lines.join("\n");
}

export function buildProjectSummary(snapshot: ProjectSnapshot): string {
  const parameterCount = Object.keys(snapshot.template.parameters ?? {}).length;
  const conditionCount = (snapshot.template.conditions ?? []).length;
  return `${snapshot.project.displayName}: ${parameterCount} parameters, ${conditionCount} conditions`;
}
