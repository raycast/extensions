# Raycast Store 提交指南

## 发布账号与语言

`package.json` 的 `author` 是 Raycast 用户名 `julian0197`，对应 [MSK 的 Raycast 账号](https://www.raycast.com/julian0197)。GitHub 仓库 owner 与 Raycast 发布账号可以不同；发布账号应参与维护，并拥有相应提交权限。`contributors` 仅填写已经确认的 Raycast 用户名，不猜测原作者的 Raycast 账号。

发布账号不会转移源代码或图标版权。保留 `LICENSE`、`THIRD_PARTY_NOTICES.md` 与 `licenses/` 中的原始声明。

命令、设置、动作和状态文案统一使用美式英语，满足 Raycast 当前语言规范；无需增加多语言框架。README 保留中英文，中文页面标题、拼音和中文搜索输入照常支持。

## 商店截图

截图直接作为仓库文件提交，无需在 manifest 中填写截图 URL。将真实 Raycast 界面的 PNG 放入 `metadata/`，每张 **2000 × 1250**，最多六张；建议至少三张，按文件名顺序展示：

1. `blazwitcher-raycast-1.png`：`/t sxw` 的 3 个相近中文标题。
2. `blazwitcher-raycast-2.png`：`/t skills github.com` 的英文项目结果。
3. `blazwitcher-raycast-3.png`：`⌘D` 预览的命中高亮、Tab 来源标签和真实正文。

本轮基于 master `232b014`，统一使用 `raycast-blaz` Chrome Profile 的公开页面。真实 Raycast 窗口截图居中放在一致的灰蓝背景上，输出 2000 × 1250 PNG；不含其他应用或私人数据，不修改界面内容。具体录制方法、案例和检查范围见 [素材清单](media-guide.md)。GIF 和 MP4 位于 README 的 `media/` 中，不能替代商店 PNG。

## 检查与提交

使用 Node.js 22.22.2 或更新版本，在项目根目录执行：

```bash
npm ci
npm run check
```

`npm run check` 包括类型检查、测试、官方 `ray lint`、ESLint、Prettier 和构建。另在真实 Raycast 内确认搜索、来源筛选、打开标签、配置与正文预览；仅有构建通过不足以证明实际功能可用。

此前的 [官方 PR #32402](https://github.com/raycast/extensions/pull/32402) 和 [#32426](https://github.com/raycast/extensions/pull/32426) 已关闭且未合并。源码、开发、验证及发布统一以 [`cjinhuo/blazwitcher-raycast/master`](https://github.com/cjinhuo/blazwitcher-raycast/tree/master) 为准。

发布前先将功能、修复和素材 PR 合入该仓库的 `master`，再从远端 `master` 创建干净 checkout，记录提交 SHA，运行检查。官方仓库的 fork 仅用于递交这些已合并的文件；不得从尚未合入源仓库的功能分支发布，也不得在官方提交分支单独开发一套版本。核对官方 PR 中 `extensions/blazwitcher-raycast/` 的文件与所记录的 master 提交一致。

不要从含 `.local`、`.env` 或其他本地诊断文件的开发目录直接发布，因为官方 CLI 复制文件时不完整遵循 `.gitignore`。在上述干净 checkout 中使用交互终端，不传 `--non-interactive` 或 `--verbose`：

```bash
npm run publish
```

该脚本使用官方 `npx @raycast/api@latest publish`，按提示完成 GitHub 授权，并在账号下创建或复用 `raycast-extensions` fork，将扩展提交到 [`raycast/extensions`](https://github.com/raycast/extensions) 的 `main` 分支。CLI 首次创建的是草稿 PR；核对变更范围，补充英文功能说明、真实截图和验证结果，再标记 **Ready for review**。

首次 Changelog 使用 `{PR_MERGE_DATE}` 占位符，由官方流程替换日期。后续更新若已有他人的官方仓库贡献，先运行 `npx @raycast/api@latest pull-contributions` 同步，再执行 `npm run publish` 更新审核 PR。

不要运行 `npm publish`；`prepublishOnly` 会拒绝把此扩展上传到 npm。通过审核并合并后才算发布到 Store；此前继续按 README 从源码安装，不提前添加未存在的 Store 安装链接。

官方依据：[发布流程](https://developers.raycast.com/basics/publish-an-extension)、[Store 准备要求](https://developers.raycast.com/basics/prepare-an-extension-for-store)、[Manifest](https://developers.raycast.com/information/manifest)。具体账号验证、截图与依赖检查以当次 `ray lint` 和官方审核结果为准。
