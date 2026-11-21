import JSON5 from "json5";
import { LosslessNumber, isLosslessNumber, isSafeNumber, parse, stringify } from "lossless-json";
import { XMLBuilder, XMLParser, XMLValidator } from "fast-xml-parser";
import { parseDocument, stringify as stringifyYaml } from "yaml";

export type JsonValue = null | boolean | string | number | LosslessNumber | JsonValue[] | { [key: string]: JsonValue };
export type InputFormat = "JSON" | "JSON5" | "YAML" | "XML" | "URL Params" | "Escaped JSON";
export interface Document {
  value: JsonValue;
  format: InputFormat;
  source: string;
}
export const MAX_INPUT_BYTES = 8 * 1024 * 1024;
export const PAGE_SIZE = 150;
export const PREVIEW_CHARS = 30_000;

function normalize(value: unknown, ancestors = new Set<object>(), depth = 0): JsonValue {
  if (depth > 256) throw new Error("The data exceeds 256 nested levels. Reduce the input depth.");
  if (value === null || typeof value === "string" || typeof value === "boolean" || isLosslessNumber(value))
    return value;
  if (typeof value === "bigint") return new LosslessNumber(String(value));
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("JSON does not support NaN or Infinity.");
    return value;
  }
  if (typeof value !== "object" || !value)
    throw new Error("The input contains a value that cannot be represented as JSON.");
  if (ancestors.has(value)) throw new Error("The input contains a circular reference and cannot be converted to JSON.");
  ancestors.add(value);
  let result: JsonValue;
  if (Array.isArray(value)) result = value.map((child) => normalize(child, ancestors, depth + 1));
  else {
    const object: Record<string, JsonValue> = Object.create(null);
    for (const [key, child] of Object.entries(value)) object[key] = normalize(child, ancestors, depth + 1);
    result = object;
  }
  ancestors.delete(value);
  return result;
}

