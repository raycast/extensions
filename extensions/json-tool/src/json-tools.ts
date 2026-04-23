export type JsonOperation =
  | "format"
  | "minify"
  | "repair"
  | "escape"
  | "unescape"
  | "unicode-escape"
  | "unicode-unescape"
  | "schema"
  | "path";

export type JsonMode = Extract<JsonOperation, "format" | "minify">;

export type TransformOptions = {
  mode?: JsonMode;
  operation?: JsonOperation;
  indent?: number;
  path?: string;
  sortKeys?: boolean;
};

export type TransformResult = {
  inputKind: "json" | "encoded-json-string";
  output: string;
  summary: string;
};

export type JsonPathSuggestion = {
  path: string;
  type: string;
  preview: string;
};

export class JsonToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JsonToolError";
  }
}

const MAX_ENCODED_JSON_DEPTH = 4;

export function transformJson(
  input: string,
  options: TransformOptions,
): TransformResult {
  const operation = options.operation ?? options.mode ?? "format";

  if (operation === "repair") {
    const repaired = repairJsonLikeText(input);
    const result = transformJson(repaired, {
      operation: "format",
      indent: options.indent,
      sortKeys: options.sortKeys,
    });

    return {
      ...result,
      output: result.output,
      summary: `repaired · ${result.summary}`,
    };
  }

  if (operation === "escape") {
    return transformText(input, JSON.stringify(input), "escaped JSON string");
  }

  if (operation === "unescape") {
    return transformText(
      input,
      unescapeJsonString(input),
      "unescaped JSON string",
    );
  }

  if (operation === "unicode-escape") {
    return transformText(input, escapeUnicode(input), "unicode escaped");
  }

  if (operation === "unicode-unescape") {
    return transformText(input, unescapeUnicode(input), "unicode unescaped");
  }

  const parsed = parseJsonInput(input);
  const value = options.sortKeys ? sortJsonKeys(parsed.value) : parsed.value;

  if (operation === "schema") {
    const schema = inferJsonSchema(value);
    const output = JSON.stringify(schema, null, options.indent ?? 2);

    return {
      inputKind: parsed.inputKind,
      output,
      summary: buildSummary(schema, output),
    };
  }

  if (operation === "path") {
    const pathValue = readJsonPath(value, options.path ?? "$");

    if (pathValue === undefined) {
      throw new JsonToolError(
        `No value found at path "${options.path ?? "$"}".`,
      );
    }

    const output = stringifyUnknown(pathValue, options.indent ?? 2);

    return {
      inputKind: parsed.inputKind,
      output,
      summary: buildSummary(pathValue, output),
    };
  }

  const spacing = operation === "format" ? (options.indent ?? 2) : 0;
  const output = stringifyUnknown(value, spacing);

  if (typeof output !== "string") {
    throw new JsonToolError("Input is not a valid JSON value.");
  }

  return {
    inputKind: parsed.inputKind,
    output,
    summary: buildSummary(value, output),
  };
}

export function parseJsonInput(input: string): {
  value: unknown;
  inputKind: TransformResult["inputKind"];
} {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new JsonToolError("Paste JSON first.");
  }

  let value = parseJson(trimmed);
  let depth = 0;
  let inputKind: TransformResult["inputKind"] = "json";

  while (
    typeof value === "string" &&
    depth < MAX_ENCODED_JSON_DEPTH &&
    looksLikeJson(value)
  ) {
    value = parseJson(value.trim());
    inputKind = "encoded-json-string";
    depth += 1;
  }

  return { value, inputKind };
}

export function sortJsonKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonKeys);
  }

  if (isPlainObject(value)) {
    return Object.keys(value)
      .sort((left, right) => left.localeCompare(right))
      .reduce<Record<string, unknown>>((sorted, key) => {
        sorted[key] = sortJsonKeys(value[key]);
        return sorted;
      }, {});
  }

  return value;
}

export function repairJsonLikeText(input: string): string {
  const withoutBom = input.replace(/^\uFEFF/, "").trim();
  const withoutComments = stripJsonComments(withoutBom);
  const withoutTrailingCommas = stripTrailingCommas(withoutComments);
  const withQuotedKeys = quoteUnquotedKeys(withoutTrailingCommas);

  return convertSingleQuotedStrings(withQuotedKeys);
}

export function listJsonPathSuggestions(input: string): JsonPathSuggestion[] {
  const { value } = parseJsonInput(input);
  const suggestions: JsonPathSuggestion[] = [];

  collectJsonPaths(value, "", suggestions, 0);
  return suggestions.slice(0, 500);
}

function parseJson(input: string): unknown {
  try {
    return JSON.parse(input) as unknown;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new JsonToolError(formatJsonParseError(error.message, input));
    }

    throw error;
  }
}

