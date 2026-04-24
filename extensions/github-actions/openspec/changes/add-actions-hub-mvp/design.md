## Context

当前仓库只有一个用于展示假数据的 Raycast demo 命令，还没有任何 GitHub 认证、API 层、命令分层或持久化状态。需求已经收敛为“面向个人开发者的 GitHub Actions 统一操作入口 MVP”，重点是让用户在 Raycast 内完成 rerun、rerun failed jobs、cancel、workflow dispatch 这些高频操作，而不是构建一个覆盖全部 GitHub Actions API 的管理后台。

Raycast 的交互模型更适合少命令、短路径、高频动作，因此首版需要把命令设计成按用户意图组织，而不是按 GitHub 资源对象组织。同时 GitHub Actions 的核心能力已经可以通过 REST API 覆盖，首版没有必要引入 GraphQL 或要求用户本地安装 gh CLI。

## Goals / Non-Goals

**Goals:**
- 提供一个 `Actions Hub` 主命令，集中展示最近目标与最近 workflow runs，并直接提供高频操作。
- 提供一个 `Dispatch Workflow` 独立命令，支持用户选择 workflow、ref 并填写 inputs 后触发 workflow_dispatch。
- 建立最小但完整的 GitHub REST API 封装、PAT 认证、错误处理与最近目标持久化能力。
- 将查看能力控制在“支撑操作决策”的范围内，只提供最小详情，不建设重型诊断视图。

**Non-Goals:**
- 不实现 secrets、variables、permissions、self-hosted runners、runner groups、billing、usage 等管理员能力。
- 不实现完整日志查看器、artifacts 下载管理台或多仓库总览控制台。
- 不依赖 GraphQL、gh CLI、GitHub App 认证或组织级控制模型。

## Decisions

### 1. 使用双命令结构而不是按资源拆分多个命令
- 选择：首版只提供 `Actions Hub` 和 `Dispatch Workflow` 两个核心命令。
- 原因：用户来 Raycast 是为了快速完成动作，而不是浏览 GitHub Actions 的完整资源树。少命令可以降低记忆成本，也更符合“统一操作入口”定位。
- 备选方案：拆分出 `List Workflows`、`List Jobs`、`Artifacts` 等更多命令。
- 放弃原因：命令过多会让首版从操作工具滑向控制台，增加交互复杂度。

### 2. 将 workflow run 视为主要操作单元
- 选择：`Actions Hub` 以最近 runs 列表作为主内容，每个 run item 直接挂载 rerun、rerun failed jobs、cancel、open in browser 等动作。
- 原因：对个人开发者来说，workflow run 是最常见的决策点；用户先判断 run，再决定要不要重跑或取消。
- 备选方案：先选 repo，再选 workflow，再选 run 的分步导航。
- 放弃原因：步骤过长，削弱 Raycast 的速度优势。

### 3. 将 dispatch 流程单独建成表单命令
- 选择：`Dispatch Workflow` 独立承载 repo 选择、workflow 选择、ref 输入和动态 inputs 表单。
- 原因：dispatch 与 run 操作属于不同交互流，前者是显式表单，后者是列表动作；分开可以减少主命令负担。
- 备选方案：把 dispatch 作为 `Actions Hub` 内的二级 action。
- 放弃原因：会让主命令既要承担浏览，又要承担复杂表单，不利于首屏简洁。

### 4. 首版技术边界固定为 REST API + PAT
- 选择：通过 GitHub REST API 封装 workflows、runs、jobs、rerun、cancel、dispatch 等操作；认证使用 Raycast preferences 中配置的 PAT。
- 原因：REST 足以覆盖首版核心能力；PAT 是 Raycast extension 最直接、最稳妥的认证方式。
- 备选方案：GraphQL、gh CLI、OAuth 或 GitHub App。
- 放弃原因：GraphQL 对 Actions 核心能力覆盖有限；gh CLI 会引入运行时依赖；OAuth / GitHub App 会显著抬高首版复杂度。

### 5. 轻量详情页只用于确认，不用于完整诊断
- 选择：保留一个 minimal details 层，展示 run 基本信息、job 简表，以及网页跳转入口。
- 原因：用户在操作前需要确认对象，但首版不应尝试在 Raycast 内完整承载日志诊断体验。
- 备选方案：实现完整日志查看与调试视图。
- 放弃原因：交互重、实现重，而且不符合“快速操作优先”的产品主张。

### 6. 最近目标与最近 repo 需要持久化
- 选择：在本地持久化最近 repo / workflow / 常用目标，作为 `Actions Hub` 首屏的 Recent Targets。
- 原因：统一操作入口的成功关键之一就是减少重复选择成本。
- 备选方案：每次都从头选择 repo 和 workflow。
- 放弃原因：会削弱高频工具的效率价值。

## Risks / Trade-offs

- [workflow_dispatch inputs 的动态表单复杂] → 先支持 GitHub API 可直接返回/推导的字段；对复杂输入先保证可提交，再逐步优化表单体验。
- [用户仓库很多时，repo 选择成本高] → 通过最近 repo、搜索过滤和默认最近目标来降低摩擦。
- [rerun failed jobs 并非所有 run 都支持] → 在 UI 上按状态与能力条件动态显示 action，并提供明确的不可用提示。
- [PAT 权限不足导致操作失败] → 在 preferences 与错误提示中明确最小权限要求，并将权限错误单独分类。
- [首版查看能力过少，用户仍需跳 GitHub 网页] → 接受该取舍，把网页跳转视为首版能力边界的一部分，优先保证操作闭环成立。
