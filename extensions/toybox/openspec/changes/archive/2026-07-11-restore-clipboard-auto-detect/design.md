## Context

`src/json.tsx` 在上一次重构后只渲染一个 `Form`，完全靠用户主动粘贴。仓库历史归档 `2026-07-10-add-toybox-hub-and-initial-tools/specs/json-viewer/spec.md` 中曾规定过「挂载时自动读取剪贴板 → 合法则跳到 Detail 视图」的行为；本次重构出于避免误触发的考虑移除了它。开发者实际使用时仍期望保留这一能力——剪贴板智能识别是 ToyBox 各工具的统一体验。

设计目标：在不破坏树形查看器的前提下，把剪贴板智能识别加回来，且让识别后跳转的目标是 `JsonNodePage` 而非历史 `Detail` 视图。

## Goals / Non-Goals

**Goals:**

- 挂载命令时尝试 `Clipboard.readText()`，调用结果分为三种情况：
  1. 文本可解析为 JSON → 直接 `navigation.push(<JsonNodePage root>)`，用户无需任何额外操作。
  2. 文本为空 / 解析失败 / 读取抛错 → 回退到 `Form` 手动输入。
- 读取期间显示 loading 态，避免空白闪烁。
- 整个流程保持纯函数化（解析逻辑已在 `json-viewer/jsonParser.ts` 中）；只新增剪贴板读取与路由编排。

**Non-Goals:**

- 不做「剪贴板内容历史记录 / 多次回填」。
- 不做「JSONPath 直达」——剪贴板入口和 Form 入口一样只跳到根节点。
- 不修改 `jsonParser.ts` / `jsonPath.ts` / 任何 `components/`。

## Decisions

### Decision 1: 加载态用 `<Detail isLoading markdown="..." />`

读取剪贴板是异步操作（`Clipboard.readText()` 返回 Promise），命令第一次渲染时还没有结果。沿用 Raycast 推荐的「loading 占位 → 异步数据就绪 → 渲染真实视图」模式：用 `<Detail isLoading markdown="正在读取剪贴板…" />` 作为初始态，结果就绪后用 `useEffect` 触发 `navigation.push` 跳转。

### Decision 2: 用 `useState` 跟踪三态：loading / ready / error

读取剪贴板可能抛错（如系统权限被拒绝），也可能返回空字符串。我们用以下状态机：

- `loading`：尚未读完。
- `ready(value)`：读取完成，`value` 是原始字符串（可能为空、可能不是 JSON）。
- `error(message)`：读取抛错，`message` 是错误消息，用于 Toast。

状态转换由 `useEffect` 中的 async 闭包驱动；进入 `ready` / `error` 后剪贴板读取只跑一次。

### Decision 3: Form 是「兜底」，不是「唯一入口」

Form 仍然存在，并提供：

- TextArea 默认值 = 剪贴板原始文本（如果有，让用户微调）。
- 「View JSON」主操作，提交时复用 `parseJson` + `buildNode` + `navigation.push(<JsonNodePage>)` 流程。

这样与上一版的 Form 行为一致；区别只在入口出现了「先读剪贴板」一步。

### Decision 4: 解析失败走 Form 而非 JsonErrorPage

剪贴板里的非 JSON 字符串可能是其他工具残留（如 SQL、URL），不应直接进入错误页。Decision 3 的兜底 Form 默认值会被填充为剪贴板原文，让用户决定是删除还是改写。

### Decision 5: 错误处理

`Clipboard.readText` 抛错 → 显示一次 `Toast.Failure` + 回退到 Form（不阻塞命令使用）。这是上一版实现就采用的策略，继续沿用以保持 ToyBox 各工具的一致体验。

## Risks / Trade-offs

- **误触发**：剪贴板里恰好有一段 JSON 字符串、但用户其实想用 Form 看别的内容。Mitigation：识别后直接 push 一个新页面到导航栈，用户按 ESC 即可回到 Form（Form 仍在栈底）；如果想清掉这次自动识别，可以在 Form 中改写内容。
- **剪贴板读取耗时**：典型 < 50ms，loading 态一般一闪而过；用户感知不强。
- **clipboard 内容是大 JSON**：读取本身没有性能问题（Raycast API 内部已有限制），但 parseJson 仍会同步执行；与 Form 提交时一致。
- **重复触发**：useEffect 依赖空数组，组件挂载时只跑一次；后续 setState 不会再次读取。

## Migration Plan

1. 在 `openspec/changes/restore-clipboard-auto-detect/` 内完成 proposal / design / tasks / delta spec。
2. 修改 `src/json.tsx`：重新引入 useEffect / Clipboard.readText / 加载态；Form 保留并复用为兜底。
3. 在 `CHANGELOG.md` `[Unreleased]` 段添加变更条目。
4. 跑 `npx tsc --noEmit`、`npx eslint src/`、`npx prettier --check src/`、`openspec validate restore-clipboard-auto-detect`。
5. `openspec archive restore-clipboard-auto-detect --yes` 合并 delta。

## Open Questions

_（无——上一版实现已验证该模式可用，本次只是目标页面从 Detail 改为 JsonNodePage。）_