export function parseInput(source: string): Document {
  if (new TextEncoder().encode(source).length > MAX_INPUT_BYTES)
    throw new Error("The input exceeds 8 MiB. Split the file before previewing.");
  const text = source.replace(/^\uFEFF/, "").trim();
  if (!text) throw new Error("Enter JSON, YAML, XML, or URL parameters.");
  let jsonError: unknown;
  try {
    const value = normalize(parse(text));
    if (typeof value === "string" && /^[{[]/.test(value.trim())) {
      try {
        return { value: normalize(parse(value)), format: "Escaped JSON", source };
      } catch {
        // A normal JSON string remains a string if its contents are not JSON.
      }
    }
    return { value, format: "JSON", source };
  } catch (error) {
    jsonError = error;
  }
  if (text.startsWith("<")) {
    if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error("XML DTDs and custom entities are not supported.");
    const valid = XMLValidator.validate(text);
    if (valid !== true) throw new Error(`XML line ${valid.err.line}: ${valid.err.msg}`);
    const value = new XMLParser({ ignoreAttributes: false, parseTagValue: false, parseAttributeValue: false }).parse(
      text,
    );
    return { value: normalize(value), format: "XML", source };
  }
  if (/^(https?:\/\/|\?)/.test(text) || /^[^\s{}[\]=:]+=[^\n]*$/.test(text)) {
    const query = /^https?:\/\//.test(text) ? new URL(text).search.slice(1) : text.replace(/^\?/, "");
    if (!query) throw new Error("The URL has no query parameters.");
    const value: Record<string, JsonValue> = Object.create(null);
    for (const [key, item] of new URLSearchParams(query)) {
      if (!Object.hasOwn(value, key)) value[key] = item;
      else if (Array.isArray(value[key])) (value[key] as JsonValue[]).push(item);
      else value[key] = [value[key], item];
    }
    return { value, format: "URL Params", source };
  }
  try {
    return { value: normalize(JSON5.parse(text)), format: "JSON5", source };
  } catch {
    // Only detect structured YAML; malformed JSON must not become a YAML scalar.
  }
  if (!/^[{[]/.test(text) && /(^|\n)\s*(?:[^\s:#][^\n]*:\s|-[ \t])/.test(text)) {
    const yaml = parseDocument(text, { intAsBigInt: true, uniqueKeys: true });
    if (yaml.errors.length) throw new Error(yaml.errors[0].message);
    const value = yaml.toJS({ maxAliasCount: 25 });
    return { value: normalize(value), format: "YAML", source };
  }
  throw new Error(`JSON parsing failed: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`);
}

export function formatJson(value: JsonValue, indent = 2): string {
  return stringify(value, null, indent) ?? "null";
}

export function kind(value: JsonValue): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (isLosslessNumber(value)) return "number";
  return typeof value;
}

export function isContainer(value: JsonValue): value is JsonValue[] | Record<string, JsonValue> {
  return value !== null && typeof value === "object" && !isLosslessNumber(value);
}

export function summary(value: JsonValue): string {
  if (isContainer(value))
    return Array.isArray(value) ? `[${value.length} items]` : `{${Object.keys(value).length} fields}`;
  const text = formatJson(value, 0);
  return text.length > 100 ? `${text.slice(0, 100)}…` : text;
}

export function childPath(path: string, key: string, parent: JsonValue): string {
  return Array.isArray(parent)
    ? `${path}[${key}]`
    : /^[A-Za-z_$][\w$]*$/.test(key)
      ? `${path}.${key}`
      : `${path}[${JSON.stringify(key)}]`;
}

export function codeMarkdown(text: string, language = "json"): string {
  const runs = text.match(/`+/g) ?? [];
  const fence = "`".repeat(Math.max(3, ...runs.map((run) => run.length + 1)));
  const clipped = text.length > PREVIEW_CHARS;
  return `${fence}${language}\n${text.slice(0, PREVIEW_CHARS)}\n${fence}${clipped ? "\n\nPreview shows the first 30,000 characters. Copy and export include the complete value." : ""}`;
}

export function sortKeys(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (!isContainer(value)) return value;
  const result: Record<string, JsonValue> = Object.create(null);
  for (const key of Object.keys(value).sort()) result[key] = sortKeys(value[key]);
  return result;
}

export function hasUnsafeNumbers(value: JsonValue): boolean {
  if (isLosslessNumber(value)) {
    return !isSafeNumber(value.value);
  }
  if (isContainer(value)) return Object.values(value).some(hasUnsafeNumbers);
  return false;
}

function plainForConversion(value: JsonValue): unknown {
  if (isLosslessNumber(value)) {
    const numeric = Number(value.value);
    if (/^-?\d+$/.test(value.value) && !Number.isSafeInteger(numeric)) return BigInt(value.value);
    if (!Number.isFinite(numeric)) throw new Error("A number is outside the target format range. Export as JSON.");
    if (!isSafeNumber(value.value)) throw new Error("Conversion would lose numeric precision. Export as JSON.");
    return numeric;
  }
  if (Array.isArray(value)) return value.map(plainForConversion);
  if (isContainer(value))
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, plainForConversion(child)]));
  return value;
}

export function toYaml(value: JsonValue): string {
  return stringifyYaml(plainForConversion(value));
}

export function toXml(value: JsonValue): string {
  if (hasUnsafeNumbers(value)) throw new Error("XML conversion may lose numeric precision. Export as JSON.");
  return new XMLBuilder({ format: true, ignoreAttributes: false }).build({ root: plainForConversion(value) });
}

export function toTypeScript(value: JsonValue, name = "Root"): string {
  const schema = (item: JsonValue, depth = 0): string => {
    if (depth > 64) return "unknown";
    if (Array.isArray(item)) {
      const types = [...new Set(item.slice(0, 200).map((child) => schema(child, depth + 1)))];
      return types.length ? `Array<${types.join(" | ")}>` : "unknown[]";
    }
    if (isContainer(item)) {
      const indent = "  ".repeat(depth + 1);
      const fields = Object.entries(item).map(
        ([key, child]) => `${indent}${JSON.stringify(key)}: ${schema(child, depth + 1)};`,
      );
      return `{\n${fields.join("\n")}\n${"  ".repeat(depth)}}`;
    }
    return kind(item);
  };
  return `// Inferred from the current value. Arrays sample their first 200 items.\nexport type ${name} = ${schema(value)};\n`;
}
