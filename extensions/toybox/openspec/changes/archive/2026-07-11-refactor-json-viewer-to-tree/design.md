## Context

当前 `src/json.tsx` 把整个 JSON 值用 `JSON.stringify(value, null, 2)` 美化后丢进 `Detail` 视图的 ```json``` 围栏代码块里。问题有三个：

1. 嵌套深的 JSON 完全无法折叠 / 跳读，只能靠 Cmd+F 在 Markdown 里搜；
2. 拿不到单个字段的 JSONPath，复制时要手工数括号；
3. 整段文本一次性塞进单一 React 视图，节点数很大时（数万节点以上）容易卡顿甚至无响应。

Raycast 官方组件（`List` / `ActionPanel` / `Action.Push` / `Detail` / `Form`）本身支持懒导航与独立子页面，天然适合"逐层下钻"的交互模型。本次重构直接采用这套官方模型，不再依赖 Detail 的 Markdown 渲染能力。

## Goals / Non-Goals

**Goals:**

- 用 `List` + `Action.Push` 实现纯原生树形浏览，不引入 WebView / iframe / 第三方组件。
- 支持 100k+ 节点的 JSON：每个页面只构建并渲染当前层的 `List.Item`，下钻时才构造下一层节点。
- 每个节点自带标准 JSONPath：`$.user.address.city`、`$.items[0]` 等，可被复制。
- Primitive 节点在 `Detail` 视图展示完整信息，并支持复制 Value / Path / 整段 JSON。
- 输入校验失败时给出明确错误页，包含原始输入与"重新输入"动作。

**Non-Goals:**

- 不提供编辑能力（只读查看）。
- 不实现全局 JSONPath 查询（只支持点击下钻与逐层 Key 搜索）。
- 不实现 diff / 对比 / 折叠全部等高级能力。
- 不引入新依赖。

## Decisions

### Decision 1: 数据结构 = 懒构建的 `JsonNode` 树

`JsonNode` 是一个扁平引用结构：

```ts
type JsonNodeType = "object" | "array" | "string" | "number" | "boolean" | "null";

interface JsonNode {
  key: string;          // 当前节点在其父中的展示名（顶层为 "root"）
  indexKey: string;     // 用于生成子节点 key 的原始名（数组下标或对象键名）
  path: string;         // 标准 JSONPath，例如 "$.user.address.city"
  type: JsonNodeType;
  value: unknown;       // 原始 JS 值，仅在 primitive 时使用
  displayValue: string; // 列表中显示的摘要
  childCount?: number;  // object/array 时填充
  children?: JsonNode[]; // object/array 时填充（懒填充，仅在用户下钻时构造）
}
```

- `jsonParser.buildNode(value, key, parentPath)` 仅返回一个根节点，`children` 暂为 `undefined`。
- `jsonParser.expandChildren(node)` 在 `JsonNodePage` 挂载 / 用户首次下钻时被调用，按需填充 `children`。
- 优势：100k 节点的 JSON 只会触发与"当前层 + 直接子节点"规模相当的 React 渲染，远小于全量递归。

备选方案：在 `JSON.parse` 后一次性递归构造整棵树。优势是后续访问 O(1)，但首次构造与首屏渲染成本与节点数成正比，无法满足 100k+ 要求。

### Decision 2: JSONPath 计算

- 顶层根节点 path 固定为 `$`。
- Object 子节点：parentPath + `.` + 字段名。字段名若包含 `.` / `[` 等特殊字符，用 `['field']` 包裹。
- Array 子节点：parentPath + `[` + index + `]`。

实现集中在 `jsonPath.ts`，提供 `childPath(parentPath, key, indexKey, parentType)` 一个函数。

### Decision 3: 页面模型

三个 React 组件：

