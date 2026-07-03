// The converter engine. Every format is a spoke around a single hub — a plain
// JavaScript value — so conversion is always `stringify(parse(input))`:
//
//   parseInput(text, from)     format text  → value
//   stringifyValue(value, to)  value        → format text
//   convert(text, from, to)    both, chained
//
// Library-backed formats (JSON5, YAML, TOML, XML, CSV/TSV) are thin wrappers; the
// JS object format lives in ./js-object, and .env / query strings are small
// hand-rolled encoders below. Detection is best-effort: the UI always offers an
// explicit source-format override, so `detectFormat` only has to be *good*.

import JSON5 from "json5";
import * as YAML from "yaml";
import * as TOML from "smol-toml";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import Papa from "papaparse";
import { type JsStringifyOptions, evalJs, stringifyJs } from "./js-object";

export type Format = "json" | "json5" | "yaml" | "toml" | "js" | "xml" | "csv" | "tsv" | "dotenv" | "query";

export interface FormatMeta {
  id: Format;
  label: string;
}

/** Formats in the order they are offered in the UI dropdowns. */
export const FORMATS: FormatMeta[] = [
  { id: "json", label: "JSON" },
  { id: "json5", label: "JSON5" },
  { id: "yaml", label: "YAML" },
  { id: "toml", label: "TOML" },
  { id: "js", label: "JS / TS Object" },
  { id: "xml", label: "XML" },
  { id: "csv", label: "CSV" },
  { id: "tsv", label: "TSV" },
  { id: "dotenv", label: ".env" },
  { id: "query", label: "Query String" },
];

export const LABEL: Record<Format, string> = Object.fromEntries(FORMATS.map((f) => [f.id, f.label])) as Record<
  Format,
  string
>;

export type Indent = "2" | "4" | "tab" | "minified";

export interface ConvertOptions {
  /** Indentation for the structured stringifiers (and minify when "minified"). */
  indent?: Indent;
  /** Sort object keys alphabetically (recursively) before stringifying. */
  sortKeys?: boolean;
  /** Options forwarded to the JS/TS object stringifier (only used when `to` is "js"). */
  js?: JsStringifyOptions;
}

// --- shared helpers ---------------------------------------------------------

/** JSON can't serialize BigInt; stringify it losslessly as a decimal string. */
function jsonReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}

function indentString(indent: Indent): string {
  return indent === "tab" ? "\t" : indent === "4" ? "    " : indent === "minified" ? "" : "  ";
}

/** Space argument for JSON.stringify / JSON5.stringify. */
function jsonSpace(indent: Indent): string | number {
  return indent === "minified" ? 0 : indent === "tab" ? "\t" : indent === "4" ? 4 : 2;
}

/** YAML forbids tabs for indentation, so non-space indents fall back to 2. */
function yamlIndent(indent: Indent): number {
  return indent === "4" ? 4 : 2;
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortValue((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date);
}

/** Coerce a raw string scalar (from .env / query strings) to its likely type. */
function coerceScalar(raw: string): unknown {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw === "null") return null;
  if (raw !== "" && !Number.isNaN(Number(raw))) return Number(raw);
  return raw;
}

function scalarToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value, jsonReplacer);
  return String(value);
}

// --- XML --------------------------------------------------------------------

const XML_ATTR_PREFIX = "@_";

function parseXml(text: string): unknown {
  return new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: XML_ATTR_PREFIX,
    parseAttributeValue: true,
    trimValues: true,
  }).parse(text);
}

function buildXml(value: unknown, indent: Indent): string {
  const pretty = indent !== "minified";
  return new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: XML_ATTR_PREFIX,
    format: pretty,
    indentBy: pretty ? indentString(indent) || "  " : "",
  })
    .build(value)
    .trimEnd();
}

// --- CSV / TSV --------------------------------------------------------------

function parseDsv(text: string, delimiter: string): unknown {
  const result = Papa.parse<Record<string, unknown>>(text.trim(), {
    delimiter,
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });
  if (result.errors.length) throw new Error(result.errors[0].message);
  return result.data;
}

function buildDsv(value: unknown, delimiter: string): string {
  const rows = Array.isArray(value) ? value : [value];
  return Papa.unparse(rows as object[], { delimiter });
}

// --- .env -------------------------------------------------------------------

function parseDotenv(text: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line
      .slice(0, eq)
      .trim()
      .replace(/^export\s+/, "");
    const val = line.slice(eq + 1).trim();
    if (val.length >= 2 && ((val[0] === '"' && val.endsWith('"')) || (val[0] === "'" && val.endsWith("'")))) {
      out[key] = val.slice(1, -1);
    } else {
      out[key] = coerceScalar(val);
    }
  }
  return out;
}

function buildDotenv(value: unknown): string {
  if (!isPlainObject(value)) throw new Error("'.env' output needs an object at the top level.");
  const lines: string[] = [];
  const visit = (val: unknown, prefix: string) => {
    if (Array.isArray(val)) {
      lines.push(formatEnvLine(prefix, JSON.stringify(val, jsonReplacer)));
    } else if (isPlainObject(val)) {
      for (const [key, child] of Object.entries(val)) visit(child, prefix ? `${prefix}_${key}` : key);
    } else {
      lines.push(formatEnvLine(prefix, scalarToString(val)));
    }
  };
  visit(value, "");
  return lines.join("\n");
}

