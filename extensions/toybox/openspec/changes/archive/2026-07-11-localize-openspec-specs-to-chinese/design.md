# 设计：将 openspec 文档中文化

## Context

仓库语言规范已统一为中文，但 `openspec/specs/` 与 `openspec/changes/archive/` 仍为英文。`AGENTS.md` 同时规定「禁止直接编辑规格文件——必须通过 change 走流程」，因此本次中文化必须走 OpenSpec 变更流程。

## 关键决策

### 1. Requirement 标题保留英文

OpenSpec 的 `## MODIFIED Requirements` delta 合并按 Requirement 标题做精确匹配。标题翻译后会破坏匹配、导致合并失败。

折中方案：

- `### Requirement: <title>` 标题保留英文原文（作为稳定 ID）
- Requirement 描述、Scenario 描述、WHEN/THEN 内容翻译为中文

### 2. 走 OpenSpec 流程修改 `openspec/specs/`

按 `AGENTS.md` 规范，使用 `openspec new change` → 写 proposal/design/tasks → 写 delta spec → `openspec validate` → `openspec archive --yes` 的标准流程。`openspec archive` 会把 delta spec 合并到 `openspec/specs/` 当前事实，并把 change 目录移到 `openspec/changes/archive/`。

### 3. archive 历史快照处理

OpenSpec archive 流程完成后，本次变更的 `proposal.md` / `design.md` / `tasks.md` 与 delta spec 会自然归档到 `openspec/changes/archive/<date>-localize-openspec-specs-to-chinese/`。

但 `openspec/changes/archive/2026-07-10-add-toybox-hub-and-initial-tools/` 是更早的历史归档（与本次变更无关），其中的 `proposal.md` / `design.md` / `tasks.md` / `README.md` 与 `specs/<能力>/spec.md` 也保持英文。

为与全仓语言规范一致，本次一并把 `2026-07-10-add-toybox-hub-and-initial-tools/` 下的所有文件翻译为中文。这是"翻译历史快照"而非"修改历史事实"——能力定义（WHEN/THEN）不变，commit 历史、归档时间均可在 git log 中追溯。

### 4. 不修改 OpenSpec 元数据

`openspec/config.yaml`、`.openspec.yaml` 等元数据文件保持原文（yaml 键名不属于"语言规范"适用范围）。

## 风险与权衡

- **archive 翻译的不可追溯性**：翻译历史快照后，git diff 中只能看到"英文→中文"的内容变化，看不到原版。要追溯原版需查看 git 历史提交。这是接受的成本——保持全仓语言一致更重要。
- **OpenSpec 工具不感知翻译**：OpenSpec 工具不区分"修改行为"与"翻译描述"，本次 delta 在工具视角是"内容变化"。validate 与 archive 都能正常通过。
- **WHEN/THEN 关键词的本地化**：BDD 风格 `WHEN ... THEN ...` 关键词在中文 spec 中保留英文（专有名词），这是 BDD 社区惯例。

## 迁移计划

- 现有 `openspec/specs/` 由 `openspec archive` 自动替换为中文版本
- `openspec/changes/archive/2026-07-10-add-toybox-hub-and-initial-tools/` 在本次 commit 中直接翻译
- 后续所有 OpenSpec 变更的 `proposal.md` / `design.md` / `tasks.md` 与 `specs/` 一律使用中文撰写

## Open Questions

_（无）_