| 组件 | 职责 |
| --- | --- |
| `JsonInputForm`（在 `src/json.tsx` 内） | `Form.TextArea` 收集输入；提交时 `JSON.parse` 校验；成功 → `navigation.push(<JsonNodePage ...>)`；失败 → `navigation.push(<JsonErrorPage ...>)` |
| `JsonErrorPage`（在 `src/json.tsx` 内） | `Detail` 视图展示错误信息 + 原始输入 + "返回编辑" Action |
| `JsonNodePage`（`src/components/JsonNodePage.tsx`） | `List` 渲染当前层直接子节点；Object/Array → `Action.Push(<JsonNodePage ...>)`；Primitive → `Action.Push(<JsonValuePage ...>)` |
| `JsonValuePage`（`src/components/JsonValuePage.tsx`） | `Detail` 视图展示 Key / Type / Value / Path；提供复制操作 |
| `JsonTree`（`src/components/JsonTree.tsx`） | 被 `JsonNodePage` 调用的纯展示 `List`，把 `JsonNode[]` 转成 `List.Item` 数组 |

每一层都是独立的页面栈帧，浏览器/导航历史天然支持 ESC 返回上一层。

### Decision 4: 不再做剪贴板自动识别

之前版本会读取剪贴板内容，合法就直接跳到结果页。本次重构后，Form 是唯一入口，剪贴板自动识别反而会让"我刚刚复制了一段 SQL、却不小心打开 JSON 工具"的场景误触发解析。规格中也同步移除该 requirement。

### Decision 5: 节点图标

直接复用 `@raycast/api` 内置图标常量，避免引入 emoji 或自定义 SVG：

| 类型 | 图标 |
| --- | --- |
| object | `Icon.Folder` |
| array | `Icon.List` |
| string | `Icon.Text` |
| number | `Icon.Number` |
| boolean | `Icon.Checkmark` |
| null | `Icon.MinusCircle`（Raycast 没有 `Icon.Minus`，用 `MinusCircle` 表达"无值"） |

### Decision 6: 搜索范围 = 当前层 Key

- `JsonNodePage` 启用 Raycast `List` 的默认搜索（设置 `filtering` 让组件自带的子串匹配生效），但只在 title（key）上做匹配。
- 不做全局 JSONPath 搜索 / 值搜索——超出本次需求范围。

### Decision 7: Primitive 页面布局

`JsonValuePage` 用 `Detail.Metadata` 侧栏展示结构化字段（Key / Type / JSONPath），主区域用 markdown 代码块展示原始值。三个 Action：`Copy Value` / `Copy JSON Path` / `Copy JSON`（拷贝整个根 JSON 的 pretty 版本）。

## Risks / Trade-offs

- **Form 启动开销**：用户每次打开 JSON 工具都要先看到输入框。Mitigation：Form 是 Raycast 的常见入口模式，用户熟悉。
- **不递归构建 → 重复解析**：同一段 JSON 在多个下钻分支上展开时，object 字段每次都要重新遍历父对象才能拿到子节点。Mitigation：`buildNode` 仅生成 O(1) 元信息，遍历父对象本身也只是浅层 Object.keys 调用，远比一次性递归构造整棵树轻。
- **极大 array**：用户打开一个 100k 项的 array 节点时，`JsonNodePage` 仍要渲染 100k 个 `List.Item`。Mitigation：Raycast `List` 本身支持虚拟滚动；本次需求明确接受这种规模。
- **错误页无法编辑**：错误页提供"返回编辑" Action（`navigation.pop()`）；不直接在错误页提供 TextArea，避免破坏 `Form` 的单一输入职责。
- **破坏性变更**：原「剪贴板自动识别 → Detail 美化」被移除。Mitigation：扩展尚未发布，无现有用户依赖。

## Migration Plan

1. 在 `openspec/changes/refactor-json-viewer-to-tree/` 内完成 proposal / design / tasks / delta spec。
2. 实现 `src/json-viewer/{types,jsonParser,jsonPath}.ts` 与 `src/components/{JsonTree,JsonNodePage,JsonValuePage}.tsx`。
3. 重写 `src/json.tsx`。
4. 更新 `package.json` 的命令 description 与 `src/tools.ts` 的 keywords/description。
5. 跑 `npx tsc --noEmit`、`npm run lint`、`npx prettier --check src/`、`openspec validate refactor-json-viewer-to-tree`。
6. 在 `CHANGELOG.md` `[Unreleased]` 段添加变更条目。
7. `openspec archive refactor-json-viewer-to-tree --yes` 合并 delta 到 `openspec/specs/json-viewer/spec.md`。

## Open Questions

_（无——所有规格要求都在 `tmp/feature.md` 中明确列出，无歧义项。）_
