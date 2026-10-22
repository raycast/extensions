[English](README.md) | 简体中文

# Screen Clean（屏幕清洁）

一个 Raycast 扩展：把所有显示器变成纯黑，并可选锁定键盘，方便你清洁屏幕和键盘而不会误触快捷键。
支持 **macOS** 和 **Windows**。不收集、不上传任何数据。

## 功能

- 所有已连接显示器全屏纯黑、无边框遮罩
- 可选的全局键盘锁定（严格模式）
- 连续按 5 次 `Esc` 退出，屏幕中央实时显示已按次数
- 可配置自动退出时间：30 秒到 5 分钟
- 选择“直到手动停止”时，仍有 30 分钟强制兜底
- 清洁期间阻止显示器休眠
- 不锁定鼠标，计时结束会自动恢复
- 无网络访问、无遥测

## 命令

| 命令                                    | 说明                                                    |
| --------------------------------------- | ------------------------------------------------------- |
| **Start Cleaning Mode**（开始清洁模式） | 所有显示器变黑，按 5 次 `Esc` 退出。                    |
| **Stop Cleaning Mode**（停止清洁模式）  | 立即结束清洁模式。                                      |
| **Grant Keyboard Lock Permission**      | 仅 macOS：为 helper 请求辅助功能（Accessibility）权限。 |

## 偏好设置

| 偏好                     | 默认值 | 说明                                                                   |
| ------------------------ | ------ | ---------------------------------------------------------------------- |
| **Cleaning Duration**    | 5 分钟 | 可选 30 秒、1 分钟、2 分钟、5 分钟，或“直到手动停止”（最多 30 分钟）。 |
| **Strict Keyboard Lock** | 关闭   | 全局拦截键盘事件。macOS 需要辅助功能权限；Windows 使用低级键盘钩子。   |
| **Exit Hint**            | 开启   | 开始清洁及点击遮罩时显示淡淡的退出提示；`Esc` 计数始终显示。           |

即使选择“直到手动停止”，会话也会在最多 30 分钟后自动结束。

## 使用方式

1. 打开 Raycast，运行 **Start Cleaning Mode**。
2. 所有显示器变黑，每块屏幕中央显示退出提示和 `Esc` 计数。
3. 连续按 5 次 `Esc` 退出，计数会显示 `2/5`、`3/5` 等。
4. 两次按键间隔超过 2 秒，计数会自动重置。

需要立即结束时，运行 **Stop Cleaning Mode**。

## 实现原理

Raycast 命令本身无法创建全屏窗口，因此扩展会按平台启动一个轻量的原生 helper，然后退出；
helper 独立运行，直到用户退出或计时结束。

### macOS

Helper 为 `assets/ScreenCleaner`，由 `native/main.swift` 编译出的 universal 二进制
（arm64 + x86_64）。

```text
Raycast no-view 命令
  └─ spawn detached → ScreenCleaner
       ├─ 每块显示器一个无边框黑色 NSWindow，level = CGShieldingWindowLevel()
       ├─ 可选的 CGEventTap，全局吞掉键盘事件
       ├─ 5 次 Esc（屏幕显示计数）/ 自动退出计时 / SIGTERM → 淡出并退出
       └─ 清洁期间阻止显示器休眠
```

- 每次运行前，helper 会被复制到扩展的 support 目录，以保持路径和代码签名稳定（这关系到
  辅助功能权限）。
- 未授予辅助功能权限时，严格键盘锁定会降级为被动模式：遮罩仍会在获得焦点时接收并拦截按键，
  同时在屏幕上提示降级原因。

### Windows

Helper 为 `assets/ScreenCleaner.ps1`，通过 Windows PowerShell 5.1 执行，并用 `Add-Type`
在内存中编译一小段 C#：

- 每块显示器一个无边框、置顶的黑色 WinForms 窗口（`Screen.AllScreens`）
- 可选的 `WH_KEYBOARD_LL` 低级键盘钩子，全局拦截所有按键
- 同样支持连续 5 次 `Esc` 退出、屏幕计数和自动退出计时
- 通过 `SetThreadExecutionState` 阻止显示器休眠
- **Stop Cleaning Mode** 使用 `taskkill` 结束 PowerShell 进程

