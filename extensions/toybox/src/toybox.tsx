import { Action, ActionPanel, Icon, launchCommand, LaunchType, List } from "@raycast/api";

import { tools, type Tool } from "./tools";

/**
 * ToyBox 扩展的中央入口。
 *
 * 以可搜索的列表展示所有已注册的工具，顶部带动态搜索栏。
 * 选中某个工具后通过 `launchCommand` 跳转到对应子命令，让每个工具
 * 保持独立的体验（剪贴板自动识别、手动输入兜底等）。
 *
 * 搜索由 Raycast `List` 内置按 `title / subtitle / keywords` 自动完成；
 * 工具注册表（`src/tools.ts`）是单一事实源，新增工具只需追加一条记录。
 */
export default function Command() {
  return (
    <List searchBarPlaceholder="搜索 ToyBox 工具（如 json、mybatis）…">
      {tools.map((tool) => (
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
 * 预留工具类型导出，便于将来按需扩展过滤 / 分组逻辑时类型仍可被复用。
 * 当前实现直接使用 Raycast 内置过滤，故未引用。
 */
export type { Tool };
