export type JsonType = "object" | "array" | "string" | "number" | "boolean" | "null";

export interface JsonNode {
  id: string;
  key: string;
  path: string;
  type: JsonType;
  depth: number;
  value: unknown;
  preview: string;
  childrenCount: number;
  keywords: string[];
}

export interface JsonTree {
  nodes: JsonNode[];
  truncated: boolean;
}

export interface ParseOptions {
  parseNestedStrings: boolean;
}

export type ParseResult =
  | {
      ok: true;
      value: unknown;
      nestedStringCount: number;
    }
  | {
      ok: false;
      error: string;
    };

export const MAX_SEARCH_NODES = 3000;
export const PAGE_SIZE = 100;
export const MAX_PREVIEW_CHARACTERS = 40000;
const MAX_PREVIEW_LENGTH = 140;

export function parseJsonDocument(source: string, options: ParseOptions = { parseNestedStrings: true }): ParseResult {
  const input = source.trim();

  if (!input) {
    return { ok: false, error: "Enter or paste JSON first." };
  }

  const attempts = [source, ...createParseAttempts(input).slice(1)];
  let firstError = "Invalid JSON.";

  for (const attempt of attempts) {
    try {
      const value = JSON.parse(attempt);
      const stats = { nestedStringCount: 0 };
      const normalizedValue = options.parseNestedStrings ? parseNestedJsonStrings(value, stats) : value;

      return {
        ok: true,
        value: normalizedValue,
        nestedStringCount: stats.nestedStringCount,
      };
    } catch (error) {
      if (attempt === attempts[0]) firstError = describeParseError(source, error);
    }
  }

  return { ok: false, error: firstError };
}

export function buildJsonTree(value: unknown): JsonTree {
  const nodes: JsonNode[] = [];
  // Iterators keep traversal bounded without allocating all siblings or recursing
  // through deeply nested documents. Browsing itself does not use this index.
  const pending: Iterator<JsonNode>[] = [[createJsonNode(value)][Symbol.iterator]()];
  while (pending.length > 0) {
    const next = pending[pending.length - 1].next();
    if (next.done) {
      pending.pop();
      continue;
    }
    if (nodes.length === MAX_SEARCH_NODES) return { nodes, truncated: true };
    nodes.push(next.value);
    if (isContainer(next.value)) pending.push(iterateChildren(next.value));
  }
  return { nodes, truncated: false };
}

export function createJsonNode(value: unknown, path = "$", key = "$", depth = 0): JsonNode {
  const type = getJsonType(value);
  return {
    id: path,
    key,
    path,
    depth,
    value,
    type,
    preview: isContainerValue(value) ? summarizeJson(value) : getPreview(value),
    childrenCount: getChildrenCount(value),
    keywords: createKeywords(path, key, value, type),
  };
}

function* iterateChildren(parent: JsonNode): Generator<JsonNode> {
  if (Array.isArray(parent.value)) {
    for (let i = 0; i < parent.value.length; i++) {
      yield createJsonNode(parent.value[i], `${parent.path}[${i}]`, `[${i}]`, parent.depth + 1);
    }
  } else if (isRecord(parent.value)) {
    for (const key of Object.keys(parent.value)) {
      yield createJsonNode(parent.value[key], joinObjectPath(parent.path, key), key, parent.depth + 1);
    }
  }
}

export function getChildPage(parent: JsonNode, offset = 0, limit = PAGE_SIZE): JsonNode[] {
  const children: JsonNode[] = [];
  let index = 0;
  for (const child of iterateChildren(parent)) {
    if (index++ < offset) continue;
    children.push(child);
    if (children.length >= limit) break;
  }
  return children;
}

export function searchNodes(tree: JsonTree, query: string, typeFilter: "all" | JsonType): JsonNode[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return tree.nodes.filter((node) => {
    if (typeFilter !== "all" && node.type !== typeFilter) return false;
    const text = node.keywords.join(" ").toLowerCase();
    return terms.every((term) => text.includes(term));
  });
}

export function isContainer(node: JsonNode): boolean {
  return node.type === "object" || node.type === "array";
}

function isContainerValue(value: unknown): boolean {
  return value !== null && typeof value === "object";
}

