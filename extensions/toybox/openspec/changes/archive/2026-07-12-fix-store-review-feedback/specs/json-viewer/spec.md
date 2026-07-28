## MODIFIED Requirements

### Requirement: Clipboard auto-detection on mount

命令在挂载时 MUST 调用 `Clipboard.readText()`。读取期间 MUST 显示 loading 态（例如 `Detail isLoading`）。读取完成后：

- 若返回文本能解析为 JSON，命令 MUST 根据根节点类型选择入口：根节点为 object / array 时直接 `navigation.push` 到 `JsonNodePage` 展示根节点的直接子节点；根节点为 string / number / boolean / null 时直接 `navigation.push` 到 `JsonValuePage` 展示该 primitive 的字面量值。
- 若返回文本为空、无法解析为 JSON 或读取抛错，命令 MUST 回退到 Form 手动输入；读取抛错时 MUST 展示一次 `Toast.Failure`。

#### Scenario: Valid JSON object in clipboard

- **WHEN** 命令打开时剪贴板内含一段语法合法的 JSON object 或 array
- **THEN** 命令直接进入 `JsonNodePage`，展示根节点的直接子节点

#### Scenario: Valid JSON primitive in clipboard

- **WHEN** 命令打开时剪贴板内含一段语法合法的 JSON primitive（如 `"hello"`、`123`、`true`、`null`）
- **THEN** 命令直接进入 `JsonValuePage`，主区域展示该 primitive 的字面量值，元数据侧栏列出 Key=`root` / Type / JSONPath=`$`，Action 暴露「复制值 / JSONPath / JSON」

#### Scenario: Empty clipboard

- **WHEN** 剪贴板为空或仅含空白字符
- **THEN** 命令渲染 Form，TextArea 默认值为空

#### Scenario: Invalid clipboard content

- **WHEN** 剪贴板内含无法解析为 JSON 的字符串
- **THEN** 命令渲染 Form，TextArea 默认值填充为剪贴板原文，让用户微调或改写

#### Scenario: Clipboard read throws

- **WHEN** `Clipboard.readText()` 抛错（例如权限被拒绝）
- **THEN** 命令渲染 Form，并通过 Toast 提示错误，命令不崩溃

#### Scenario: Loading state during clipboard read

- **WHEN** 命令挂载后剪贴板读取尚未完成
- **THEN** 命令渲染 loading 占位视图，等待读取就绪后再切换

### Requirement: Manual entry via Form

命令 MUST 提供一个 `Form`，包含 `Form.TextArea` 字段用于输入 JSON 文本。该 Form 在以下情况下作为兜底入口出现：

- 剪贴板读取失败；
- 剪贴板内容为空；
- 剪贴板内容无法解析为 JSON。

表单 MUST 通过 `Action.SubmitForm` 提交。提交时 MUST 调用 `JSON.parse` 校验输入；成功时 MUST 根据根节点类型选择入口：object / array 推送到树的根页面（`JsonNodePage`），primitive 推送到 `JsonValuePage`；失败时 MUST 推送到错误页面展示解析失败原因。

#### Scenario: Manual JSON object succeeds

- **WHEN** 用户在表单中输入合法 JSON object 或 array 并按下回车
- **THEN** 命令进入 `JsonNodePage`，展示根节点的直接子节点

#### Scenario: Manual JSON primitive succeeds

- **WHEN** 用户在表单中输入合法 JSON primitive（如 `"hello"`、`123`、`true`、`null`）并按下回车
- **THEN** 命令进入 `JsonValuePage`，主区域展示该 primitive 的字面量值

#### Scenario: Manual JSON fails to parse

- **WHEN** 用户在表单中输入非合法 JSON 并按下回车
- **THEN** 命令进入 `JsonErrorPage`，展示错误信息与原始输入，附"返回编辑"Action

#### Scenario: Empty submission

- **WHEN** 用户提交空白内容
- **THEN** 命令进入 `JsonErrorPage`，提示输入为空

#### Scenario: Form pre-fills clipboard content

- **WHEN** 剪贴板内容非空但无法解析为 JSON
- **THEN** 命令渲染 Form，TextArea 默认值填充为剪贴板原始文本
