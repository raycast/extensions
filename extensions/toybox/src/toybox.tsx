import { Action, ActionPanel, Icon, launchCommand, LaunchType, List } from "@raycast/api";
import { useMemo } from "react";

import { tools, type Tool } from "./tools";

/**
 * ToyBox 扩展的中央入口。
 *
 * 以可搜索的列表展示所有已注册的工具，顶部带动态搜索栏。
 * 选中某个工具后通过 `launchCommand` 跳转到对应子命令，让每个工具
 * 保持独立的体验（剪贴板自动识别、手动输入兜底等）。
 */
export default function Command() {
  const filteredTools = useTools();

  return (
    <List searchBarPlaceholder="搜索 ToyBox 工具（如 json、mybatis）…" filtering={false}>
      {filteredTools.map((tool) => (
        <List.Item
          key={tool.name}
          title={tool.title}
          subtitle={tool.description}
          icon={tool.icon}
          keywords={tool.keywords}
          actions={
            <ActionPanel>
              <Action
                title="打开工具"
                icon={Icon.ArrowRight}
                onAction={async () => {
                  await launchCommand({ name: tool.name, type: LaunchType.UserInitiated });
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

/**
 * 主入口的搜索由 Raycast `List` 组件基于 `title` 与 `keywords` 自动
 * 做子串匹配处理（设置 `filtering={false}` 关闭默认过滤）。这里只做
 * 一次 memo 缓存，保持契约简单。
 */
function useTools(): Tool[] {
  return useMemo(() => tools, []);
}