export function jsonPreview(value: unknown): { markdown: string; truncated: boolean } {
  const chunks: string[] = [];
  let length = 0;
  let truncated = false;
  // Stop producing the preview once its display budget is reached. Decoding and
  // copying still use the complete value, even beyond the search index limit.
  for (const chunk of jsonChunks(value, 2)) {
    if (length + chunk.length > MAX_PREVIEW_CHARACTERS) {
      chunks.push(chunk.slice(0, MAX_PREVIEW_CHARACTERS - length), "\n…");
      truncated = true;
      break;
    }
    chunks.push(chunk);
    length += chunk.length;
  }
  return { markdown: `\`\`\`json\n${chunks.join("")}\n\`\`\``, truncated };
}

export function describeParseError(source: string, error: unknown): string {
  const message = error instanceof Error ? error.message : "Invalid JSON.";
  const position = /position (\d+)/i.exec(message);
  const lineColumn = /line (\d+) column (\d+)/i.exec(message);
  const prefix = position ? source.slice(0, Number(position[1])) : undefined;
  const line = prefix !== undefined ? prefix.split("\n").length : lineColumn ? Number(lineColumn[1]) : undefined;
  const column =
    prefix !== undefined ? prefix.length - prefix.lastIndexOf("\n") : lineColumn ? Number(lineColumn[2]) : undefined;
  const reason = message.replace(/\s+at position \d+.*$/i, "").replace(/\s*\(line \d+ column \d+\)/i, "");
  return line !== undefined ? `Line ${line}, column ${column}: ${reason}` : reason;
}

export function getJsonType(value: unknown): JsonType {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "string";
}

export function formatJson(value: unknown): string {
  return stringifyJson(value, 2);
}

export function compactJson(value: unknown): string {
  return stringifyJson(value, 0);
}

export function serializeJsonString(value: unknown): string {
  // Serialize the fully decoded value once, without re-encoding each child or
  // wrapping an already-stringified document in another JSON string literal.
  return compactJson(value);
}

export function summarizeJson(value: unknown): string {
  const type = getJsonType(value);

  if (type === "array") {
    const count = (value as unknown[]).length;
    return `${count} ${count === 1 ? "item" : "items"}`;
  }

  if (type === "object") {
    const count = Object.keys(value as Record<string, unknown>).length;
    return `${count} ${count === 1 ? "key" : "keys"}`;
  }

  return type;
}

export function looksLikeJsonInput(value: string): boolean {
  const input = value.trim();
  return (
    input.startsWith("{") ||
    input.startsWith("[") ||
    input.startsWith('"{') ||
    input.startsWith('"[') ||
    input.startsWith("'{") ||
    input.startsWith("'[")
  );
}

function createParseAttempts(input: string): string[] {
  const attempts = [input];

  if (isWrapped(input, "'")) {
    const inner = input.slice(1, -1);
    attempts.push(inner, unescapeCommonJsonString(inner));
  }

  return [...new Set(attempts)];
}

function parseNestedJsonStrings(value: unknown, stats: { nestedStringCount: number }): unknown {
  let result = value;
  interface Slot {
    value: unknown;
    set: (value: unknown) => void;
  }
  function* children(container: unknown): Generator<Slot> {
    if (Array.isArray(container)) {
      for (let index = 0; index < container.length; index++) {
        yield {
          value: container[index],
          set: (next) => {
            container[index] = next;
          },
        };
      }
    } else if (isRecord(container)) {
      for (const key of Object.keys(container)) {
        yield {
          value: container[key],
          set: (next) => {
            // __proto__ must remain an ordinary JSON property.
            Object.defineProperty(container, key, {
              value: next,
              writable: true,
              enumerable: true,
              configurable: true,
            });
          },
        };
      }
    }
  }
  const pending: Iterator<Slot>[] = [
    [
      {
        value,
        set: (next: unknown) => {
          result = next;
        },
      },
    ][Symbol.iterator](),
  ];
  while (pending.length > 0) {
    const slot = pending[pending.length - 1].next();
    if (slot.done) {
      pending.pop();
      continue;
    }
    let decoded = slot.value.value;
    while (typeof decoded === "string") {
      const next = parseJsonLikeString(decoded);
      if (!next.ok || Object.is(next.value, decoded)) break;
      decoded = next.value;
      stats.nestedStringCount++;
    }
    slot.value.set(decoded);
    if (isContainerValue(decoded)) pending.push(children(decoded));
  }
  return result;
}

