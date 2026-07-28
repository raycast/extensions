/**
 * JSON 解析与懒构建工具。
 *
 * - `parseJson` 调用浏览器原生 `JSON.parse` 并把异常归一成结构化结果。
 * - `buildNode` 把任意 JS 值转换为 {@link JsonNode}；object/array 节点
 *   的 `children` 字段暂为 `undefined`，仅记录 `childCount`。
 * - `expandChildren` 在用户首次下钻时填充 `children`，此时遍历仍然
 *   是浅层（只遍历当前对象的直接子键），不会递归整棵树。
 */

import type { BuildNodeOptions, JsonNode, JsonNodeType, ParseResult } from "./types";
import { childPath, rootPath } from "./jsonPath";

/** Primitive 类型的最大字符串摘要长度，超出后以省略号结尾。 */
const STRING_PREVIEW_MAX = 80;

/**
 * 调用 `JSON.parse` 并把异常归一为结构化结果。
 *
 * `JSON.parse` 自身抛 `SyntaxError`；我们在 catch 中读取 `message`，
 * 对于带位置的错误（`position N`），原样透传给前端以便用户定位。
 */
export function parseJson(input: string): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { kind: "error", message: "输入为空，请粘贴或输入 JSON 文本。" };
  }
  try {
    const value: unknown = JSON.parse(trimmed);
    return { kind: "ok", value };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { kind: "error", message };
  }
}

/**
 * 推断一个 JS 值的 JSON 类型。
 *
 * 注意：`typeof null === "object"` 在 JS 中为 true，必须先排除 null。
 */
export function inferType(value: unknown): JsonNodeType {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  // 兜底：JSON 规范中没有 undefined，但运行时可能出现（例如手动构造的 Map）
  return "null";
}

/**
 * 生成 Primitive / Object / Array 共用的 displayValue 摘要。
 *
 * - string：截断到 STRING_PREVIEW_MAX 字符，加引号便于识别。
 * - number / boolean / null：字面量。
 * - object：`N keys`。
 * - array：`N items`。
 */
export function summariseValue(value: unknown, type: JsonNodeType): string {
  switch (type) {
    case "string": {
      const raw = value as string;
      if (raw.length <= STRING_PREVIEW_MAX) {
        return `"${raw}"`;
      }
      return `"${raw.slice(0, STRING_PREVIEW_MAX)}…"`;
    }
    case "number":
      return String(value);
    case "boolean":
      return value ? "true" : "false";
    case "null":
      return "null";
    case "object": {
      const keys = Object.keys(value as Record<string, unknown>);
      return `${keys.length} keys`;
    }
    case "array": {
      const arr = value as unknown[];
      return `${arr.length} items`;
    }
  }
}

/**
 * 构建一个 JsonNode（懒构建：object/array 节点的 children 此时仍为 undefined）。
 *
 * 顶层调用示例：`buildNode(rootValue, { key: "root", indexKey: "root", parentPath: "$", parentType: "root" })`。
 */
export function buildNode(value: unknown, options: BuildNodeOptions): JsonNode {
  const type = inferType(value);
  const path =
    options.parentType === "root" ? rootPath() : childPath(options.parentPath, options.indexKey, options.parentType);

  const base = {
    key: options.key,
    indexKey: options.indexKey,
    path,
    type,
    value,
    displayValue: summariseValue(value, type),
  } satisfies Omit<JsonNode, "childCount" | "children">;

  if (type === "object") {
    const keys = Object.keys(value as Record<string, unknown>);
    return { ...base, childCount: keys.length };
  }
  if (type === "array") {
    const arr = value as unknown[];
    return { ...base, childCount: arr.length };
  }
  return base;
}

/**
 * 按需填充 object / array 节点的直接子节点数组。
 *
 * - 已填充（`children` 不为 undefined）时直接返回，避免重复构造。
 * - primitive 节点调用此函数是安全的 no-op（直接返回 `[]`）。
 *
 * 由于 100k+ 节点的 JSON 主要压力来自 array 元素，我们直接生成一个稀疏
 * `JsonNode[]`，每个元素的 `value` 仍指向原数组里同一个引用，避免拷贝。
 */
export function expandChildren(node: JsonNode): JsonNode[] {
  if (node.children) {
    return node.children;
  }
  if (node.type === "object") {
    const record = node.value as Record<string, unknown>;
    const keys = Object.keys(record);
    const children = keys.map((k) =>
      buildNode(record[k], {
        key: k,
        indexKey: k,
        parentPath: node.path,
        parentType: "object",
      }),
    );
    return children;
  }
  if (node.type === "array") {
    const arr = node.value as unknown[];
    const children = arr.map((item, index) =>
      buildNode(item, {
        key: `[${index}]`,
        indexKey: String(index),
        parentPath: node.path,
        parentType: "array",
      }),
    );
    return children;
  }
  return [];
}

/**
 * 把一组 JsonNode 标记为已填充。返回新数组（不修改原节点）。
 *
 * 用于在 {@link JsonNodePage} 挂载时一次性为根节点展开 children，
 * 并把展开结果写回节点的 `children` 字段，方便后续下钻直接复用。
 */
export function ensureChildren(node: JsonNode): JsonNode {
  if (node.children) return node;
  if (node.type !== "object" && node.type !== "array") return node;
  const children = expandChildren(node);
  return { ...node, children };
}
