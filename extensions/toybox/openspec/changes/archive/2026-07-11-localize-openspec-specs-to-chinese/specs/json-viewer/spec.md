# json-viewer 规格说明

## 目的

JSON 查看器命令：从剪贴板读取或由用户手动输入 JSON 内容，将其美化后呈现并提供一键复制。

## MODIFIED Requirements

### Requirement: JSON command is registered

扩展MUST在 `package.json` 中以 `mode: "view"` 注册一个 `json` 命令，以便该工具可以直接从 Raycast 命令面板调用。

#### Scenario: JSON command is discoverable

- **WHEN** 开发者打开 Raycast 并输入 "格式化 JSON"（或 "Format JSON"）
- **THEN** `json` 命令出现在结果列表中

### Requirement: Clipboard auto-detection on mount

命令在挂载时MUST调用 `Clipboard.readText()`。如果返回的文本能解析为 JSON，命令MUST立即推送到一个结果视图，展示美化后的输出，无需用户进一步交互。

#### Scenario: Valid JSON in clipboard

- **WHEN** 命令打开时剪贴板内含一段语法合法的 JSON 值
- **THEN** 命令直接进入 `Detail` 视图，使用 2 空格缩进在 `json` 围栏代码块中渲染该值

#### Scenario: Empty or invalid clipboard

- **WHEN** 剪贴板为空，或包含无法解析为 JSON 的字符串
- **THEN** 命令渲染一个带 `TextArea` 的 `Form`，让用户可以手动粘贴或输入 JSON

### Requirement: Manual entry via Form

表单MUST通过 `Action.SubmitForm` 提交。提交时MUST重新校验输入；成功时推送到与剪贴板自动识别相同的结果视图，失败时MUST显示一个包含底层解析错误的 `Toast.Failure`。

#### Scenario: Manual JSON succeeds

- **WHEN** 用户在表单中输入 JSON 并按下回车
- **THEN** 命令进入结果视图，展示美化后的 JSON

#### Scenario: Manual JSON fails to parse

- **WHEN** 用户提交的表单值不是合法 JSON
- **THEN** 出现失败提示，表单保持可见

### Requirement: Result view provides copy actions

结果视图MUST提供：

- 主操作：把美化后的 JSON 复制到剪贴板
- 次操作：把原始（未格式化）输入复制到剪贴板

#### Scenario: Formatted JSON can be copied

- **WHEN** 用户在结果视图上触发主操作
- **THEN** 剪贴板中包含美化后的 JSON

#### Scenario: Raw input can be copied

- **WHEN** 用户触发次操作"复制原始输入"
- **THEN** 剪贴板中包含用户最初提交的原始文本

### Requirement: Result view exposes metadata

结果视图MUST在元数据侧栏展示 JSON 值的高层类型（对象 / 数组 / 原始值）、字符数与字节大小（同时包括美化后与原始输入）。

#### Scenario: Metadata reflects the value

- **WHEN** 结果视图被渲染
- **THEN** 元数据侧栏列出美化后 JSON 的类型、长度与体积，并对原始输入列出相同指标