function transformText(
  input: string,
  output: string,
  summaryLabel: string,
): TransformResult {
  if (!input.trim()) {
    throw new JsonToolError("Paste text first.");
  }

  return {
    inputKind: "json",
    output,
    summary: `${summaryLabel}, ${output.length.toLocaleString()} chars`,
  };
}

function stringifyUnknown(value: unknown, spacing = 0): string {
  const output = JSON.stringify(value, null, spacing);

  if (typeof output === "string") {
    return output;
  }

  throw new JsonToolError("Input is not a valid JSON value.");
}

function unescapeJsonString(input: string): string {
  const value = parseJson(input.trim());

  if (typeof value === "string") {
    return value;
  }

  return stringifyUnknown(value, 2);
}

function escapeUnicode(input: string): string {
  if (!input.trim()) {
    throw new JsonToolError("Paste text first.");
  }

  return Array.from(input)
    .map((char) => {
      const codePoint = char.codePointAt(0);

      if (codePoint === undefined || codePoint <= 0x7f) {
        return char;
      }

      if (codePoint <= 0xffff) {
        return `\\u${codePoint.toString(16).padStart(4, "0")}`;
      }

      const normalized = codePoint - 0x10000;
      const high = 0xd800 + (normalized >> 10);
      const low = 0xdc00 + (normalized & 0x3ff);
      return `\\u${high.toString(16)}\\u${low.toString(16)}`;
    })
    .join("");
}

function unescapeUnicode(input: string): string {
  if (!input.trim()) {
    throw new JsonToolError("Paste text first.");
  }

  return input.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) =>
    String.fromCharCode(Number.parseInt(hex, 16)),
  );
}

function inferJsonSchema(value: unknown): unknown {
  if (value === null) {
    return { type: "null" };
  }

  if (Array.isArray(value)) {
    return {
      type: "array",
      items: mergeSchemas(value.map(inferJsonSchema)),
    };
  }

  if (isPlainObject(value)) {
    const properties = Object.keys(value)
      .sort((left, right) => left.localeCompare(right))
      .reduce<Record<string, unknown>>((schema, key) => {
        schema[key] = inferJsonSchema(value[key]);
        return schema;
      }, {});

    return {
      type: "object",
      properties,
      required: Object.keys(value).sort((left, right) =>
        left.localeCompare(right),
      ),
    };
  }

  return { type: typeof value };
}

function mergeSchemas(schemas: unknown[]): unknown {
  if (schemas.length === 0) {
    return {};
  }

  const schemaStrings = Array.from(
    new Set(schemas.map((schema) => JSON.stringify(schema))),
  );

  if (schemaStrings.length === 1 && schemaStrings[0]) {
    return JSON.parse(schemaStrings[0]) as unknown;
  }

  return {
    anyOf: schemaStrings.map((schema) => JSON.parse(schema) as unknown),
  };
}

function readJsonPath(value: unknown, path: string): unknown {
  const segments = tokenizePath(path.trim() || "$");

  return segments.reduce<unknown>((current, segment) => {
    if (current === undefined) {
      return undefined;
    }

    if (Array.isArray(current)) {
      const index = Number.parseInt(segment, 10);

      if (Number.isNaN(index)) {
        throw new JsonToolError(
          `Path segment "${segment}" is not an array index.`,
        );
      }

      return current[index];
    }

    if (isPlainObject(current)) {
      return current[segment];
    }

    return undefined;
  }, value);
}

function collectJsonPaths(
  value: unknown,
  path: string,
  suggestions: JsonPathSuggestion[],
  depth: number,
): void {
  if (path) {
    suggestions.push({
      path,
      type: describeJsonType(value),
      preview: previewJsonValue(value),
    });
  }

  if (depth >= 8) {
    return;
  }

  if (Array.isArray(value)) {
    value.slice(0, 30).forEach((item, index) => {
      collectJsonPaths(item, `${path}[${index}]`, suggestions, depth + 1);
    });
    return;
  }

  if (isPlainObject(value)) {
    Object.keys(value)
      .sort((left, right) => left.localeCompare(right))
      .forEach((key) => {
        collectJsonPaths(
          value[key],
          appendObjectPath(path, key),
          suggestions,
          depth + 1,
        );
      });
  }
}

function appendObjectPath(basePath: string, key: string): string {
  if (/^[A-Za-z_$][\w$]*$/.test(key)) {
    return basePath ? `${basePath}.${key}` : key;
  }

  return `${basePath}[${JSON.stringify(key)}]`;
}

function describeJsonType(value: unknown): string {
  if (Array.isArray(value)) {
    return `array(${value.length})`;
  }

  if (value === null) {
    return "null";
  }

  if (isPlainObject(value)) {
    return `object(${Object.keys(value).length})`;
  }

  return typeof value;
}

