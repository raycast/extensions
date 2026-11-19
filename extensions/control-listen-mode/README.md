# AirPods Listening Mode

Run **Toggle AirPods Listening Mode** to switch between Transparency and Noise Cancellation. Wear your AirPods, select them as your Mac’s audio output, and enable Automatic Ear Detection. You can assign a global hotkey in Raycast Settings → Extensions. Tested with AirPods Pro 2 on macOS 27.2.

用同一个 Raycast 热键在 AirPods 的**通透模式**与**降噪模式**之间切换。命令会读取耳机的当前模式，切换后通过 Raycast HUD 显示结果。

已在 **macOS 27.2 + AirPods Pro 2** 上验证双向切换。其他机型和系统版本可用下方的诊断命令检查。

## 安装与设置

从源码安装需要 Raycast、Node.js 22.14+ 和 Xcode 16.3 或更高版本。请在 Xcode 的 **Settings → Locations → Command Line Tools** 选择已安装的 Xcode。在仓库根目录运行：

```sh
npm ci
npm run dev
```

1. 戴上 AirPods，在 macOS 的「系统设置 → 声音 → 输出」中选中它，并确认已开启自动入耳检测。
2. 在系统菜单中将聆听模式设为「通透」或「降噪」。在 Raycast 搜索并运行 **Toggle AirPods Listening Mode**。
3. 在 Raycast 的 **Settings → Extensions** 找到该命令，通过 **Record Hotkey** 绑定全局快捷键。

## 常见问题

- **提示连接 AirPods**。蓝牙配对后，在「声音 → 输出」中选中耳机，将其设为 Mac 的默认音频输出。
- **无法确认佩戴**。确认自动入耳检测已开启，然后重新戴好耳机。检测到至少一侧入耳后才会尝试切换。
- **单耳无法开启降噪**。戴上双耳，或检查 macOS 的 AirPods 辅助功能设置是否允许佩戴一只 AirPod 时降噪。
- **当前为自适应或关闭模式**。先在系统菜单中选一次通透或降噪，再运行命令。
- **无法确认切换结果**。先在 macOS 菜单查看当前模式，再决定是否重试。再次触发会基于当时的实际模式切换。

运行 `npm run probe` 可以只读检查当前输出。`eligibleOutput` 表示输出设备是否通过识别，`leftEar` 和 `rightEar` 显示各侧佩戴状态，`supportsBothModes` 和 `modeWritable` 显示模式切换能力。

## 开发验证

```sh
npm test
npm run build
npm run typecheck
npm run lint
```

分发构建会通过 Raycast CLI 编译 Swift，并生成 TypeScript 接口。首次运行类型检查前先完成构建。
