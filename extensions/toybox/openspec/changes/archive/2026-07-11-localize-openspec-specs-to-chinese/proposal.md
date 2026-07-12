# 将 openspec 文档中文化

## Why

仓库已在 `AGENTS.md` 的「语言规范」中明确要求所有 Markdown 文档使用中文（标识符、命令、路径保留英文原文）。`package.json`、`src/` 与项目级 README/CHANGELOG 已在前面的提交中完成中文化，但 `openspec/specs/`（当前事实）与 `openspec/changes/archive/`（历史快照）仍为英文，与全仓语言规范不一致。

本次变更在不修改任何 WHEN/THEN 行为、不影响能力本身的前提下，把所有 openspec 文档翻译为中文，让中文贡献者与 AI Agent 在阅读规格时无需切换语言。

## What Changes

- 通过 OpenSpec 变更流程把 `openspec/specs/json-viewer/spec.md`、`openspec/specs/mybatis-sql-formatter/spec.md`、`openspec/specs/toybox-hub/spec.md` 三个当前事实翻译为中文。
- 为保持 OpenSpec delta 合并工具的兼容性，每个 Requirement 标题（`### Requirement: <title>` 中的 `<title>`）保留英文原文作为稳定标识符，仅翻译 Requirement 描述、Scenario 描述与 WHEN/THEN 内容。
- 直接翻译 `openspec/changes/archive/2026-07-10-add-toybox-hub-and-initial-tools/` 下的所有历史快照（`proposal.md`、`design.md`、`tasks.md`、`README.md` 与 `specs/<能力>/spec.md`），让历史归档与当前事实保持语言一致。

## Capabilities

### New Capabilities

_（无）_

### Modified Capabilities

- `json-viewer`：本地化为中文（行为不变）
- `mybatis-sql-formatter`：本地化为中文（行为不变）
- `toybox-hub`：本地化为中文（行为不变）

## Impact

- 影响用户：仅文档语言变化，对运行时行为、命令面板、API 无任何影响。
- 影响开发者：未来阅读/修改规格时使用中文，降低中文贡献者的理解成本。
- 历史归档：`openspec/changes/archive/2026-07-10-add-toybox-hub-and-initial-tools/` 中的英文文档将被中文版本覆盖；变更历史与 git 提交仍可追溯。