function previewJsonValue(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.length} items]`;
  }

  if (isPlainObject(value)) {
    return `{${Object.keys(value).length} keys}`;
  }

  const preview = JSON.stringify(value);
  return preview === undefined ? String(value) : preview.slice(0, 80);
}

function tokenizePath(path: string): string[] {
  const normalized = path.startsWith("$") ? path.slice(1) : path;
  const segments: string[] = [];
  let buffer = "";

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];

    if (char === ".") {
      pushPathBuffer(segments, buffer);
      buffer = "";
      continue;
    }

    if (char === "[") {
      pushPathBuffer(segments, buffer);
      buffer = "";

      const closeIndex = normalized.indexOf("]", index);

      if (closeIndex === -1) {
        throw new JsonToolError("Path is missing a closing bracket.");
      }

      segments.push(
        normalized.slice(index + 1, closeIndex).replace(/^["']|["']$/g, ""),
      );
      index = closeIndex;
      continue;
    }

    buffer += char;
  }

  pushPathBuffer(segments, buffer);
  return segments;
}

function pushPathBuffer(segments: string[], buffer: string): void {
  const trimmed = buffer.trim();

  if (trimmed) {
    segments.push(trimmed);
  }
}

function stripJsonComments(input: string): string {
  let output = "";
  let inString = false;
  let quote: '"' | "'" | undefined;
  let escaped = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (inString) {
      output += char;

      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        inString = false;
        quote = undefined;
      }

      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      output += char;
      continue;
    }

    if (char === "/" && next === "/") {
      while (index < input.length && !/[\r\n]/.test(input[index] ?? "")) {
        index += 1;
      }

      output += input[index] ?? "";
      continue;
    }

    if (char === "/" && next === "*") {
      index += 2;

      while (
        index < input.length &&
        !(input[index] === "*" && input[index + 1] === "/")
      ) {
        index += 1;
      }

      index += 1;
      continue;
    }

    output += char;
  }

  return output;
}

function stripTrailingCommas(input: string): string {
  let output = "";
  let inString = false;
  let quote: '"' | "'" | undefined;
  let escaped = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (inString) {
      output += char;

      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        inString = false;
        quote = undefined;
      }

      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      output += char;
      continue;
    }

    if (char === ",") {
      const nextMeaningful = input.slice(index + 1).match(/\S/);

      if (nextMeaningful?.[0] === "}" || nextMeaningful?.[0] === "]") {
        continue;
      }
    }

    output += char;
  }

  return output;
}

function quoteUnquotedKeys(input: string): string {
  let output = "";
  let inString = false;
  let quote: '"' | "'" | undefined;
  let escaped = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (inString) {
      output += char;

      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        inString = false;
        quote = undefined;
      }

      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      output += char;
      continue;
    }

    const keyMatch = input.slice(index).match(/^([A-Za-z_$][\w$-]*)\s*:/);

    if (keyMatch?.[1] && followsObjectBoundary(output)) {
      output += `"${keyMatch[1]}":`;
      index += keyMatch[0].length - 1;
      continue;
    }

    output += char;
  }

  return output;
}

function followsObjectBoundary(output: string): boolean {
  const previous = output.trimEnd().at(-1);
  return previous === "{" || previous === ",";
}

function convertSingleQuotedStrings(input: string): string {
  let output = "";
  let inSingleString = false;
  let escaped = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (!inSingleString && char === "'") {
      inSingleString = true;
      output += '"';
      continue;
    }

    if (inSingleString) {
      if (escaped) {
        output += char === "'" ? "'" : `\\${char}`;
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === '"') {
        output += '\\"';
        continue;
      }

      if (char === "'") {
        inSingleString = false;
        output += '"';
        continue;
      }
    }

    output += char;
  }

  return output;
}

function looksLikeJson(input: string): boolean {
  const first = input.trimStart().at(0);
  return first === "{" || first === "[";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildSummary(value: unknown, output: string): string {
  const root = Array.isArray(value) ? `array(${value.length})` : typeof value;
  const bytes = new TextEncoder().encode(output).length;
  return `${root}, ${output.length.toLocaleString()} chars, ${bytes.toLocaleString()} bytes`;
}

function formatJsonParseError(message: string, input: string): string {
  const position = findErrorPosition(message);

  if (position === undefined) {
    return message;
  }

  const { line, column } = offsetToLineColumn(input, position);
  return `${message} at line ${line}, column ${column}`;
}

function findErrorPosition(message: string): number | undefined {
  const match = message.match(/position (\d+)/i);

  if (!match?.[1]) {
    return undefined;
  }

  return Number.parseInt(match[1], 10);
}

function offsetToLineColumn(
  input: string,
  offset: number,
): { line: number; column: number } {
  const before = input.slice(0, offset);
  const lines = before.split(/\r\n|\r|\n/);
  const lastLine = lines.at(-1) ?? "";

  return {
    line: lines.length,
    column: lastLine.length + 1,
  };
}
