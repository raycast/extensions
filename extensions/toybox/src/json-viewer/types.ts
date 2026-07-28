/**
 * JSON 查看器的领域类型。
 *
 * 设计原则：
 * 1. UI 层只与 {@link JsonNode} 打交道，不直接持有原始 JS 值做展示。
 * 2. `JsonNode` 是"懒构建"的——非 object/array 节点没有 `children`；
 *    object/array 节点在挂载时只持有 `childCount` 与 `displayValue`，
 *    `children` 在用户首次下钻时由 `expandChildren` 填充。
 *    这样 100k+ 节点的 JSON 不会一次性构造整棵 React Tree。
 * 3. 所有路径使用标准 JSONPath（`$` 开头），由 {@link jsonPath} 子模块生成。
 */

/** JSON 值的六种类型。 */
export type JsonNodeType = "object" | "array" | "string" | "number" | "boolean" | "null";

/**
 * JSON 树的节点。
 *
 * - `key` / `indexKey`：`key` 是展示在 List 上的标题；`indexKey` 是用于生成
 *   子节点 key 的原始名（数组下标是数字、对象键是字符串）。两者解耦是因为
 *   顶层根节点的 key 固定为 `root`，而它的 indexKey 也是 `root`。
 * - `path`：标准 JSONPath，详见 `jsonPath.ts`。
 * - `value`：原始 JS 值，仅 primitive 节点使用；object/array 节点的 value
 *   仍然保留，方便后续 `expandChildren` 时直接遍历。
 * - `displayValue`：在列表摘要中显示的值；primitive 时是字面量，object 时
 *   是 `N keys`，array 时是 `N items`。
 * - `children`：仅 object/array 节点在首次下钻后填充。
 */
export interface JsonNode {
  readonly key: string;
  readonly indexKey: string;
  readonly path: string;
  readonly type: JsonNodeType;
  readonly value: unknown;
  readonly displayValue: string;
  readonly childCount?: number;
  readonly children?: JsonNode[];
}

/** `parseJson` 的返回值：成功时携带已解析的 JS 值，失败时携带错误消息。 */
export type ParseResult =
  { readonly kind: "ok"; readonly value: unknown } | { readonly kind: "error"; readonly message: string };

/** `buildNode` 的可选项，控制键名展示与父路径。 */
export interface BuildNodeOptions {
  /** 当前节点在其父中的展示名（顶层为 "root"）。 */
  readonly key: string;
  /** 当前节点在其父中的原始键名（用于生成子节点 path）。 */
  readonly indexKey: string;
  /** 父节点 JSONPath；顶层为 `$`。 */
  readonly parentPath: string;
  /** 父节点类型，用于决定子节点 path 是 `$.key` 还是 `$.key[index]`。 */
  readonly parentType: JsonNodeType | "root";
}
