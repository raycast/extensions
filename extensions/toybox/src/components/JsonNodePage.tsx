/**
 * `JsonNodePage`：树形浏览页。
 *
 * 每次进入这个组件都对应 JSON 树中的某一层（根节点 / 任意 Object / 任意 Array）。
 * 它只持有"当前节点的直接子节点数组"——子节点数组由 `ensureChildren` 在挂载时
 * 按需构造，object/array 之下的更深层级不会被构造。
 *
 * 主操作：
 *   - Object / Array → `Action.Push(<JsonNodePage ...>)` 进入下一层
 *   - Primitive → `Action.Push(<JsonValuePage ...>)` 跳到详情页
 *
 * 此外每个节点都暴露 "复制 JSON" 与 "复制 JSONPath" 两个 Action，方便
 * 用户在不下钻的情况下也能拿到值。
 */

import { useMemo } from "react";
import { Action, ActionPanel, Clipboard, showToast, Toast, useNavigation } from "@raycast/api";

import type { JsonNode } from "../json-viewer/types";
import { ensureChildren } from "../json-viewer/jsonParser";
import { JsonTree } from "./JsonTree";
import { JsonValuePage } from "./JsonValuePage";

/** `JsonNodePage` 的 props。 */
export interface JsonNodePageProps {
  /** 当前层对应的 JsonNode。 */
  readonly node: JsonNode;
  /** 根节点的引用，用于 "复制 JSON" 时把整棵树 pretty-print。 */
  readonly root: JsonNode;
}

const ROOT_SEARCH_PLACEHOLDER = "搜索当前层 Key…";
const SUB_SEARCH_PLACEHOLDER = "搜索当前层 Key…";

/**
 * 把任意 JsonNode 序列化为 2 空格缩进 JSON 字符串。
 *
 * 走 `JSON.stringify` 的标准路径；object/array 的 children 已经被预先填好，
 * 但其实我们直接基于 `node.value` 也能拿到原始 JS 值，更可靠。
 */
function prettyJson(node: JsonNode): string {
  return JSON.stringify(node.value, null, 2);
}

/**
 * 把 Primitive 的 `value` 转成复制到剪贴板的字面量。
 *
 * 需求约定："字符串保留引号，数字/布尔/null 以字面量表示"。
 */
function primitiveText(node: JsonNode): string {
  switch (node.type) {
    case "string":
      return JSON.stringify(node.value);
    case "number":
    case "boolean":
      return String(node.value);
    case "null":
      return "null";
    default:
      return prettyJson(node);
  }
}

/** 把文本写入剪贴板，并在失败时提示。 */
async function copyText(text: string, successMessage: string): Promise<void> {
  try {
    await Clipboard.copy(text);
    await showToast({ style: Toast.Style.Success, title: successMessage });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "复制失败",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export function JsonNodePage({ node, root }: JsonNodePageProps) {
  const navigation = useNavigation();

  // 在挂载时按需展开当前节点的直接子节点
  const children = useMemo(() => {
    const expanded = ensureChildren(node);
    return expanded.children ?? [];
  }, [node]);

  /**
   * 点击 / 回车的主操作：
   *   - object / array → push 一个新的 JsonNodePage
   *   - primitive → push 一个 JsonValuePage
   */
  const onOpen = (child: JsonNode): void => {
    if (child.type === "object" || child.type === "array") {
      navigation.push(<JsonNodePage node={child} root={root} />);
    } else {
      navigation.push(<JsonValuePage node={child} root={root} />);
    }
  };

  /**
   * 渲染每个节点的 Action 区域。
   *
   * - Object / Array：主操作是 Push 进入下一层；附带 "复制 JSON" / "复制 JSONPath"。
   * - Primitive：主操作是 Push 进入详情页；附带 "复制值" / "复制 JSONPath" / "复制 JSON"。
   */
  const renderActions = (child: JsonNode) => {
    const openTitle = child.type === "object" || child.type === "array" ? "打开" : "查看详情";
    const openTarget = () => onOpen(child);
    return (
      <ActionPanel>
        <Action title={openTitle} onAction={openTarget} />
        <Action
          title="复制 JSONPath"
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          onAction={() => copyText(child.path, `已复制 JSONPath：${child.path}`)}
        />
        <Action
          title="复制 JSON"
          shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
          onAction={() => copyText(prettyJson(root), "已复制整段 JSON")}
        />
        {child.type !== "object" && child.type !== "array" ? (
          <Action
            title="复制值"
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            onAction={() => copyText(primitiveText(child), `已复制值：${child.displayValue}`)}
          />
        ) : null}
      </ActionPanel>
    );
  };

  const placeholder = node.key === "root" ? ROOT_SEARCH_PLACEHOLDER : SUB_SEARCH_PLACEHOLDER;

  return <JsonTree nodes={children} searchPlaceholder={placeholder} renderActions={renderActions} />;
}
