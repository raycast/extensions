import { Detail } from "@raycast/api";

import { buildNode, parseJson } from "../json-viewer/jsonParser";
import { JsonNodePage } from "./JsonNodePage";
import { JsonValuePage } from "./JsonValuePage";

/**
 * JSON 响应查看器入口。
 *
 * 复用现有 `json-viewer` 能力：把响应体文本经 `parseJson` + `buildNode`
 * 构建为 `JsonNode` 根节点，再根据根类型 push 到 `JsonNodePage`（object/array）
 * 或 `JsonValuePage`（primitive），享受树形浏览与复制能力。
 */
const ROOT_OPTIONS = {
  key: "root",
  indexKey: "root",
  parentPath: "$",
  parentType: "root" as const,
};

export interface JsonViewerProps {
  text: string;
}

export function JsonViewer({ text }: JsonViewerProps) {
  const result = parseJson(text);
  if (result.kind !== "ok") {
    // 用字符串拼接避免模板字面量内嵌套反引号。
    return <Detail markdown={"## JSON 解析失败\n\n```\n" + result.message + "\n```"} />;
  }
  const root = buildNode(result.value, ROOT_OPTIONS);
  if (root.type === "object" || root.type === "array") {
    return <JsonNodePage node={root} root={root} />;
  }
  return <JsonValuePage node={root} root={root} />;
}
