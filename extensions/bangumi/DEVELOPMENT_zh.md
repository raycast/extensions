# 开发指南

> [!IMPORTANT]
>
> **请勿直接向 `raycast/extensions` 仓库提交 Pull Requests！**
>
> 本插件在此独立仓库中进行主动维护。任何直接提交到官方 Raycast 仓库的 PR 都可能会被我们的自动化 CI/CD 同步脚本覆盖或引发冲突。请将所有的 PR 提交到本仓库（`maxchang3/raycast-bangumi`）。

## 环境要求

在开始之前，请确保你已经安装了：
- [Node.js](https://nodejs.org/) (推荐 v24 或更高版本)
- [npm](https://www.npmjs.com/) (通常随 Node.js 一起安装)
- [Raycast](https://raycast.com/)

## 开发环境配置

1. **克隆仓库：**
   ```bash
   git clone https://github.com/maxchang3/raycast-bangumi.git
   cd bangumi
   ```

2. **安装依赖：**
   ```bash
   npm install
   ```

3. **启动开发模式：**
   ```bash
   npm run dev
   ```
   这将启动本地开发服务器。打开 Raycast，你将看到可供测试的本地版本 Bangumi 插件。对源代码的更改将会自动热重载。

## 类型生成 (Type Generation)

本仓库使用 [openapi-fetch](https://openapi-ts.dev/openapi-fetch/) 结合 `openapi-typescript` 来提供完全类型安全的 API 客户端。

我们没有手动维护 API 请求和响应的 TypeScript 接口，而是直接从官方的 Bangumi OpenAPI 规范中生成它们。

如果 Bangumi API 引入了新的接口或字段，你可以通过运行以下命令拉取最新的 schema 并更新类型：

```bash
npm run generate-types
```

此命令将从 `https://bangumi.github.io/api/dist.json` 下载最新的规范并更新 `src/types/generated.ts`。`openapi-fetch` 会自动应用这些更改，以确保所有的 API 调用保持类型安全。

## CI/CD 与发布工作流

由于此插件在独立的仓库中维护，但最终需要发布到官方的 Raycast 商店，我们使用了一套定制的 GitHub Actions 来处理仓库间的同步。

### 1. 发布到 Raycast (`publish-raycast.yml`)

当创建一个新的 GitHub Release 时（通常是通过合并 `release-please` 的自动 PR），此工作流会自动将其提交到 Raycast 商店：
- **智能 CHANGELOG 处理：** 它会自动将最新 `CHANGELOG.md` 条目中的本地生成日期替换为 `{PR_MERGE_DATE}`（Raycast 要求使用的占位符），而不会破坏历史记录的日期。
- **路径过滤：** 它会安全地忽略仅限本地的配置文件（如 `.vscode`、`.github`、`release-please` 配置和 `skills-lock.json`）。
- **自动创建 PR：** 它将清理后的代码推送到维护者的 fork (`maxchang3/extensions`)，并在官方的 `raycast/extensions` 仓库中自动创建一个 Pull Request。

### 2. 拉取上游更改 (`pull-raycast-changes.yml`)

有时候，Raycast 团队或社区贡献者可能会直接在中央的 `raycast/extensions` 仓库中对此插件进行更改（例如：核心 API 的大版本迁移、安全补丁）。这个定时工作流可确保我们始终保持代码同步：
- **定时同步：** 每天自动运行以检查上游是否有修改。
- **安全合并：** 它会自动过滤掉上游的 `CHANGELOG.md` 和 `.github/` 目录，以防止与我们本地的 `release-please` 追踪发生冲突。
- **自动创建 PR：** 如果检测到上游更改，它会在本仓库中自动开启一个 Pull Request，以便对其进行安全的审查和合并。
