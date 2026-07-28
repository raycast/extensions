# toybox-hub 规格说明

## Purpose

ToyBox 中央入口命令：在主入口以可搜索列表展示所有已注册的工具，选中后通过 `launchCommand` 跳转到对应子命令。

## Requirements

### Requirement: Hub command is registered

扩展 MUST 在 `package.json` 中以 `mode: "view"` 注册一个 `toybox` 命令，使 Raycast 能将其识别为根命令。

#### Scenario: Hub command is discoverable

- **WHEN** 开发者打开 Raycast 并输入 "ToyBox"
- **THEN** `toybox` 命令出现在结果列表中

### Requirement: Hub lists every registered tool

中央入口 MUST 为 `src/tools.ts` 中的每个条目渲染一个 `List.Item`。每个条目 MUST 展示该工具的标题、描述与图标。中央入口 MUST 启用 Raycast `List` 自带的过滤能力；MUST NOT 通过 `filtering={false}` 关闭该能力或自行实现替代过滤。

为了贴合「按 title / subtitle / keywords 过滤」的用户预期，每个 Tool 的 `keywords` 数组 MUST 至少包含 `title` 与 `description` 中具有检索意义的核心词条（含中英文常见检索词），以确保 Raycast 内置过滤能命中副标题中的关键信息。

#### Scenario: All tools are listed

- **WHEN** 用户打开 `toybox` 命令
- **THEN** 注册表中当前所有工具都展示在列表中

#### Scenario: Search filters the list

- **WHEN** 用户在中央入口的搜索栏中输入「json」「mybatis」「格式化」「SQL」「JSONPath」等关键词
- **THEN** Raycast 按每个 `List.Item` 的标题与 `keywords` 自动过滤列表，命中的 Tool 仍然可显示其副标题

### Requirement: Selecting a tool launches its sub-command

选中某个工具项 MUST 通过 `launchCommand` 配合 `LaunchType.UserInitiated` 启动对应的子命令。子命令接管后，中央入口 MUST NOT 停留在导航栈中。

#### Scenario: Tool launches as a root command

- **WHEN** 用户选中一个工具项并按下回车
- **THEN** Raycast 调用该工具 `name` 所注册的子命令

### Requirement: Adding a new tool is a one-file change

新增一个工具 MUST 只需在 `src/tools.ts` 的 `tools` 数组中追加一条记录即可完成；除此以外 MUST NOT 要求修改任何其它源文件以在中央入口中展示该工具。

#### Scenario: New tool appears in the hub

- **WHEN** 开发者在 `src/tools.ts` 中新增一条记录，并在 `package.json` 中注册同名命令
- **THEN** 新工具出现在中央入口列表中，并可通过其 `keywords` 搜索到
