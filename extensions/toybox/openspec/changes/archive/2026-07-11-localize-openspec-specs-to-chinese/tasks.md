# 任务清单

## 1. 创建 OpenSpec 变更

- [x] 1.1 运行 `openspec new change localize-openspec-specs-to-chinese`
- [x] 1.2 撰写 `proposal.md`、`design.md`、`tasks.md`

## 2. 撰写 delta spec

- [x] 2.1 撰写 `specs/json-viewer/spec.md`（`## MODIFIED Requirements`，标题保留英文，正文翻译）
- [x] 2.2 撰写 `specs/mybatis-sql-formatter/spec.md`（同上）
- [x] 2.3 撰写 `specs/toybox-hub/spec.md`（同上）

## 3. 校验与归档

- [x] 3.1 运行 `openspec validate localize-openspec-specs-to-chinese`
- [x] 3.2 运行 `openspec archive localize-openspec-specs-to-chinese --yes` 合并 delta 到 `openspec/specs/`

## 4. 翻译历史归档

- [x] 4.1 翻译 `openspec/changes/archive/2026-07-10-add-toybox-hub-and-initial-tools/proposal.md`
- [x] 4.2 翻译 `openspec/changes/archive/2026-07-10-add-toybox-hub-and-initial-tools/design.md`
- [x] 4.3 翻译 `openspec/changes/archive/2026-07-10-add-toybox-hub-and-initial-tools/tasks.md`
- [x] 4.4 翻译 `openspec/changes/archive/2026-07-10-add-toybox-hub-and-initial-tools/README.md`
- [x] 4.5 翻译三个 `specs/<能力>/spec.md`

## 5. 收尾

- [x] 5.1 在 `CHANGELOG.md` `[Unreleased]` 段追加本次条目
- [x] 5.2 提交
