import { LDFlag } from "../types";

export interface Snippet {
  id: string;
  title: string;
  code: string;
}

/** The value type a flag evaluates to, derived from its variations. */
export type FlagValueType = "boolean" | "string" | "int" | "float" | "json";

export function getFlagValueType(flag: LDFlag): FlagValueType {
  if (flag.kind === "boolean") return "boolean";
  const values = (flag.variations ?? []).map((v) => v.value);
  if (values.length === 0) return "string";
  if (values.every((v) => typeof v === "boolean")) return "boolean";
  if (values.every((v) => typeof v === "string")) return "string";
  if (values.every((v) => typeof v === "number")) {
    return values.every((v) => Number.isInteger(v)) ? "int" : "float";
  }
  return "json";
}

function toCamelCase(key: string): string {
  return key.replace(/[-_.](\w)/g, (_, c: string) => c.toUpperCase());
}

type Lang = "js" | "ts" | "py" | "go" | "java" | "ruby";

/** Zero-value fallback literal per language and value type. */
const FALLBACKS: Record<FlagValueType, Record<Lang, string>> = {
  boolean: { js: "false", ts: "boolean", py: "False", go: "false", java: "false", ruby: "false" },
  string: { js: '""', ts: "string", py: '""', go: '""', java: '""', ruby: '""' },
  int: { js: "0", ts: "number", py: "0", go: "0", java: "0", ruby: "0" },
  float: { js: "0", ts: "number", py: "0.0", go: "0", java: "0.0", ruby: "0.0" },
  json: { js: "null", ts: "unknown", py: "None", go: "ldvalue.Null()", java: "LDValue.ofNull()", ruby: "nil" },
};

/** Typed evaluation method per SDK; `variable` is the declared result type where the language needs one. */
const METHODS: Record<FlagValueType, { node: string; go: string; java: string; javaType: string }> = {
  boolean: { node: "boolVariation", go: "BoolVariation", java: "boolVariation", javaType: "boolean" },
  string: { node: "stringVariation", go: "StringVariation", java: "stringVariation", javaType: "String" },
  int: { node: "numberVariation", go: "IntVariation", java: "intVariation", javaType: "int" },
  float: { node: "numberVariation", go: "Float64Variation", java: "doubleVariation", javaType: "double" },
  json: { node: "jsonVariation", go: "JSONVariation", java: "jsonValueVariation", javaType: "LDValue" },
};

/** SDK evaluation snippets for the most common LaunchDarkly server and client SDKs. */
export function getSnippets(flag: LDFlag): Snippet[] {
  const type = getFlagValueType(flag);
  const fallback = FALLBACKS[type];
  const method = METHODS[type];
  const key = flag.key;
  const camelKey = toCamelCase(key);

  return [
    {
      id: "node",
      title: "JavaScript / Node.js",
      code: `const value = await ldClient.${method.node}("${key}", context, ${fallback.js});`,
    },
    {
      id: "react",
      title: "TypeScript (React SDK)",
      code: `const { ${camelKey} } = useFlags<{ ${camelKey}: ${fallback.ts} }>();`,
    },
    {
      id: "python",
      title: "Python",
      code: `value = ld_client.variation("${key}", context, ${fallback.py})`,
    },
    {
      id: "go",
      title: "Go",
      code: `value, _ := ldClient.${method.go}("${key}", context, ${fallback.go})`,
    },
    {
      id: "java",
      title: "Java",
      code: `${method.javaType} value = ldClient.${method.java}("${key}", context, ${fallback.java});`,
    },
    {
      id: "ruby",
      title: "Ruby",
      code: `value = ld_client.variation("${key}", context, ${fallback.ruby})`,
    },
  ];
}
