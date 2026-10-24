# PathSeek

[English](README.md) | **简体中文**

**PathSeek** 是一款适用于 macOS 的 Raycast 文件与文件夹搜索插件。它借鉴了 [Listary](https://www.listary.com/) 的快速文件定位体验，并在 MIT 许可的 Raycast 扩展 [Fuzzy File Search](https://github.com/raycast/extensions/tree/main/extensions/fuzzy-file-search) 基础上进一步开发：除了快速搜索，还可以在其他应用现有的 **Open / Save 文件选择窗口中快速选中文件或跳转目录**。

## 功能

- **快速搜索**：使用 `fd` 手动创建本地持久化索引，通过 `fzf` 搜索文件名、文件夹与路径。
- **文件操作**：打开文件、用 Finder 显示位置、快速预览和复制路径。
- **快速选择文件**：在应用的 Open / Save 窗口中启动 PathSeek，搜索并将文件或文件夹的完整路径送回原窗口。不会自动确认打开或保存。
- **索引完全可控**：首次自行选择文件夹并构建索引；安装、搜索和启动时都**不会自动扫描或重建**。

## 安装与使用

首次安装和依赖排查可参考 [安装指南（英文）](docs/first-time-setup.md)。

需要 [Raycast](https://www.raycast.com/)、[fd](https://github.com/sharkdp/fd) 和 [fzf](https://github.com/junegunn/fzf)：

```bash
brew install fd fzf
git clone https://github.com/juezhong/raycast-pathseek.git
cd raycast-pathseek
npm ci
npm run dev
```

在 Raycast 中运行 **Build Index**，选择需要搜索的文件夹并手动建立索引。之后使用 **Search Files and Folders** 搜索，文件和目录操作都可以通过 `⌘K` 查看。

如需在其他应用的文件选择窗口中快速选择文件或跳转目录，先在 Raycast 为 **Find in Open/Save** 设置一次全局快捷键（推荐 `⌘⇧F`，如有冲突请自选）。打开目标应用的文件选择窗口后，按快捷键 → 搜索 → **Return**。在已测试的 macOS 文件选择窗口中，无需先按 `⌘⇧G`；如遇不兼容的应用，可先按 `⌘⇧G` 再搜索。更多说明见 [Open/Save 使用指南](docs/open-save-dialog.md)。

## 来源与授权

PathSeek 参考了 [Listary](https://www.listary.com/) 的交互理念，并基于 Raycast [Fuzzy File Search](https://github.com/raycast/extensions/tree/main/extensions/fuzzy-file-search)（原作者 `erykksc`，贡献者 `gilitos92`，MIT 许可）进行扩展。感谢原项目及其贡献者。上游版权、MIT 许可文本及其他依赖信息见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

PathSeek 本身采用 [MIT License](LICENSE) 开源。当前提供本地开发安装，**尚未在 Raycast Store 正式发布**。