function formatEnvLine(key: string, value: string): string {
  // Quote values that contain whitespace or characters that would break parsing.
  return `${key}=${/[\s#"'=]/.test(value) ? JSON.stringify(value) : value}`;
}

// --- query string -----------------------------------------------------------

function parseQuery(text: string): Record<string, unknown> {
  const params = new URLSearchParams(text.trim().replace(/^[?#]/, ""));
  const out: Record<string, unknown> = {};
  for (const [key, val] of params) {
    const value = coerceScalar(val);
    if (key in out) {
      const existing = out[key];
      if (Array.isArray(existing)) existing.push(value);
      else out[key] = [existing, value];
    } else {
      out[key] = value;
    }
  }
  return out;
}

function buildQuery(value: unknown): string {
  if (!isPlainObject(value)) throw new Error("Query-string output needs an object at the top level.");
  const params = new URLSearchParams();
  for (const [key, val] of Object.entries(value)) {
    if (Array.isArray(val)) for (const item of val) params.append(key, scalarToString(item));
    else params.append(key, scalarToString(val));
  }
  return params.toString();
}

// --- the public engine ------------------------------------------------------

export function parseInput(text: string, format: Format): unknown {
  switch (format) {
    case "json":
      return JSON.parse(text);
    case "json5":
      return JSON5.parse(text);
    case "yaml":
      return YAML.parse(text);
    case "toml":
      return TOML.parse(text);
    case "js":
      return evalJs(text);
    case "xml":
      return parseXml(text);
    case "csv":
      return parseDsv(text, ",");
    case "tsv":
      return parseDsv(text, "\t");
    case "dotenv":
      return parseDotenv(text);
    case "query":
      return parseQuery(text);
  }
}

export function stringifyValue(value: unknown, format: Format, options: ConvertOptions = {}): string {
  const v = options.sortKeys ? sortValue(value) : value;
  const indent = options.indent ?? "2";
  switch (format) {
    case "json":
      return JSON.stringify(v, jsonReplacer, jsonSpace(indent)) ?? "null";
    case "json5":
      return JSON5.stringify(v, { replacer: jsonReplacer, space: jsonSpace(indent) }) ?? "null";
    case "yaml":
      return YAML.stringify(v, { indent: yamlIndent(indent) }).trimEnd();
    case "toml":
      if (!isPlainObject(v)) throw new Error("TOML output needs an object at the top level.");
      return TOML.stringify(v).trimEnd();
    case "js":
      return stringifyJs(v, { ...options.js, indent: indentString(indent) });
    case "xml":
      return buildXml(v, indent);
    case "csv":
      return buildDsv(v, ",");
    case "tsv":
      return buildDsv(v, "\t");
    case "dotenv":
      return buildDotenv(v);
    case "query":
      return buildQuery(v);
  }
}

export function convert(text: string, from: Format, to: Format, options?: ConvertOptions): string {
  return stringifyValue(parseInput(text, from), to, options);
}

function parses(fn: () => unknown): boolean {
  try {
    fn();
    return true;
  } catch {
    return false;
  }
}

/**
 * Best-effort guess of a text's format. Detection never executes JS (the bracket
 * branch leans on syntax, not evaluation); the UI's source dropdown is the
 * override when a guess is wrong.
 */
export function detectFormat(text: string): Format {
  const t = text.trim();
  if (!t) return "json";

  if (/^<\??[A-Za-z!]/.test(t)) return "xml";
  if (/^export\s+default\b|\bmodule\.exports\s*=|\bexports\.[\w$]+\s*=/.test(t)) return "js";

  // TOML with a [section]/[[array]] header. Checked before the bracket branch so a
  // leading `[server]` line isn't mistaken for a JS/JSON array — but only when it
  // genuinely parses as TOML, so real `[…]` arrays still fall through to JSON.
  if (/^\[.+\]\s*$/m.test(t) && parses(() => TOML.parse(t))) return "toml";

  if (t[0] === "{" || t[0] === "[") {
    if (parses(() => JSON.parse(t))) return "json";
    if (parses(() => JSON5.parse(t))) return "json5";
    return "js"; // bracketed but not valid JSON/JSON5 → most likely a JS expression
  }

  // Single line of `a=1&b=2` pairs → query string.
  if (!t.includes("\n") && /^[?#]?[^=&\s]+=[^&]*(?:&[^=&\s]+=[^&]*)+$/.test(t)) return "query";

  const lines = t
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  // .env when every content line is KEY=VALUE (no spaces around the first '=').
  if (lines.length > 0 && lines.every((l) => /^(?:export\s+)?[A-Za-z_][\w.]*=/.test(l))) return "dotenv";

  // Delimiter-separated values: a header row plus at least one data row.
  if (lines.length >= 2) {
    if (lines[0].includes("\t")) return "tsv";
    if (lines[0].includes(",") && lines.every((l) => l.includes(","))) return "csv";
  }

  // `key = value` TOML without a section header.
  if (/^[\w".]+\s*=/m.test(t) && parses(() => TOML.parse(t))) return "toml";

  if (parses(() => YAML.parse(t))) return "yaml";
  return "json";
}
