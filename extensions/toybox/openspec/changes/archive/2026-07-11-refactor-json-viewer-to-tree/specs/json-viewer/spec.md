## MODIFIED Requirements

### Requirement: JSON command is registered

扩展 MUST 在 `package.json` 中以 `mode: "view"` 注册一个 `json` 命令，命令的 `title` MUST 为 "JSON 查看器"，以便该工具可以直接从 Raycast 命令面板调用。命令的 `description` MUST 描述其为树形浏览工具，而非纯美化工具。

#### Scenario: JSON command is discoverable

- **WHEN** 开发者打开 Raycast 并输入 "JSON 查看器"（或 "Format JSON"）
- **THEN** `json` 命令出现在结果列表中

### Requirement: Manual entry via Form

命令 MUST 以 `Form` 为唯一入口，包含一个 `Form.TextArea` 字段用于输入 JSON 文本。表单 MUST 通过 `Action.SubmitForm` 提交。提交时 MUST 调用 `JSON.parse` 校验输入；成功时 MUST 推送到树的根页面，失败时 MUST 推送到错误页面展示解析失败原因，表单本身不再保留在导航栈中。

#### Scenario: Manual JSON succeeds

- **WHEN** 用户在表单中输入合法 JSON 并按下回车
- **THEN** 命令进入 `JsonNodePage`，展示根节点的直接子节点

#### Scenario: Manual JSON fails to parse

- **WHEN** 用户在表单中输入非合法 JSON 并按下回车
- **THEN** 命令进入 `JsonErrorPage`，展示错误信息与原始输入，附"返回编辑"Action

#### Scenario: Empty submission

- **WHEN** 用户提交空白内容
- **THEN** 命令进入 `JsonErrorPage`，提示输入为空

## REMOVED Requirements

### Requirement: Clipboard auto-detection on mount
**Reason**: 改为始终从 Form 入口开始，避免误识别剪贴板中的非 JSON 内容（例如刚刚复制的一段 SQL）。
**Migration**: 用户主动在 Form 中粘贴 JSON 文本。

### Requirement: Result view provides copy actions
**Reason**: 不再有"美化后 Detail"结果视图；复制能力下放至每个节点的 Action（Open / Copy Value / Copy JSON Path / Copy JSON）。
**Migration**: 在树形浏览页或 Primitive 详情页通过 ActionPanel 的对应 Action 复制。

### Requirement: Result view exposes metadata
**Reason**: 不再使用 Detail 视图作为结果承载；类型、字符数、字节数等信息由 `JsonValuePage` 的 Metadata 侧栏针对单个节点展示。
**Migration**: 点击任意 Primitive 节点，在 `JsonValuePage` 详情中查看 Key / Type / Value / JSONPath。

## ADDED Requirements

### Requirement: Tree-based browsing

解析成功后 MUST 进入 `JsonNodePage`，按 JSON 树结构逐层展示。每次只渲染当前 Object 或 Array 的直接子节点，不递归渲染整棵 JSON。

#### Scenario: Object shows children with Folder icon

- **WHEN** 当前节点是 object 且拥有直接子键
- **THEN** 每个子键作为一个 `List.Item` 渲染，`accessories` 显示类型 `object`，图标为 `Icon.Folder`

#### Scenario: Array shows children with List icon

- **WHEN** 当前节点是 array 且拥有元素
- **THEN** 每个元素作为一个 `List.Item` 渲染，`accessories` 显示类型 `array`，图标为 `Icon.List`

#### Scenario: Primitive renders without further navigation

- **WHEN** 当前节点是 string / number / boolean / null
- **THEN** 不展示下钻 Action，而是展示一个跳转到 `JsonValuePage` 的 Action

### Requirement: Lazy navigation via Action.Push

每一层 Object / Array 都 MUST 通过 `Action.Push` 进入新的 `JsonNodePage` 实例。下钻时 MUST 按需构造子节点数组（而非一次性构造整棵树），以支持超过 100000 节点的输入。

#### Scenario: Drill into an object

- **WHEN** 用户在 `JsonNodePage` 选中一个 object 子键并触发主操作
- **THEN** 导航栈压入一个以该子键 key / path 为参数的新 `JsonNodePage`，渲染该层的直接子节点

#### Scenario: Drill into an array element

- **WHEN** 用户在 `JsonNodePage` 选中一个 array 元素并触发主操作
- **THEN** 导航栈压入一个以 `[index]` 为 path 的新 `JsonNodePage`，渲染该元素的直接子节点

### Requirement: JSONPath

每个 `JsonNode` MUST 维护其标准 JSONPath：

- 根节点 path 固定为 `$`。
- Object 子节点 path 为 `parentPath + "." + key`；当 key 含 `.` / `[` 时使用 `['key']` 形式。
- Array 子节点 path 为 `parentPath + "[" + index + "]"`。

#### Scenario: Path reflects object hierarchy

- **WHEN** 用户下钻到 `$.user.address.city`
- **THEN** 该节点的 path 字段正好是 `$.user.address.city`

#### Scenario: Path reflects array index

