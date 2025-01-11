import { ActionPanel, List, Action } from "@raycast/api";
import { useState } from "react";
import URLParser from "./tools/URLParser";
import ColorConverter from "./tools/ColorConverter";
import TimestampConverter from "./tools/TimestampConverter";
import UUIDGenerator from "./tools/UUIDGenerator";

export default function Command() {
  const [, setSelectedTool] = useState<string>("url-parser");

  const tools = [
    {
      id: "url-parser",
      title: "URL 解析",
      component: <URLParser />,
    },
    {
      id: "color-converter",
      title: "颜色转换",
      component: <ColorConverter />,
    },
    {
      id: "timestamp-converter",
      title: "时间戳转换",
      component: <TimestampConverter />,
    },
    {
      id: "uuid-generator",
      title: "UUID 生成",
      component: <UUIDGenerator />,
    },
  ];

  return (
    <List onSearchTextChange={(text) => setSelectedTool(text)} searchBarPlaceholder="选择工具...">
      {tools.map((tool) => (
        <List.Item
          key={tool.id}
          title={tool.title}
          actions={
            <ActionPanel>
              <Action.Push title={`打开 ${tool.title}`} target={tool.component} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
