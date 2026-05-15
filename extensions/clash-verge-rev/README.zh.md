# Clash Verge Rev Raycast 扩展

[English](README.md)

这是一个用于在 Raycast 中管理 Clash Verge Rev 和 Mihomo 的扩展。你可以不打开 Clash Verge Rev 桌面端，直接在 Raycast 中切换订阅、管理代理组和节点、切换代理模式、查看实时连接和实时日志。
![](https://fastly.jsdelivr.net/gh/czh020110/image@main/images/2026-05-15-10:19:24_clash-raycast-home.png)
## 功能特性
![](https://fastly.jsdelivr.net/gh/czh020110/image@main/images/2026-05-15-10:20:54_clash-raycast-proxy.png)
- 在 Raycast 中管理订阅配置。
- 通过选择订阅或命令参数快捷指令快速切换订阅。
- 编辑订阅名称、描述、订阅链接、更新间隔和 Raycast 专用快捷指令。
- 管理代理组并切换节点。
- 支持按代理组或节点搜索，并可用前缀快速切换搜索类型。
- 支持单个节点测速，也支持对整个代理组批量测速。
![](https://fastly.jsdelivr.net/gh/czh020110/image@main/images/2026-05-15-10:22:34_clash-raycast-mode.png)
- 在 Rule、Global、Direct 三种 Mihomo 模式之间切换。
![](https://fastly.jsdelivr.net/gh/czh020110/image@main/images/2026-05-15-10:24:00_clash-raycast-subscription.png)
- 查看实时连接流量、速度、规则、链路、进程、源地址和目标地址等信息。
- 按速度、流量、开始时间或主机名排序活动连接。
- 关闭单个连接或全部活动连接。
![](https://fastly.jsdelivr.net/gh/czh020110/image@main/images/2026-05-15-10:25:09_clash-raycast-logs.png)
- 查看 Clash/Mihomo 实时日志，并复制可见日志。

## 使用前提

- 已安装 Raycast。
- 已安装并正在运行 Clash Verge Rev。
- Clash Verge Rev 中已启用 Mihomo external controller。
- external controller 端口需要和扩展偏好设置一致，默认是 `9090`。
- 如果 Mihomo controller 配置了 secret，需要在扩展偏好设置中填写相同的 API Secret。

## 安装与开发

安装依赖：

```bash
npm install
```

在 Raycast 中启动本地开发：

```bash
npm run dev
```

构建扩展：

```bash
npm run build
```

检查代码：

```bash
npm run lint
```

自动修复可修复的 lint 问题：

```bash
npm run fix-lint
```

## 扩展偏好设置

在 Raycast 中打开该扩展的偏好设置，并配置以下选项：

| 配置项 | 说明 | 默认值 |
| --- | --- | --- |
| Controller Port | Mihomo external controller 端口。 | `9090` |
| API Secret | Mihomo external controller secret。如果没有配置 secret，则留空。 | 空 |
| Default Search Mode | Manage Proxies 命令中的默认搜索目标。 | Groups |
| Default Sort Order | View Connections 命令中的默认排序方式。 | Download Speed |

## 命令说明

### Manage Proxies

查看所有代理组和代理节点，切换某个代理组当前使用的节点，并测试节点延迟。

使用技巧：

- 直接输入关键词时，会按照扩展偏好设置中的默认搜索模式进行搜索。
- 在搜索内容前加 `:` 可以搜索另一种类型。例如默认搜索 Groups 时，输入 `:hk` 会改为搜索节点。
- 使用代理组下拉框可以只查看某个代理组。
- 使用 `Ctrl + ←` 和 `Ctrl + →` 在代理组之间切换。
- 使用 `Ctrl + Return` 测试当前选中节点的延迟。
- 使用 `Ctrl + Shift + Return` 测试当前代理组中的所有节点。
- 可以通过命令参数 `query` 打开命令时自动带入初始搜索内容。

### Manage Subscriptions

查看 Clash Verge Rev 订阅配置，切换当前订阅，编辑订阅信息，并复制订阅链接。

切换订阅时，扩展会先更新 Clash Verge Rev 的 `profiles.yaml`，再把所选订阅内容合并到当前 `clash-verge.yaml` 中，最后请求 Mihomo 重载合并后的配置。常见情况下这可以避免完整重启 Clash Verge Rev。

使用技巧：

- 选择订阅后执行 **Activate Profile** 可以切换到该订阅。
- 执行 **Edit Profile** 可以编辑名称、描述、快捷指令、订阅链接或更新间隔。
- 远程订阅可以执行 **Copy Subscription URL** 复制订阅链接。
- 使用 `Cmd + R` 刷新订阅列表。
- 可以通过命令参数 `shortcut` 使用已保存的快捷指令快速切换订阅。

订阅快捷指令由本扩展单独保存在 Clash Verge Rev 配置目录下的 `raycast-shortcuts.json` 中，不会写入 `profiles.yaml`。

### Switch Mode

切换 Mihomo 代理模式：

- Rule Mode：根据规则分流。
- Global Mode：所有流量走代理。
- Direct Mode：所有流量直连。

该命令也会展示当前配置中的 mixed port、局域网访问和日志等级等信息。

### View Connections

通过 controller WebSocket 实时查看 Mihomo 活动连接。

展示内容包括：

- 当前全局上传和下载速度。
- 总上传和总下载流量。
- 连接主机、进程路径、网络类型、源地址、目标地址、规则、规则负载、代理链路、开始时间和单连接速度。

使用技巧：

- 使用下拉框按下载速度、上传速度、总下载、总上传、开始时间或主机名排序。
- 使用 `Ctrl + ←` 和 `Ctrl + →` 循环切换排序方式。
- 使用 **Detail View** / **List View** 切换展示样式。
- 使用 `Ctrl + X` 关闭选中的连接。
- 使用 `Ctrl + Shift + X` 关闭全部活动连接。
- 可以复制主机名或代理链路。

### View Logs

实时查看 Clash/Mihomo 日志。

使用技巧：

- 命令最多保留最近 100 条日志。
- 使用搜索框过滤当前可见日志。
- 使用 **Detail View** 可以展示从常见连接日志中解析出的字段。
- 可以复制单条日志或复制当前所有可见日志。
- 使用 `Ctrl + X` 清空当前日志列表。
- 使用 `Ctrl + R` 重新连接日志流。

## 工作原理

该扩展通过两种方式和 Clash Verge Rev / Mihomo 集成：

1. Mihomo external controller API
   - 使用 REST API 获取代理、配置、测速以及关闭连接。
   - 使用 WebSocket 获取实时连接列表。
   - 使用流式 HTTP 获取实时日志。

2. Clash Verge Rev 本地配置文件
   - 读取 `profiles.yaml` 展示和激活订阅。
   - 快速切换订阅时会改写 `clash-verge.yaml`。
   - Clash Verge Rev `profiles` 目录中的 profile 文件作为订阅内容来源。
   - `raycast-shortcuts.json` 用于保存 Raycast 专用订阅快捷指令。

在 Windows 上，Clash Verge Rev 配置目录通常位于：

```text
%APPDATA%\io.github.clash-verge-rev.clash-verge-rev
```

## 常见问题

### 获取代理或配置失败

请检查 Clash Verge Rev 是否正在运行、Mihomo external controller 是否已启用，以及 Raycast 扩展偏好设置中的 controller 端口是否和 Clash Verge Rev 一致。

### 出现 Unauthorized 或 API 错误

如果 Clash Verge Rev 配置了 external controller secret，请在扩展的 **API Secret** 偏好设置中填写相同的值。
![](https://fastly.jsdelivr.net/gh/czh020110/image@main/images/2026-05-15-10:17:23_clash外部设置.png)
### 找不到 profiles 配置

请确认 Clash Verge Rev 至少启动过一次，并且已经生成配置文件。扩展会从 Clash Verge Rev 的应用数据目录读取订阅配置。

### 连接列表或日志流没有更新

请先检查 controller 端口和 secret 是否正确，然后使用命令中的重新连接或刷新操作。
