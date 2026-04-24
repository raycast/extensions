## Why

当前项目仍然只是一个 Raycast extension 骨架，尚未接入任何真实的 GitHub Actions 能力。对于个人开发者来说，GitHub Actions 的高频需求并不是“覆盖所有管理接口”，而是用最短路径完成 rerun、rerun failed jobs、cancel、workflow dispatch 这些日常操作，因此需要先定义一个聚焦、高频、适合 Raycast 交互模型的 MVP。

## What Changes

- 新增一个面向个人开发者的 GitHub Actions MVP 方案，定位为统一操作入口，而非完整管理后台。
- 定义 `Actions Hub` 主命令，用于展示最近目标、最近 runs，并直接提供 rerun、rerun failed jobs、cancel、打开网页等动作。
- 定义 `Dispatch Workflow` 独立命令，用于选择 repo / workflow / ref 并提交 workflow_dispatch。
- 明确首版只覆盖 repository、workflow、workflow run、job（轻量展示）、workflow dispatch inputs 这些核心对象。
- 明确首版非目标：secrets、variables、permissions、runners、billing、完整日志查看器、artifacts 管理台、org/enterprise 控制台。
- 规定首版技术边界：优先使用 GitHub REST API + PAT，不依赖 GraphQL 或 gh CLI 作为运行时前提。

## Capabilities

### New Capabilities
- `actions-hub`: 统一展示最近仓库、最近 runs，并提供针对 workflow run 的高频操作入口。
- `workflow-dispatch`: 支持在 Raycast 内选择 workflow、填写 inputs 并触发 workflow_dispatch。
- `github-actions-auth`: 定义基于 GitHub Personal Access Token 的认证与最小权限要求。

### Modified Capabilities

无。

## Impact

- 影响扩展命令结构：从单一 demo 命令扩展为以 `Actions Hub` 和 `Dispatch Workflow` 为核心的命令体系。
- 影响 GitHub API 接入方式：需要对 workflows、workflow runs、jobs、rerun、cancel、dispatch 等 REST 端点做统一封装。
- 影响用户配置：需要在 Raycast preferences 中增加 GitHub token 及相关说明。
- 为后续实现划定边界，避免首版直接扩展到管理员能力或重型管理场景。
