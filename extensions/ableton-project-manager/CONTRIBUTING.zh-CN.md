# 参与开发

[English](CONTRIBUTING.md) | 简体中文

## 环境准备

需要 macOS、[Raycast](https://raycast.com)、Node.js 22+ 和 npm。

```bash
git clone https://github.com/iyekChen/ableton-project-manager.git
cd ableton-project-manager
npm install
npm run dev        # 以 Raycast 开发模式运行扩展
```

首次启动时，Search Projects 会要求选择 Projects Folder。请使用测试文件夹，不要用你真正的项目库，因为重命名、Move to Trash 等操作会改动磁盘上的文件。

在开发模式下，Search Projects 多一个 **Reset Onboarding (Dev)** 操作，用来测试首次启动时的提示。

## 脚本

```bash
npm run lint          # ESLint + Prettier
npm run fix-lint      # 自动修复 lint 和格式问题
npm test              # 用 Vitest 运行单元测试
npm run test:watch    # 每次改动后重新运行测试
npm run build         # 构建正式版扩展
```

提交 PR 前，请运行 lint、测试和构建。CI 会在 macOS 和 Node 22 上用 `npm ci` 安装依赖，执行同样的步骤，另外还有下面的音频播放器检查。

## 项目结构

- `src/*.tsx` 是命令入口，每个命令一个文件。Manage Tags 对应 `manage-categories.tsx`。
- `src/core/` 包含所有不针对 Ableton Live 的部分：项目、bounce、合集、笔记、搜索和存储。
- `src/daws/ableton/` 包含 Ableton 专用的部分：读取 `.als` 文件、Sets 视图和 Live 模板。它们通过 `src/daws/types.ts` 中的 `DawAdapter` 接口接入其余部分。
- 大部分界面文字在 `src/i18n.ts` 中。Ableton 专用的文字在 `src/daws/labels.ts` 和 `src/daws/ableton/strings.ts` 中，命令和设置项的标题在 `package.json` 中。
- `swift/` 是音频播放器的源码，`scripts/` 是构建它的脚本。
- `test/` 是 Vitest 单元测试。

## 音频播放器

音频播放器的二进制文件（`assets/audio-player`）已经提交到仓库，运行扩展不需要自己构建。如果你修改了 [`swift/AudioPlayer.swift`](https://github.com/iyekChen/ableton-project-manager/blob/main/swift/AudioPlayer.swift)，请重新构建，并同时提交二进制文件和 `swift/AudioPlayer.swift.sha256`：

```bash
npm run build:player   # 需要 Xcode Command Line Tools（swiftc、lipo）
```

[`scripts/build-audio-player.sh`](https://github.com/iyekChen/ableton-project-manager/blob/main/scripts/build-audio-player.sh) 会编译面向 macOS 11 的 arm64 + x86_64 通用二进制文件，并记录 CI 要检查的源码哈希。如果 `swift/AudioPlayer.swift.sha256` 和 Swift 源码不一致，CI 会失败；之后 CI 会检查播放器能否正常编译。CI 不检查已提交的二进制文件，所以请确认 `assets/audio-player` 包含在你的提交中。

## 工作原理

- **Live Set：** `.als` 文件是 gzip 压缩的 XML。每个 Set 经 gunzip 流式解压后，用 [`saxes`](https://github.com/lddubeau/saxes) 解析，读取速度、拍号和音阶。
- **播放：** 一个基于 AVFoundation 的小型 Swift 二进制文件以独立进程播放 bounce，所以切换视图或关闭 Raycast 窗口后，播放不会中断。扩展通过其支持文件夹中的命令文件和状态文件控制它。Raycast 退出时，播放器会自行停止。
- **分析：** 同一个二进制文件有一个 `analyze` 模式，分块流式读取文件，用 2048 点 FFT 计算 RMS、峰值、频谱质心和频谱通量，不会把整个文件读进内存。
