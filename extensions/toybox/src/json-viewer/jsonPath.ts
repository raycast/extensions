/**
 * JSONPath 工具。
 *
 * 输出采用业内常见的标准 JSONPath（与 jsonpath-plus / lodash.get / Go encoding/json
 * 的 `$` 风格一致）：
 *   - 根节点：`$`
 *   - 对象字段：`$.user.name`
 *   - 数组下标：`$.items[0]`
 *
 * 字段名若包含 `.` / `[` / `]` 等特殊字符，使用 `["field.with.dot"]` 形式。
 */

import type { JsonNodeType } from "./types";

/**
 * 转义一个对象字段名。
 *
 * 包含 `.` `[` `]` `"` `\` 任一字符的字段名 MUST 用 `["..."]` 形式包裹，
 * 内部 `"` 与 `\` 也需转义。这样 `childPath("$.a", 'b"c')` 会得到 `$.a["b\"c"]`，
 * 保证路径可被任何标准 JSONPath 解析器正确回读。
 */
export function escapeKey(key: string): string {
  // 仅由字母数字与下划线组成的字段名可安全裸用
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    return key;
  }
  const escaped = key.replace(/[\\"]/g, "\\$&");
  return `["${escaped}"]`;
}

/**
 * 计算根节点路径。固定为 `$`。
 */
export function rootPath(): string {
  return "$";
}

/** `childPath` 接受的父节点类型集合（包含虚拟根）。 */
export type JsonParentType = JsonNodeType | "root";

/**
 * 计算子节点路径。
 *
 * @param parentPath 父节点 JSONPath，例如 `$.user.address`。
 * @param indexKey 字段原始名（对象键名 / 数组下标的字符串形式）。
 * @param parentType 父节点类型；`"root"` 表示虚拟根节点（其 path 是 `$`）。
 */
export function childPath(parentPath: string, indexKey: string, parentType: JsonParentType): string {
  if (parentType === "root") {
    // 虚拟根节点下的字段直接挂在 $ 之后
    if (/^\d+$/.test(indexKey)) {
      return `${parentPath}[${indexKey}]`;
    }
    return `${parentPath}.${escapeKey(indexKey)}`;
  }
  if (parentType === "array") {
    return `${parentPath}[${indexKey}]`;
  }
  // object
  return `${parentPath}.${escapeKey(indexKey)}`;
}