首次启动会多花 1~2 秒，因为内嵌的 C# 代码需要即时编译。如果编译或启动失败，错误会写入
`<扩展 support 目录>/screen-cleaner.log`。

## 安装

### 环境要求

- **Raycast**（macOS 或 Windows）
- macOS helper：**macOS 12 或更高版本**
- Windows helper：**Windows 10/11**，使用系统自带的 Windows PowerShell 5.1
- 开发环境：**Node.js 20+**；在 macOS 上编译 helper 还需要 **Xcode Command Line Tools**

### 从源码安装

```bash
git clone git@github.com:YangGong-Zi/screen-clean.git
cd screen-clean
npm install
npm run dev
```

`npm run dev` 会刷新原生 helper，然后启动 Raycast 开发模式。

### 生产构建

```bash
npm run build
```

## 严格键盘锁定设置

### macOS

1. 在 Raycast 中运行 **Grant Keyboard Lock Permission**。
2. 打开 _系统设置 → 隐私与安全性 → 辅助功能_，勾选 **ScreenCleaner**。helper 路径已复制到
   剪贴板；如果列表中没有该项，点击 `+` 后粘贴路径。
3. 在扩展偏好设置中开启 **Strict Keyboard Lock**。

TCC 权限与 helper 的路径和代码签名绑定。如果重新编译导致内容变化，可能需要重新授权。

### Windows

无需额外授权。在扩展偏好设置中开启 **Strict Keyboard Lock** 即可，helper 会安装低级键盘钩子。

如果钩子安装失败，helper 会降级为被动模式并在屏幕上提示。

## 安全性与限制

- 这是**清洁遮罩，不是安全锁屏**。电源键、Touch ID / Windows Hello、`Ctrl+Alt+Del`、
  UAC 安全桌面等系统级机制仍然有效。
- 自动退出计时始终生效；选择“直到手动停止”时，最多 30 分钟后也会退出。
- 如果遮罩卡住，等待计时结束即可恢复。macOS 上最后的办法是强制重启：严格模式会全局拦截键盘，
  此时无法输入 `pkill`。Windows 上仍可用 `Ctrl+Alt+Del` 打开安全屏幕。
- 鼠标光标保持可见。
- Windows 上部分杀毒软件可能会对安装全局键盘钩子的程序报警。该钩子只在严格模式需要；
  被动模式不受影响。
- 企业策略可能禁用 `Add-Type` 或全局钩子；如果 Windows helper 无法启动，请查看日志文件。

## 开发

```bash
npm run dev          # 刷新 helper，然后启动 Raycast 开发模式
npm run build:helper # 复制 Windows helper；在 macOS 上同时编译 assets/ScreenCleaner
npm run build        # helper + Raycast 生产构建
npm run lint
```

手动测试 helper（屏幕会黑约 2 秒）：

```bash
# macOS
./assets/ScreenCleaner --seconds 2 --no-hint

# Windows PowerShell
powershell.exe -NoProfile -ExecutionPolicy Bypass -STA -File .\assets\ScreenCleaner.ps1 -Seconds 2
```

Raycast 会持久化用户在偏好设置中选择的值。修改 `package.json` 中的 `default` 只对尚未设置过该
偏好的用户生效。

## 项目结构

```text
src/
  start-cleaning.ts           # Raycast 命令
  stop-cleaning.ts
  grant-accessibility.ts
  lib/screen-cleaner.ts       # 跨平台的 helper 复制/启动/PID 管理
native/
  main.swift                  # macOS：遮罩、事件监听、计时器
  build.sh                    # macOS universal 构建 + ad-hoc 签名
  windows/ScreenCleaner.ps1   # Windows：WinForms 遮罩 + 键盘钩子
scripts/
  build-helper.cjs            # 跨平台 helper 构建/复制脚本
assets/
  ScreenCleaner               # 生成的 macOS 二进制
  ScreenCleaner.ps1           # 由源文件复制生成的 Windows helper
```

## 发布到 Raycast Store

请保留仓库中的 `native/` 和 `scripts/build-helper.cjs`，方便审核者核对 helper 源码。macOS
helper 是预编译的 universal 二进制；发布前请确认 Raycast Store 当前对打包二进制和仓库可见性的
要求。helper 源码变更后，运行 `npm run build:helper` 重新生成。

## 仓库

<https://github.com/YangGong-Zi/screen-clean>
