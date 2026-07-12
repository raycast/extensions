/**
 * `JsonValuePage`：Primitive 节点的详情页。
 *
 * - 主区域：用 Markdown 围栏代码块展示原始值；根据节点类型选择
 *   最合适的高亮语言（`json` / `text`）。
 * - 元数据侧栏：列出 Key / Type / JSONPath。
 * - ActionPanel：复制值 / 复制 JSONPath / 复制整段 JSON。
 */

import { Action, ActionPanel, Clipboard, Detail, showToast, Toast } from "@raycast/api";

import type { JsonNode, JsonNodeType } from "../json-viewer/types";

export interface JsonValuePageProps {
  readonly node: JsonNode;
  readonly root: JsonNode;
}

const TYPE_LABEL: Record<JsonNodeType, string> = {
  object: "object",
  array: "array",
  string: "string",
  number: "number",
  boolean: "boolean",
  null: "null",
};

/** Primitive → 复制时使用的字面量。 */
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
      return JSON.stringify(node.value, null, 2);
  }
}

/** Primitive → Markdown 主区域展示的代码块内容。 */
function valueBlock(node: JsonNode): string {
  switch (node.type) {
    case "string":
      // 字符串用 ```text 围栏，避免内部出现 ``` 把 Markdown 截断
      return `\`\`\`text\n${node.value as string}\n\`\`\``;
    case "number":
    case "boolean":
    case "null":
      return `\`\`\`json\n${primitiveText(node)}\n\`\`\``;
    default:
      return `\`\`\`json\n${JSON.stringify(node.value, null, 2)}\n\`\`\``;
  }
}

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

export function JsonValuePage({ node, root }: JsonValuePageProps) {
  const markdown = `# ${node.key}\n\n${valueBlock(node)}`;
  const fullJson = JSON.stringify(root.value, null, 2);

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Key" text={node.key} />
          <Detail.Metadata.Label title="Type" text={TYPE_LABEL[node.type]} />
          <Detail.Metadata.Label title="JSONPath" text={node.path} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Value" text={node.displayValue} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="复制值" onAction={() => copyText(primitiveText(node), "已复制值")} />
          <Action
            title="复制 JSONPath"
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            onAction={() => copyText(node.path, `已复制 JSONPath：${node.path}`)}
          />
          <Action
            title="复制 JSON"
            shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
            onAction={() => copyText(fullJson, "已复制整段 JSON")}
          />
        </ActionPanel>
      }
    />
  );
}
