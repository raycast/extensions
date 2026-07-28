/**
 * `JsonTree`：把 `JsonNode[]` 渲染成 Raycast `List`。
 *
 * 组件本身只负责展示与类型 → 图标的映射，不处理下钻 / 复制逻辑，
 * 这些交互通过 props 传入。这样它可以被任何 `JsonNodePage` 复用，
 * 也方便后续替换渲染目标（比如改成网格视图）。
 */

import { Icon, List, type Icon as RaycastIcon } from "@raycast/api";
import type { JsonNode, JsonNodeType } from "../json-viewer/types";

/** Primitive / 复合节点在 List 配件列显示的文本。 */
const TYPE_LABEL: Record<JsonNodeType, string> = {
  object: "object",
  array: "array",
  string: "string",
  number: "number",
  boolean: "boolean",
  null: "null",
};

/** 类型 → Raycast 图标常量。 */
const TYPE_ICON: Record<JsonNodeType, RaycastIcon> = {
  object: Icon.Folder,
  array: Icon.List,
  string: Icon.Text,
  number: Icon.Number00,
  boolean: Icon.Checkmark,
  null: Icon.MinusCircle,
};

/**
 * `JsonTree` 的 props。
 *
 * - `nodes`：当前层要渲染的 `JsonNode[]`，通常来自父节点 `children`。
 * - `searchPlaceholder`：搜索栏占位文本。
 * - `onOpen`：点击 / 回车时的回调，参数是命中的节点；由调用方决定是
 *   `navigation.push` 一个新页面还是其他行为。
 * - `renderActions`：每个节点要展示的 Action 区域；调用方按节点类型组装。
 */
export interface JsonTreeProps {
  readonly nodes: readonly JsonNode[];
  readonly searchPlaceholder: string;
  readonly renderActions: (node: JsonNode) => React.ReactNode;
}

/**
 * 渲染单个 `JsonNode` 的 `List.Item`。
 *
 * 拆成独立组件便于在父 `List` 中以 `key={node.path}` 平铺；这样 React 的
 * diff 也能在节点切换时正确复用。
 */
function NodeRow({ node, renderActions }: { node: JsonNode; renderActions: (node: JsonNode) => React.ReactNode }) {
  const icon = TYPE_ICON[node.type];
  return (
    <List.Item
      key={node.path}
      title={node.key}
      subtitle={node.displayValue}
      icon={icon}
      accessories={[{ text: TYPE_LABEL[node.type] }]}
      actions={renderActions(node)}
    />
  );
}

/**
 * 树形浏览页面的 List 容器。
 *
 * 启用 Raycast `List` 的内置搜索（`filtering` 默认为 true），搜索仅作用于
 * `List.Item.title`，正好对应节点的 `key`，符合规格要求。
 */
export function JsonTree({ nodes, searchPlaceholder, renderActions }: JsonTreeProps) {
  return (
    <List searchBarPlaceholder={searchPlaceholder}>
      {nodes.map((node) => (
        <NodeRow key={node.path} node={node} renderActions={renderActions} />
      ))}
    </List>
  );
}
