# 仓库贡献指南

ToyBox Raycast 扩展的贡献者与 AI Agent 指南。**本仓库统一使用中文**撰写文档、提交信息、PR 说明、Issue 与代码注释（标识符、命令、路径等仍按原样使用英文）。

## 项目结构与模块组织

- `src/` – 每个 Raycast 命令一个 `.tsx` 文件，另有共享注册表。
  - `toybox.tsx` – 主入口（可搜索的工具列表）。
  - `json.tsx`、`mybatis.tsx` – 单个工具命令。
  - `tools.ts` – 工具注册表，新增工具在此追加即可。
  - `utils/` - 工具方法所在包
  - `components/` - 组件包
- `assets/` – 静态资源（如 `extension-icon.png`）。
- `openspec/` – 规格驱动的变更管理。
  - `specs/<能力名>/spec.md` – 当前事实，每个能力一个目录。
  - `changes/archive/<YYYY-MM-DD>-<名称>/` – 已完成的变更提案。
- `tmp/` – 需求草稿区。
- `package.json` – Raycast 清单；`commands` 数组声明所有对外暴露的工具。

## 构建、测试与开发命令

- `npm run dev` – 启动 Raycast 热重载开发循环（`ray develop`）。
- `npm run build` – 生产构建（`ray build`），发布前必跑。
- `npm run lint` / `npm run fix-lint` – 运行 / 自动修复 ESLint（使用 Raycast 配置）。
- `npx tsc --noEmit` – 仅做类型检查。
- `npx prettier --check src/` / `--write src/` – 校验 / 自动格式化。
- `openspec validate --specs` – 校验 `openspec/specs/` 下所有规格。

## 参考资源

- [Raycast 官方开发文档](https://developers.raycast.com/) — Raycast 扩展 API、Manifest、UI 组件与发布流程的权威说明，开发本仓库时优先查阅。

## 代码风格与命名约定

- TypeScript strict 模式，目标 `ES2023`（见 `tsconfig.json`）。
- 2 空格缩进、双引号、`printWidth: 120`（见 `.prettierrc`）。
- ESLint 使用 `@raycast/eslint-config`，禁止无注释地禁用任何规则。
- 文件名小写（如 `json.tsx`）；Raycast 命令 ID 为单个英文小写词（如 `toybox`、`json`、`mybatis`）；OpenSpec capability ID 使用 kebab-case（如 `mybatis-sql-formatter`）。
- React 组件使用箭头函数；辅助函数放在所服务的组件下方。

## 测试指南

目前尚无自动化测试套件——解析逻辑通过临时脚本进行冒烟测试。后续添加测试时遵循：

- 测试文件以 `*.test.ts(x)` 命名，放在源码同级或 `src/__tests__/` 目录。
- 复用 OpenSpec 已采用的 BDD 风格（`WHEN … THEN …`）。

## 提交信息与 PR 规范

提交信息遵循 Conventional Commits，使用中文描述：

```
feat: 新增 Base64 编解码工具
fix: 修复 MyBatis 格式化器对单引号的转义
docs: 补充主入口搜索行为说明
```

提交正文需引用对应的 OpenSpec 变更，例如：

```
Refs: openspec/changes/archive/2026-07-10-add-toybox-hub-and-initial-tools/
```

PR 须通过 `npm run lint`、`npx tsc --noEmit`、`npx prettier --check src/`、`openspec validate --specs`；同步将用户可见的变更写入 `CHANGELOG.md`（详见下一小节）；用户可见的 UI 变更需附改动前后截图，并关联 `tmp/` 中原始需求。

## CHANGELOG 维护

每次完成新功能或新变更并合并到 `main` 之前，必须在同一 PR 中同步更新 `CHANGELOG.md`。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，条目按 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/) 类型归类，使用中文描述。

- **日常变更**：在 PR 合并前将本次变更追加到 `## [Unreleased]` 段对应类型子节下（`Added` / `Changed` / `Fixed` / `Removed` / `Docs` / `Chore` / `Refactor` 等），每条一行中文摘要。
- **首次正式发布**：将 `## [Unreleased]` 重命名为 `## [X.Y.Z] - YYYY-MM-DD`（版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)，日期为合并当天），并新建一个空的 `## [Unreleased]` 段。
- **OpenSpec 归档**：随变更归档同步在 `Added` / `Changed` 子节增加一行总结能力差异，并 `Refs:` 对应的归档路径。
- **维护性变更**：`chore:` / `docs:` / `refactor:` 等不影响用户使用的变更可仅做一行简述，避免日志过度膨胀。
- **语言规范适用**：CHANGELOG 全文使用中文；专有名词（Keep a Changelog、Conventional Commits、Semantic Versioning 等）保留英文原文。

## OpenSpec 工作流

每个新能力的引入都以一个变更（change）开始：

```bash
openspec new change <kebab-case-name>
# 编写 proposal.md、design.md、specs/<能力名>/spec.md、tasks.md
openspec validate <name>
openspec archive <name> --yes   # 所有任务勾选完成后执行
```

- `openspec/specs/` 是当前事实；`openspec/changes/archive/` 是历史归档。
- **禁止直接编辑规格文件**——必须通过 change 走流程。
- 实现完成后勾选 `tasks.md` 中对应任务，再运行 `openspec archive` 同步到主规格。
- 不要提交 `.codex/` 与 `.claude/`，它们由 `openspec init --tools codex,claude` 重新生成。

## 语言规范（本仓库统一使用中文）

- 所有 Markdown 文档、提交信息、PR 说明、Issue、Code Review 评论使用中文。
- 源码中的注释使用中文，标识符（变量名、函数名、类型名等）保持英文。
- 用户面向的字符串、错误提示、日志文案优先使用中文。
- 专有名词（Conventional Commits、BDD、OpenSpec、Raycast、ESLint 等）保留英文原文不翻译。
- AI Agent 在生成任何交付物前先确认本约定；遇到歧义时优先按本节执行。
