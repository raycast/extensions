## MODIFIED Requirements

### Requirement: Hub lists every registered tool

中央入口 MUST 为 `src/tools.ts` 中的每个条目渲染一个 `List.Item`。每个条目 MUST 展示该工具的标题、描述与图标。中央入口 MUST 启用 Raycast `List` 自带的过滤能力；MUST NOT 通过 `filtering={false}` 关闭该能力或自行实现替代过滤。

为了贴合「按 title / subtitle / keywords 过滤」的用户预期，每个 Tool 的 `keywords` 数组 MUST 至少包含 `title` 与 `description` 中具有检索意义的核心词条（含中英文常见检索词），以确保 Raycast 内置过滤能命中副标题中的关键信息。

#### Scenario: All tools are listed

- **WHEN** 用户打开 `toybox` 命令
- **THEN** 注册表中当前所有工具都展示在列表中

#### Scenario: Search filters the list

- **WHEN** 用户在中央入口的搜索栏中输入「json」「mybatis」「格式化」「SQL」「JSONPath」等关键词
- **THEN** Raycast 按每个 `List.Item` 的标题与 `keywords` 自动过滤列表，命中的 Tool 仍然可显示其副标题
