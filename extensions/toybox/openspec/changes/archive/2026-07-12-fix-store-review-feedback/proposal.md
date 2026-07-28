# fix-store-review-feedback 提案

## Why

Raycast Store 审稿对 `toybox` 扩展发起 PR #29385 留下 7 条反馈，覆盖：JSON 顶层 Primitive 空树、MyBatis 占位符替换对字符串字面量不安全、INSERT 模板列切分错误、Hub 搜索失效、未使用运行时依赖、缺少商店 `metadata/` 截图、CHANGELOG 首发格式不符合 Raycast 规范。本变更一次性解决以上 7 项，使 PR 重新通过审稿。

## What Changes

- JSON 查看器：剪贴板解析为顶层 Primitive 时，直达 `JsonValuePage` 而非空 `JsonNodePage`。
- MyBatis SQL 格式化器：占位符替换改为「跳过单引号字符串 / 双引号字符串 / 行注释 / 块注释」后再匹配 `?`；`SELECT` 投影列切分改为「括号配对感知」，从而安全处理 `CONCAT(a, ', ', b) AS name` 等含逗号的函数调用。
- ToyBox Hub：恢复 Raycast `List` 内置按 `title / subtitle / keywords` 过滤，移除无效的 `filtering={false}` 与空操作的 `useTools` 包装。
- 工程：`package.json` 移除未使用的 `@raycast/utils` 运行时依赖；新增 `metadata/` 目录与三张 2000×1250 PNG 商店截图。
- 文档：`CHANGELOG.md` 首发条目改为 `## [Initial Version] - {PR_MERGE_DATE}`；同步更新 `AGENTS.md` 中「首次正式发布」段落以接受 `{PR_MERGE_DATE}` 占位符。

## Impact

- 影响的现有能力：`json-viewer`、`mybatis-sql-formatter`、`toybox-hub`。
- 不新增 / 不删除任何命令；公共类型 `JsonNode` / `ParsedParameter` 仅新增字段语义，不破坏现有调用方。
- 现有验收用例（树形浏览、复制 JSONPath、INSERT 模板生成等）保持向后兼容。

## Out of Scope

- 新增工具。
- 替换底层解析器（`JSON.parse` / 正则拆分参数）。
- 为 MyBatis 命令新增平台支持（仍仅 macOS / Windows）。