function parseJsonLikeString(value: string): ParseResult {
  const input = value.trim();

  if (!isNestedJsonCandidate(input)) {
    return { ok: false, error: "Not a nested JSON string." };
  }

  for (const attempt of createParseAttempts(input)) {
    try {
      return {
        ok: true,
        value: JSON.parse(attempt),
        nestedStringCount: 0,
      };
    } catch {
      // Try the next representation. Some logs wrap escaped JSON in single quotes.
    }
  }

  return { ok: false, error: "Invalid nested JSON string." };
}

function isNestedJsonCandidate(value: string): boolean {
  // Quoted values may wrap another quoted layer, not just an object or array.
  // Plain strings such as IDs, "123" and "true" keep their existing type.
  return value.startsWith("{") || value.startsWith("[") || isWrapped(value, '"') || isWrapped(value, "'");
}

function isWrapped(value: string, quote: "'" | '"'): boolean {
  return value.startsWith(quote) && value.endsWith(quote);
}

function unescapeCommonJsonString(value: string): string {
  return value.replace(/\\"/g, '"').replace(/\\'/g, "'");
}

function getPreview(value: unknown): string {
  if (typeof value === "string") {
    return truncate(JSON.stringify(value));
  }

  return truncate(compactJson(value));
}

function truncate(value: string): string {
  if (value.length <= MAX_PREVIEW_LENGTH) return value;
  return `${value.slice(0, MAX_PREVIEW_LENGTH - 1)}...`;
}

function getChildrenCount(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (isRecord(value)) return Object.keys(value).length;
  return 0;
}

function createKeywords(path: string, key: string, value: unknown, type: JsonType): string[] {
  const keywords = [path, key, type];

  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    keywords.push(String(value));
  }

  return keywords;
}

function joinObjectPath(parentPath: string, key: string): string {
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) {
    return `${parentPath}.${key}`;
  }

  return `${parentPath}[${JSON.stringify(key)}]`;
}

function stringifyJson(value: unknown, spaces: number): string {
  try {
    const result = JSON.stringify(value, null, spaces);
    return result ?? String(value);
  } catch (error) {
    // JSON values can be deeper than the native stringifier's call stack. Keep
    // JSON.stringify's output semantics using an iterative fallback in that case.
    if (!(error instanceof RangeError)) throw error;
    return [...jsonChunks(value, spaces)].join("");
  }
}

function* jsonChunks(value: unknown, spaces: number): Generator<string> {
  type Frame = {
    value: unknown[] | Record<string, unknown>;
    keys: string[] | undefined;
    index: number;
    length: number;
    depth: number;
  };
  const frames: Frame[] = [];
  let next: { value: unknown; depth: number } | undefined = { value, depth: 0 };
  while (next || frames.length > 0) {
    if (next) {
      const current = next;
      next = undefined;
      if (Array.isArray(current.value) || isRecord(current.value)) {
        const keys = Array.isArray(current.value) ? undefined : Object.keys(current.value);
        const length = Array.isArray(current.value) ? current.value.length : keys!.length;
        yield keys ? "{" : "[";
        frames.push({ value: current.value, keys, index: 0, length, depth: current.depth });
      } else {
        yield JSON.stringify(current.value) ?? String(current.value);
      }
      continue;
    }
    const frame = frames[frames.length - 1];
    if (frame.index === frame.length) {
      if (spaces && frame.length) yield "\n" + " ".repeat(frame.depth * spaces);
      yield frame.keys ? "}" : "]";
      frames.pop();
      continue;
    }
    if (frame.index > 0) yield ",";
    if (spaces) yield "\n" + " ".repeat((frame.depth + 1) * spaces);
    const index = frame.index++;
    if (frame.keys) {
      const key = frame.keys[index];
      yield JSON.stringify(key) + (spaces ? ": " : ":");
      next = { value: (frame.value as Record<string, unknown>)[key], depth: frame.depth + 1 };
    } else {
      next = { value: (frame.value as unknown[])[index], depth: frame.depth + 1 };
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
