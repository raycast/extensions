# Path Tools for Raycast

将常用的 Finder、iTerm 和 Visual Studio Code 路径操作集中为三个 Raycast 命令：

- `Finder -> iTerm`：在 iTerm 新标签页中进入 Finder 当前目录。
- `iTerm -> Finder`：让 iTerm 当前 Shell 在 Finder 中打开其工作目录。
- `用 VS Code 打开路径`：优先打开输入路径；留空时打开 Finder 选中项或当前目录。

## 本地运行

```bash
npm install
npm run dev
```

首次调用时，请在 macOS 的“系统设置 -> 隐私与安全性 -> 自动化”中允许 Raycast 控制 Finder、iTerm 与 Visual Studio Code。iTerm 到 Finder 的命令通过向 iTerm 当前 Shell 输入 `open -a Finder ./` 工作，因此需要 iTerm 中已有活动窗口和 Shell。
