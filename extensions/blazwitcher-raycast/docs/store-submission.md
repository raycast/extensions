# Raycast Store 提交指南

## 发布账号与语言

`package.json` 的 `author` 是 Raycast 用户名 `julian0197`，对应 [MSK 的 Raycast 账号](https://www.raycast.com/julian0197)。GitHub 仓库 owner 与 Raycast 发布账号可以不同；发布账号应参与维护，并拥有相应提交权限。`contributors` 仅填写已经确认的 Raycast 用户名，不猜测原作者的 Raycast 账号。

发布账号不会转移源代码或图标版权。保留 `LICENSE`、`THIRD_PARTY_NOTICES.md` 与 `licenses/` 中的原始声明。

命令、设置、动作和状态文案统一使用美式英语，满足 Raycast 当前语言规范；无需增加多语言框架。README 保留中英文，中文页面标题、拼音和中文搜索输入照常支持。

## 商店截图

截图直接作为仓库文件提交，无需在 manifest 中填写截图 URL。将真实 Raycast 界面的 PNG 放入 `metadata/`，每张 **2000 × 1250**，最多六张；建议至少三张，按文件名顺序展示：

1. `blazwitcher-raycast-1.png`：用 `/t sxw` 搜索相近中文标题，展示拼音首字母搜索。
2. `blazwitcher-raycast-2.png`：用 `/t skills` 展示相近英文项目；录屏中继续输入 `/t skills openai`，将 3 个结果缩小到 2 个，`openai/skills` 排在首位。
3. `blazwitcher-raycast-3.png`：按 `⌘D` 展开真实网页正文，展示官方 Raycast Browser Extension 提供的预览。

演示环境使用 `raycast-blaz` Chrome 配置中的 15 个公开页面、6 个分组，包括中文 AI 文档和英文 Agent / Skills 项目，并保留书签与历史案例。截图来自实际运行的英文界面，使用 Raycast 原生 **Capture Window**，勾选 **Save to Metadata**，统一使用湖景背景。三张原生 PNG 均已检查为 2000 × 1250，第一张 `/t sxw` 实测显示 4 个结果。

只保留清晰的 Raycast 窗口，不包含其他应用或私人数据，不伪造结果。GIF 和 MP4 保留在 README 的 `media/` 中，不能代替商店 PNG 截图。

## 检查与提交

使用 Node.js 22.22.2 或更新版本，在项目根目录执行：

```bash
npm ci
npm run check
```

`npm run check` 包括类型检查、测试、官方 `ray lint`、ESLint、Prettier 和构建。另在真实 Raycast 内确认搜索、来源筛选、打开标签、配置与正文预览；仅有构建通过不足以证明实际功能可用。

官方发布申请已创建：[raycast/extensions #32402](https://github.com/raycast/extensions/pull/32402)。项目自身的 [上架准备 PR #18](https://github.com/cjinhuo/blazwitcher-raycast/pull/18) 汇总英文界面、发布配置、截图和验证结果。审核与合并状态以官方 PR 为准；创建 PR 不代表已上架。

确认最终文件和验证记录后，提交所有发布文件，在同步到最终提交的干净 checkout 中执行以下命令。不要从含 `.local`、`.env` 或其他本地诊断文件的开发目录直接发布，因为官方 CLI 复制文件时不完整遵循 `.gitignore`。使用交互终端，不传 `--non-interactive` 或 `--verbose`：

```bash
npm run publish
```

该脚本使用官方 `npx @raycast/api@latest publish`，按提示完成 GitHub 授权，并在账号下创建或复用 `raycast-extensions` fork，将扩展提交到 [`raycast/extensions`](https://github.com/raycast/extensions) 的 `main` 分支。CLI 首次创建的是草稿 PR；核对变更范围，补充英文功能说明、真实截图和验证结果，再标记 **Ready for review**。

首次 Changelog 使用 `{PR_MERGE_DATE}` 占位符，由官方流程替换日期。后续更新若已有他人的官方仓库贡献，先运行 `npx @raycast/api@latest pull-contributions` 同步，再执行 `npm run publish` 更新审核 PR。

不要运行 `npm publish`；`prepublishOnly` 会拒绝把此扩展上传到 npm。通过审核并合并后才算发布到 Store；此前继续按 README 从源码安装，不提前添加未存在的 Store 安装链接。

官方依据：[发布流程](https://developers.raycast.com/basics/publish-an-extension)、[Store 准备要求](https://developers.raycast.com/basics/prepare-an-extension-for-store)、[Manifest](https://developers.raycast.com/information/manifest)。具体账号验证、截图与依赖检查以当次 `ray lint` 和官方审核结果为准。
