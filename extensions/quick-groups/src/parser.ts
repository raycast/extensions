import yaml from "js-yaml";
import { getActionDefinition, isRegisteredAction, isReservedActionNamespace } from "./actions";
import { Diagnostic, ReferenceAction, ReferenceField, ReferenceRecord } from "./model";

const SENSITIVE_PATTERN =
  /(?:^|[_\-\s])(password|passwd|passphrase|secret|token|api[_\-\s]?key|private[_\-\s]?key)(?:$|[_\-\s])/i;

// YAML normally treats a bare `~` as null. Quick Groups reserves it as the familiar
// portable home-directory shorthand while retaining the other YAML null spellings.
const referenceNullType = new yaml.Type("tag:yaml.org,2002:null", {
  kind: "scalar",
  resolve: (value) => value === null || /^(?:null|Null|NULL)$/.test(value),
  construct: () => null,
});
const referenceSchema = yaml.DEFAULT_SCHEMA.extend({ implicit: [referenceNullType] });

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function scalarToString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (value === null) return "null";
  return undefined;
}

function resolveMappingValues(
  input: Record<string, unknown>,
  fieldLabel: string,
): { values: Record<string, string>; sensitiveNames: Set<string> } {
  const rawValues = new Map<string, string>();
  for (const [name, rawValue] of Object.entries(input)) {
    const value = scalarToString(rawValue);
    if (value === undefined) throw new Error(`Field "${fieldLabel}.${name}" must be a scalar`);
    rawValues.set(name, value);
  }

  const resolved = new Map<string, { value: string; sensitive: boolean }>();
  const resolving = new Set<string>();
  const escapedDollar = "\u0000REFERENCE_ESCAPED_DOLLAR\u0000";

  function resolve(name: string): { value: string; sensitive: boolean } {
    const cached = resolved.get(name);
    if (cached !== undefined) return cached;
    const rawValue = rawValues.get(name);
    if (rawValue === undefined) {
      throw new Error(`Field "${fieldLabel}" references unknown value "${name}"`);
    }
    if (resolving.has(name)) {
      throw new Error(`Field "${fieldLabel}" contains a substitution cycle involving "${name}"`);
    }

    resolving.add(name);
    let sensitive = Boolean(getActionDefinition(name)?.sensitive) || SENSITIVE_PATTERN.test(name);
    const value = rawValue
      .replace(/\$\$/g, escapedDollar)
      .replace(/\$\{([^}]+)\}/g, (_match, reference: string) => {
        const replacement = resolve(reference);
        sensitive ||= replacement.sensitive;
        return replacement.value;
      })
      .replaceAll(escapedDollar, "$");
    resolving.delete(name);
    const result = { value, sensitive };
    resolved.set(name, result);
    return result;
  }

  const entries = [...rawValues.keys()].map((name) => [name, resolve(name)] as const);
  return {
    values: Object.fromEntries(entries.map(([name, result]) => [name, result.value])),
    sensitiveNames: new Set(entries.filter(([, result]) => result.sensitive).map(([name]) => name)),
  };
}

function parseField(label: string, input: unknown, source: string, collection: string, record: string): ReferenceField {
  const sensitiveLabel = SENSITIVE_PATTERN.test(label);
  const scalar = scalarToString(input);
  if (scalar !== undefined) {
    return {
      label,
      effectiveValue: scalar,
      values: [scalar],
      actions: [],
      sensitive: sensitiveLabel,
    };
  }

  if (!isObject(input)) {
    throw new Error(`Field "${label}" must be a scalar or mapping`);
  }

  const resolvedInput = resolveMappingValues(input, label);

  const values: string[] = [];
  const actions: ReferenceAction[] = [];
  let explicitValue: string | undefined;
  let firstValue: string | undefined;
  let firstValueSensitive = false;

  for (const [annotation, value] of Object.entries(resolvedInput.values)) {
    const annotationSensitive = resolvedInput.sensitiveNames.has(annotation);
    if (!annotationSensitive) values.push(value);
    if (firstValue === undefined) {
      firstValue = value;
      firstValueSensitive = annotationSensitive;
    }
    if (annotation === "value") explicitValue = value;
    else if (isRegisteredAction(annotation)) {
      actions.push({ kind: annotation, target: value });
    } else if (isReservedActionNamespace(annotation)) {
      throw new Error(`Field "${label}" has an unknown or incomplete action "${annotation}"`);
    }
  }

  const effectiveValue = explicitValue ?? firstValue;
  if (effectiveValue === undefined) {
    throw new Error(`Field "${label}" has no value in ${source} (${collection}/${record})`);
  }
  const sensitive =
    sensitiveLabel || (explicitValue === undefined ? firstValueSensitive : resolvedInput.sensitiveNames.has("value"));
  return { label, effectiveValue, values, actions, sensitive };
}

export function parseReferenceYaml(
  contents: string,
  source: string,
): { records: ReferenceRecord[]; diagnostics: Diagnostic[] } {
  let document: unknown;
  try {
    document = yaml.load(contents, { schema: referenceSchema });
  } catch (error) {
    const yamlError = error as {
      reason?: string;
      message?: string;
      mark?: { line?: number; column?: number; snippet?: string };
    };
    return {
      records: [],
      diagnostics: [
        {
          source,
          message: yamlError.reason ?? yamlError.message?.split("\n")[0] ?? "Invalid YAML",
          line: yamlError.mark?.line === undefined ? undefined : yamlError.mark.line + 1,
          column: yamlError.mark?.column === undefined ? undefined : yamlError.mark.column + 1,
          snippet: yamlError.mark?.snippet,
        },
      ],
    };
  }

  if (document === undefined || document === null) return { records: [], diagnostics: [] };
  if (!isObject(document))
    return {
      records: [],
      diagnostics: [{ source, message: "Top level must be a mapping of collections" }],
    };

  const records: ReferenceRecord[] = [];
  const diagnostics: Diagnostic[] = [];
  for (const [collection, rawCollection] of Object.entries(document)) {
    if (!isObject(rawCollection)) {
      diagnostics.push({ source, collection, message: "Collection must be a mapping of records" });
      continue;
    }
    for (const [name, rawRecord] of Object.entries(rawCollection)) {
      if (!isObject(rawRecord)) {
        diagnostics.push({
          source,
          collection,
          record: name,
          message: "Record must be a mapping of fields",
        });
        continue;
      }
      try {
        const fields = Object.entries(rawRecord).map(([label, input]) =>
          parseField(label, input, source, collection, name),
        );
        records.push({ collection, name, fields, source });
      } catch (error) {
        diagnostics.push({
          source,
          collection,
          record: name,
          message: error instanceof Error ? error.message : "Invalid field",
        });
      }
    }
  }
  return { records, diagnostics };
}
