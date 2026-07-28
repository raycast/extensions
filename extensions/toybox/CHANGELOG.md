# ToyBox Changelog

本文件从使用者视角记录 ToyBox 的功能与 UI 变更。维护性变更（`chore` / `docs` / `refactor` 等）不在此体现。条目按 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/) 类型归类（参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)），使用中文描述。

## [Unreleased]

### Added

- **新增 HTTP Client（即用即走）**：原生 Raycast HTTP 客户端，打开即读剪贴板、自动解析剪贴板 curl 命令、一页完成请求编辑与发送；支持 Method / URL / Headers / Query（与 URL 双向同步）/ Body（JSON / FormData / x-www-form-urlencoded / Raw）/ Timeout / 重定向；响应页展示状态 / 耗时 / 大小 / Content-Type 与 Body / Headers / Cookies，JSON 响应可复用现有树形查看器；支持最近 20 条历史（FIFO）与不限数量收藏（LocalStorage 持久化）、复制 curl / fetch / axios、导出 curl。Refs: openspec/changes/archive/2026-07-25-add-http-client/

### Fixed

- 修复 MyBatis SQL 格式化器把 `null` 参数（MyBatis 不打印类型后缀）并入下一个带类型参数、导致参数错位与占位符串行偏移的缺陷（例如 35 个参数错缩为 16、末尾留下大量未替换 `?`）；现在 `null` 作为独立参数解析、对应位置输出 `NULL`。Refs: openspec/changes/archive/2026-07-23-fix-mybatis-null-parameter-parsing/
- 修复 MyBatis SQL 格式化器在「`Preparing:` 完整带时间戳的日志」输入下仅输出参数值、丢失 SQL 模板的回归（例如 `'101''公众交付团队'`）；现在 SQL 关键字、表名、`LIKE` / `concat` 等模板字符完整保留，`?` 仅在 SQL 语法上下文处被替换。Refs: openspec/changes/fix-mybatis-substitute-placeholder-template-loss/

## [Initial Version] - {PR_MERGE_DATE}

### Added

- **ToyBox 工具集首发**：在 Raycast 中提供 ToyBox 工具中心、JSON 查看器、MyBatis SQL 格式化器三个工具；工具中心可一键跳转任意子命令，搜索框支持按 `title` / `keywords`（含常用中文检索词）过滤列表
- **JSON 查看器**：原生 List / Action.Push 树形浏览器，支持剪贴板智能识别、对象 / 数组懒加载下钻、标准 JSONPath 展示、Primitive 详情查看与一键复制（值 / JSONPath / 整段 JSON）
- **MyBatis SQL 格式化器**：解析 `Preparing:` / `Parameters:` 日志行，把绑定值替换进 SQL 模板中处于 SQL 语法上下文的 `?` 占位符；可选「复制为 INSERT」动作会把 `SELECT` 投影列（括号配对感知）拼成 `INSERT INTO … VALUES (?, ?, …)` 模板
- **商店截图**：新增 `metadata/` 目录，内含 ToyBox / JSON 查看器 / MyBatis 三个命令的 Raycast 风格商店截图（2000×1250 PNG，16:10）

### Changed

- **界面文案统一中文化**：扩展/命令的描述、表单字段、操作按钮、Toast 提示等用户可见文案统一改为中文（底层技术关键词保持英文以便检索）
- **JSON 查看器重构为原生树形浏览器**：采用「表单输入 → 树形浏览 → 字段详情」三层结构，支持点击节点下钻与 JSONPath 复制
- **三个命令配置独立图标**：ToyBox 工具中心、JSON 查看器、MyBatis SQL 格式化器在 Raycast 命令面板中分别展示对应图标，便于识别

### Fixed

- 修复 JSON 查看器对顶层 Primitive 输入（如 `"hello"` / `123` / `true` / `null`）显示空树的缺陷，现在直达详情页
- 修复 MyBatis 格式化器对字符串字面量内 `?`（如 `LIKE '%?%'`）以及行 / 块注释内 `?` 的误替换
- 修复 MyBatis 「复制为 INSERT」对含逗号函数表达式（如 `CONCAT(a, ', ', b) AS name`）的列切分错误
- 修复 ToyBox 工具中心搜索框输入不生效的问题

### Refactor

- 移除未使用的 `@raycast/utils` 运行时依赖
- 全部规格与 PR 文案统一为中文
