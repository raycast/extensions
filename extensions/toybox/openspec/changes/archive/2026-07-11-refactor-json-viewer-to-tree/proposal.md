# 重构 json-viewer 为树形查看器

## Why

当前 `json` 命令仅是一个 JSON 美化器——把整段文本塞进 `Detail` 视图的 Markdown 围栏代码块里。实际使用中开发者面对的多是嵌套很深的 API 返回、配置或日志 JSON，单一长字符串很难定位、无法折叠，也没办法直接拿到某个字段的 JSONPath。

本次重构把它替换为原生 Raycast 树形查看器：以 `Form` 收集输入 → `Action.Push` 逐层进入 → `List` 展示当前层的直接子节点。Object / Array 节点继续下钻，Primitive 节点跳到 `Detail` 面板展示完整信息并支持复制值 / 路径 / 整段 JSON。整套实现严格使用 Raycast 官方组件（`List` / `ActionPanel` / `Action.Push` / `Detail` / `Form`），不使用 WebView、iframe 或第三方 JSON Viewer。

## What Changes

- **BREAKING** 移除 `Detail` 视图中的 2 空格缩进美化输出与元数据侧栏（类型/字符数/字节数）。
- **BREAKING** 移除挂载时的剪贴板自动识别；改为始终从 `Form` 开始，让用户显式提交要查看的 JSON。
- 新增 `Form` 输入页：`Form.TextArea` 收集 JSON 文本，提交后调用 `JSON.parse` 校验。
- 新增解析错误页：`Detail` 视图展示解析失败原因与原始输入，附"重新输入"Action。
- 新增树形浏览页 `JsonNodePage`：展示当前层的直接子节点，按类型渲染图标（Folder/List/Text/Number/Checkmark/Minus）。
- 新增 Primitive 详情页 `JsonValuePage`：展示 Key / Type / Value / JSONPath，支持复制 Value / Path / JSON。
- 新增懒加载导航：每一层都是独立的 `Action.Push` 目标，避免一次性构建整棵 React Tree，以支持超过 100000 节点的输入。
- 新增 JSONPath 工具：每个节点维护 `$.user.address.city` / `$.items[0]` 形式的路径。
- 新增共享类型与工具：
  - `src/json-viewer/types.ts`：定义 `JsonNode`、`JsonNodeType`、`BuildNodeOptions` 等。
  - `src/json-viewer/jsonParser.ts`：把任意 `unknown` 转换为懒构建的 `JsonNode` 树（仅暴露直接子节点引用，不递归复制整个子树）。
  - `src/json-viewer/jsonPath.ts`：路径与字段名 / 数组下标之间的转换。
- 新增 `src/components/JsonTree.tsx`：`List` 渲染当前层节点，附带类型图标、值摘要与搜索（仅匹配当前层 Key）。
- `src/json.tsx` 重写为新的命令入口，串联 `Form → 解析 → 树根` 流程。
- 同步更新 `package.json` 中 `json` 命令的 description，并更新 `src/tools.ts` 中的关键词，使中央入口仍能定位到它。
- 在 `CHANGELOG.md` `[Unreleased]` 段记录本次重构。

## Capabilities

### New Capabilities

_（无——`json-viewer` 已存在，本次是行为重构）_

### Modified Capabilities

- `json-viewer`：从 JSON 美化器重构为树形查看器；行为、UX 与依赖组件全部变化。详见 `specs/json-viewer/spec.md`。

## Impact

- 影响代码：
  - `src/json.tsx`：完全重写。
  - 新增 `src/components/JsonTree.tsx`、`src/components/JsonNodePage.tsx`、`src/components/JsonValuePage.tsx`。
  - 新增 `src/json-viewer/types.ts`、`src/json-viewer/jsonParser.ts`、`src/json-viewer/jsonPath.ts`。
- 影响命令面板：`json` 命令的 description 从「美化剪贴板或手动输入的 JSON」改为「以树形结构浏览 JSON 文本」。
- 影响中央入口：`src/tools.ts` 中 `json` 工具的 description 与 keywords 同步更新。
- 影响依赖：不引入新依赖；仍只使用 `@raycast/api`。
- 影响规格：`openspec/specs/json-viewer/spec.md` 将通过 delta 形式被替换。
- 影响行为：原「剪贴板自动识别 → Detail 视图」流程被移除；改为「Form 输入 → 树形浏览」。这是 **BREAKING** 变更，但因扩展尚未正式发布，对最终用户无实际影响。