- **WHEN** 用户下钻到 `$.items[0]`
- **THEN** 该节点的 path 字段正好是 `$.items[0]`

### Requirement: Primitive detail page

点击 Primitive 子节点 MUST 推送到 `JsonValuePage`，使用 `Detail` 视图展示：

- 主区域：原始值的 Markdown 代码块。
- 元数据侧栏：`Key` / `Type` / `JSONPath`。

#### Scenario: String primitive page

- **WHEN** 用户点击一个 string 子节点
- **THEN** `JsonValuePage` 主区域以 Markdown 围栏代码块展示字符串值，元数据侧栏列出 Key / Type=`string` / JSONPath

#### Scenario: Number primitive page

- **WHEN** 用户点击一个 number 子节点
- **THEN** `JsonValuePage` 主区域展示数字值，元数据侧栏列出 Key / Type=`number` / JSONPath

#### Scenario: Boolean primitive page

- **WHEN** 用户点击一个 boolean 子节点
- **THEN** `JsonValuePage` 主区域展示 `true` 或 `false`，元数据侧栏列出 Key / Type=`boolean` / JSONPath

#### Scenario: Null primitive page

- **WHEN** 用户点击一个 `null` 子节点
- **THEN** `JsonValuePage` 主区域展示 `null`，元数据侧栏列出 Key / Type=`null` / JSONPath

### Requirement: Copy actions per node

每个节点 MUST 提供以下 Action：

- Object / Array 节点：`打开`（`Action.Push` 进入下钻页）、`复制 JSON`、`复制 JSONPath`。
- Primitive 节点：`复制值`、`复制 JSONPath`、`复制 JSON`。

"复制 JSON" MUST 复制当前根节点的 2 空格缩进美化版本。"复制 JSONPath" MUST 复制该节点的 JSONPath 字符串。"复制值" MUST 复制原始 JS 值（字符串保留引号，数字/布尔/null 以字面量表示）。

#### Scenario: Copy JSON from an object node

- **WHEN** 用户在 object 节点上触发 "复制 JSON" Action
- **THEN** 剪贴板包含以 2 空格缩进的美化 JSON 字符串

#### Scenario: Copy JSONPath from a node

- **WHEN** 用户在任意节点上触发 "复制 JSONPath" Action
- **THEN** 剪贴板包含该节点的 JSONPath，例如 `$.user.address.city`

#### Scenario: Copy value from a primitive node

- **WHEN** 用户在 string 子节点上触发 "复制值" Action
- **THEN** 剪贴板包含原始字符串值（不含额外引号）；对于 boolean 则为 `true` / `false`，null 则为字面量 `null`

### Requirement: Node icons by type

每个 `List.Item` 的图标 MUST 根据节点类型选择：

- `object` → `Icon.Folder`
- `array` → `Icon.List`
- `string` → `Icon.Text`
- `number` → `Icon.Number`
- `boolean` → `Icon.Checkmark`
- `null` → `Icon.MinusCircle`

#### Scenario: Icon matches node type

- **WHEN** 当前层包含不同类型的子节点
- **THEN** 每个 `List.Item` 的图标与对应类型匹配

### Requirement: List item subtitle summarises the value

`List.Item` 的 `subtitle` MUST 显示值的摘要：

- Primitive：原始值字面量（字符串截断到合理长度）。
- Object：`N keys`。
- Array：`N items`。

#### Scenario: Object subtitle shows key count

- **WHEN** 当前层包含一个 5 字段的 object 节点
- **THEN** 该 `List.Item` 的 subtitle 为 `5 keys`

#### Scenario: Array subtitle shows item count

- **WHEN** 当前层包含一个 3 元素的 array 节点
- **THEN** 该 `List.Item` 的 subtitle 为 `3 items`

### Requirement: Search filters current layer keys

`JsonNodePage` MUST 启用 Raycast `List` 自带的搜索；搜索 MUST 仅作用于当前层节点的 `key`（即 `List.Item.title`），不进行跨层级或值搜索。

#### Scenario: Search narrows visible items

- **WHEN** 用户在 `JsonNodePage` 的搜索框中输入子串
- **THEN** `List` 仅展示 `key` 包含该子串的子节点

### Requirement: Error page recovers to Form

`JsonErrorPage` MUST 在 `Detail` 视图展示错误信息与原始输入，并提供一个 `返回编辑` Action（通过 `navigation.pop()` 回到 `Form`）。

#### Scenario: Recover from parse error

- **WHEN** `JsonErrorPage` 显示后用户触发 `返回编辑`
- **THEN** 导航回到 `Form`，原始输入仍在 TextArea 中可编辑

### Requirement: Node data model

`src/json-viewer/types.ts` MUST 定义 `JsonNode` 类型，至少包含字段：`key`、`indexKey`、`path`、`type`、`value`、`displayValue`、`childCount?`、`children?`。所有 UI 层 MUST 通过 `JsonNode` 操作 JSON，禁止直接持有原始 JS 值进行展示。

#### Scenario: UI consumes JsonNode exclusively

- **WHEN** `JsonNodePage` 渲染子节点列表
- **THEN** 数据来源是 `JsonNode[]`，而非原始 `unknown` 值
