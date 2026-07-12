# 恢复 JSON 查看器的剪贴板智能识别

## Why

上一个变更 `refactor-json-viewer-to-tree` 把 `json` 命令入口改为「Form 唯一入口 + 手动提交」，丢掉了「挂载时自动读取剪贴板 → 合法 JSON 直接进入树形浏览」的能力。开发者日常场景是「在浏览器/终端/日志里复制了一段 JSON → 切到 Raycast 打开 JSON 工具 → 直接看结构」，手动粘贴多了一步切换体验。

本次变更在树形查看器基础上恢复剪贴板智能识别：挂载时尝试读取剪贴板，合法 JSON 直接 push `JsonNodePage`；剪贴板为空 / 读取失败 / 内容非 JSON 时回退到 Form 手动输入。整个识别流程 MUST 不再跳到 `Detail` 美化视图（那是上一代体验），而是统一进入树形浏览。

## What Changes

- 在 `src/json.tsx` 的命令入口重新引入 `useEffect`：挂载时调用 `Clipboard.readText()`。
- 读取成功后 MUST 调用 `JSON.parse` 校验；合法则 `navigation.push(<JsonNodePage root>)`，非法 / 空 / 异常则渲染 `Form` 兜底。
- 读取过程 MUST 提供 loading 态（`Detail isLoading`）以避免空白闪烁。
- 校验失败 / 读取失败时 MUST 走原有 Form 兜底 + Toast 提示路径，不得崩溃。
- 同步更新 `openspec/specs/json-viewer/spec.md`：把 `Manual entry via Form` Requirement 从「唯一入口」改为「兜底入口」，并新增 `Clipboard auto-detection on mount` Requirement。

## Capabilities

### New Capabilities

_（无——属于 json-viewer 能力增量）_

### Modified Capabilities

- `json-viewer`：恢复剪贴板智能识别为入口能力之一，Form 退为兜底。详见 `specs/json-viewer/spec.md`。

## Impact

- 影响代码：`src/json.tsx`（重新引入 useEffect + Clipboard.readText + 加载态）。
- 影响用户：挂载命令时若剪贴板已有合法 JSON，将直接进入树形浏览页；与上一代体验对齐。
- 影响依赖：不新增依赖。
- 影响规格：`openspec/specs/json-viewer/spec.md` 增量更新（delta 形式）。
