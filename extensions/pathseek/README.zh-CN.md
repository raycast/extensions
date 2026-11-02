# PathSeek

[English](README.md) | **简体中文**

**PathSeek** 面向 macOS 应用的 Open/Save 文件选择对话框，提供类似 Listary 的辅助路径粘贴体验：使用自己在 Raycast 中设置的快捷键查找文件或目录，再将其绝对路径粘贴回原应用。搜索基于用户主动建立的本地持久化索引。

[Open/Save 操作与兼容性指南](docs/open-save-dialog.md)

## 功能

- **Open/Save 快速定位**：在文件选择窗口中通过全局快捷键启动 **Find in Open/Save**，搜索并使用 Raycast 的 `Action.Paste` 将选中文件或目录的完整路径粘贴回原窗口。部分应用需要先按 `⌘⇧G` 打开「前往文件夹」。PathSeek 不会代替用户点击打开或保存。
- **手动建立索引**：选择索引目录，通过 `fd` 显式建立或重建本地持久化索引。安装、启动 Raycast 和搜索时均不会自动扫描。
- **Raycast 内搜索**：使用 `fzf` 搜索已索引的文件名、目录和路径；支持打开、Finder 定位、快速预览和复制绝对路径。

## 安装与使用

需要 [Raycast](https://www.raycast.com/)、[fd](https://github.com/sharkdp/fd) 和 [fzf](https://github.com/junegunn/fzf)。命令行依赖需自行安装：

```bash
brew install fd fzf
```

1. 在 Raycast 中运行 **Build Index**，选择目录并主动建立索引。
2. 通过 Raycast 的命令配置，为 **Find in Open/Save** 设置一次全局快捷键（建议 `⌘⇧F`，如有冲突请自选）。插件无法自动注册此快捷键。
3. 在其他应用中打开 macOS Open/Save 对话框，按快捷键、搜索并按 **Return**，将绝对路径粘贴回原应用。如果该应用不支持直接粘贴，可以先在原窗口按 `⌘⇧G`，再调用 PathSeek。

普通文件搜索可使用 **Search Indexed Files**。安装、故障排查与兼容性细节分别见 [首次安装指南](docs/first-time-setup.md) 和 [Open/Save 使用指南](docs/open-save-dialog.md)。

## 来源与授权

PathSeek 参考了 [Listary](https://www.listary.com/) 的交互理念，并基于 Raycast [Fuzzy File Search](https://github.com/raycast/extensions/tree/main/extensions/fuzzy-file-search)（原作者 `erykksc`，贡献者 `gilitos92`，MIT 许可）进行扩展。感谢原项目及其贡献者。上游版权、MIT 许可文本和其他依赖信息见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

PathSeek 本身采用 [MIT License](LICENSE) 开源。
