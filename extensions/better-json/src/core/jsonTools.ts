import { ExactJsonNumber, parseExactJson } from "./jsonNumbers";

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
}

export interface JsonTree {
  nodes: JsonNode[];
  searchText: string[];
  indexedCharacters: number;
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
export const MAX_SEARCH_CHARACTERS = 1000000;
export const MAX_SEARCH_FIELD_CHARACTERS = 4096;
export const PAGE_SIZE = 100;
export const MAX_PREVIEW_CHARACTERS = 40000;
export const MAX_LABEL_CHARACTERS = 500;
const MAX_PREVIEW_LENGTH = 140;
const STRING_CHUNK_SIZE = 1024;
// Parsed documents are immutable apart from replacing values during decoding.
// Cache object keys so counts and later pages do not enumerate every sibling.
const objectKeys = new WeakMap<Record<string, unknown>, string[]>();

export function parseJsonDocument(source: string, options: ParseOptions = { parseNestedStrings: true }): ParseResult {
  const input = source.trim();

  if (!input) {
    return { ok: false, error: "Enter or paste JSON first." };
  }

  const attempts = [source, ...createParseAttempts(input).slice(1)];
  let firstError = "Invalid JSON.";

  for (const attempt of attempts) {
    try {
      const value = parseExactJson(attempt);
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
  const tree: JsonTree = { nodes, searchText: [], indexedCharacters: 0, truncated: false };
  // Iterators keep traversal bounded without allocating all siblings or recursing
  // through deeply nested documents. Browsing itself does not use this index.
  const pending: Iterator<JsonNode>[] = [[createJsonNode(value)][Symbol.iterator]()];
  while (pending.length > 0) {
    const next = pending[pending.length - 1].next();
    if (next.done) {
      pending.pop();
      continue;
    }
    if (nodes.length === MAX_SEARCH_NODES || tree.indexedCharacters === MAX_SEARCH_CHARACTERS) {
      tree.truncated = true;
      break;
    }
    const indexed = indexNode(next.value, MAX_SEARCH_CHARACTERS - tree.indexedCharacters);
    nodes.push(next.value);
    tree.searchText.push(indexed.text);
    tree.indexedCharacters += indexed.text.length;
    tree.truncated ||= indexed.truncated;
    if (isContainer(next.value)) pending.push(iterateChildren(next.value));
  }
  return tree;
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
  };
}

function* iterateChildren(parent: JsonNode): Generator<JsonNode> {
  if (Array.isArray(parent.value)) {
    for (let i = 0; i < parent.value.length; i++) {
      yield createJsonNode(parent.value[i], `${parent.path}[${i}]`, `[${i}]`, parent.depth + 1);
    }
  } else if (isRecord(parent.value)) {
    for (const key of getObjectKeys(parent.value)) {
      yield createJsonNode(parent.value[key], joinObjectPath(parent.path, key), key, parent.depth + 1);
    }
  }
}

export function getChildPage(parent: JsonNode, offset = 0, limit = PAGE_SIZE): JsonNode[] {
  if (!Number.isFinite(offset) || !Number.isFinite(limit) || limit < 1) return [];
  const start = Math.max(0, Math.floor(offset));
  const end = Math.min(parent.childrenCount, start + Math.floor(limit));
  const children: JsonNode[] = [];
  if (Array.isArray(parent.value)) {
    for (let index = start; index < end; index++) {
      children.push(
        createJsonNode(parent.value[index], parent.path + "[" + index + "]", "[" + index + "]", parent.depth + 1),
      );
    }
  } else if (isRecord(parent.value)) {
    const keys = getObjectKeys(parent.value);
    for (let index = start; index < end; index++) {
      const key = keys[index];
      children.push(createJsonNode(parent.value[key], joinObjectPath(parent.path, key), key, parent.depth + 1));
    }
  }
  return children;
}

export function createChildPager(parent: JsonNode): (count: number) => JsonNode[] {
  const children: JsonNode[] = [];
  return (count) => {
    const limit = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
    if (limit > children.length) {
      for (const child of getChildPage(parent, children.length, limit - children.length)) children.push(child);
    }
    return children.slice(0, limit);
  };
}

export function searchNodes(tree: JsonTree, query: string, typeFilter: "all" | JsonType): JsonNode[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return tree.nodes.filter((node, index) => {
    if (typeFilter !== "all" && node.type !== typeFilter) return false;
    if (terms.length === 0) return true;
    const text = tree.searchText[index];
    return terms.every((term) => text.includes(term));
  });
}

export function isContainer(node: JsonNode): boolean {
  return node.type === "object" || node.type === "array";
}

function isContainerValue(value: unknown): boolean {
  return Array.isArray(value) || isRecord(value);
}

export function jsonPreview(value: unknown): { markdown: string; truncated: boolean } {
  const { content, truncated } = boundedJson(value, 2, MAX_PREVIEW_CHARACTERS);
  return { markdown: "```json\n" + content + (truncated ? "\n…" : "") + "\n```", truncated };
}

function boundedJson(value: unknown, spaces: number, limit: number): { content: string; truncated: boolean } {
  const chunks: string[] = [];
  let length = 0;
  let truncated = false;
  // Stop producing the preview once its display budget is reached. Decoding and
  // copying still use the complete value, even beyond the search index limit.
  for (const chunk of jsonChunks(value, spaces)) {
    if (length + chunk.length > limit) {
      chunks.push(codePointSafePrefix(chunk, limit - length));
      truncated = true;
      break;
    }
    chunks.push(chunk);
    length += chunk.length;
  }
  return { content: chunks.join(""), truncated };
}

function codePointSafePrefix(value: string, limit: number): string {
  let end = Math.max(0, Math.min(value.length, Math.floor(limit)));
  const last = value.charCodeAt(end - 1);
  const next = value.charCodeAt(end);
  // Keep the UTF-16 display budget, but never retain half of a surrogate pair.
  if (last >= 0xd800 && last <= 0xdbff && next >= 0xdc00 && next <= 0xdfff) end--;
  return value.slice(0, end);
}

export function truncateLabel(value: string, limit = MAX_LABEL_CHARACTERS): string {
  if (value.length <= limit) return value;
  // Copy the short prefix so a display label never retains a much larger string.
  return (
    codePointSafePrefix(value, limit - 1)
      .split("")
      .join("") + "…"
  );
}

export function jsonPathPreview(path: string): { text: string; markdown: string; truncated: boolean } {
  const escaped = JSON.stringify(truncateLabel(path)).slice(1, -1);
  const text = truncateLabel(escaped);
  let longest = 0;
  let run = 0;
  for (const character of text) {
    run = character === "`" ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  const delimiter = "`".repeat(longest + 1);
  return {
    text,
    markdown: delimiter + " " + text + " " + delimiter,
    truncated: path.length > MAX_LABEL_CHARACTERS || escaped.length > MAX_LABEL_CHARACTERS,
  };
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
  if (value instanceof ExactJsonNumber) return "number";
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
    const count = getObjectKeys(value as Record<string, unknown>).length;
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
    attempts.push(inner);
    try {
      attempts.push(unescapeLogString(inner));
    } catch {
      // An invalid escape is not permission to modify the original input.
    }
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
      for (const key of getObjectKeys(container)) {
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
        value: parseExactJson(attempt),
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

function unescapeLogString(value: string): string {
  // Decode one complete escaping layer, including escaped backslashes and
  // Unicode. Only the surrounding single-quote convention extends JSON rules.
  const compatible = value.replace(/\\([\s\S])|"/g, (match, escaped: string | undefined) => {
    if (escaped === "'") return "'";
    return escaped === undefined ? '\\"' : match;
  });
  return JSON.parse('"' + compatible + '"') as string;
}

function getPreview(value: unknown): string {
  const preview = boundedJson(value, 0, MAX_PREVIEW_LENGTH);
  return preview.truncated ? codePointSafePrefix(preview.content, MAX_PREVIEW_LENGTH - 1) + "…" : preview.content;
}

function getChildrenCount(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (isRecord(value)) return getObjectKeys(value).length;
  return 0;
}

function indexNode(node: JsonNode, budget: number): { text: string; truncated: boolean } {
  const fields = [node.path, node.key, node.type];
  if (!isContainer(node)) fields.push(String(node.value));
  const pieces: string[] = [];
  let length = 0;
  let truncated = false;
  for (const field of fields) {
    const remaining = Math.max(0, budget - length - (pieces.length ? 1 : 0));
    const take = Math.min(remaining, MAX_SEARCH_FIELD_CHARACTERS);
    const normalized = field.slice(0, take).toLowerCase();
    const piece = normalized.slice(0, remaining);
    truncated ||= field.length > take || normalized.length > remaining;
    if (remaining === 0) {
      truncated = true;
      break;
    }
    length += piece.length + (pieces.length ? 1 : 0);
    pieces.push(piece);
  }
  return { text: pieces.join(" "), truncated };
}

function getObjectKeys(value: Record<string, unknown>): string[] {
  let keys = objectKeys.get(value);
  if (!keys) {
    keys = Object.keys(value);
    objectKeys.set(value, keys);
  }
  return keys;
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
        const keys = Array.isArray(current.value) ? undefined : getObjectKeys(current.value);
        const length = Array.isArray(current.value) ? current.value.length : keys!.length;
        yield keys ? "{" : "[";
        frames.push({ value: current.value, keys, index: 0, length, depth: current.depth });
      } else if (typeof current.value === "string") {
        yield* jsonStringChunks(current.value);
      } else if (current.value instanceof ExactJsonNumber) {
        for (let index = 0; index < current.value.source.length; index += STRING_CHUNK_SIZE) {
          yield current.value.source.slice(index, index + STRING_CHUNK_SIZE);
        }
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
      yield* jsonStringChunks(key);
      yield spaces ? ": " : ":";
      next = { value: (frame.value as Record<string, unknown>)[key], depth: frame.depth + 1 };
    } else {
      next = { value: (frame.value as unknown[])[index], depth: frame.depth + 1 };
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof ExactJsonNumber);
}

function* jsonStringChunks(value: string): Generator<string> {
  yield '"';
  for (let start = 0; start < value.length; ) {
    let end = Math.min(value.length, start + STRING_CHUNK_SIZE);
    const last = value.charCodeAt(end - 1);
    const next = value.charCodeAt(end);
    if (last >= 0xd800 && last <= 0xdbff && next >= 0xdc00 && next <= 0xdfff) end++;
    yield JSON.stringify(value.slice(start, end)).slice(1, -1);
    start = end;
  }
  yield '"';
}
