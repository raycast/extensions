# ToyBox 中央入口

## 新增需求（ADDED Requirements）

### 需求：中央入口命令已注册

扩展 MUST 在 `package.json` 中以 `mode: "view"` 注册一个 `toybox` 命令，使 Raycast 能将其识别为根命令。

#### 场景：中央入口命令可被检索

- **WHEN** 开发者打开 Raycast 并输入 "ToyBox"
- **THEN** `toybox` 命令出现在结果列表中

### 需求：中央入口列出所有已注册工具

中央入口 MUST 为 `src/tools.ts` 中的每个条目渲染一个 `List.Item`。每个条目 MUST 展示该工具的标题、描述与图标。

#### 场景：所有工具都被列出

- **WHEN** 用户打开 `toybox` 命令
- **THEN** 注册表中当前所有工具都展示在列表中

#### 场景：搜索过滤列表

- **WHEN** 用户在中央入口的搜索栏中输入文字
- **THEN** Raycast 按每个 `List.Item` 的标题、副标题与 `keywords` 过滤列表

### 需求：选中工具即启动其子命令

选中某个工具项 MUST 通过 `launchCommand` 配合 `LaunchType.UserInitiated` 启动对应的子命令。子命令接管后，中央入口 MUST NOT 停留在导航栈中。

#### 场景：工具以根命令方式启动

- **WHEN** 用户选中一个工具项并按下回车
- **THEN** Raycast 调用该工具 `name` 所注册的子命令

### 需求：新增工具是单文件改动

新增一个工具 MUST 只需在 `src/tools.ts` 的 `tools` 数组中追加一条记录即可完成；除此以外 MUST NOT 要求修改任何其它源文件以在中央入口中展示该工具。

#### 场景：新工具出现在中央入口

- **WHEN** 开发者在 `src/tools.ts` 中新增一条记录，并在 `package.json` 中注册同名命令
- **THEN** 新工具出现在中央入口列表中，并可通过其 `keywords` 搜索到
