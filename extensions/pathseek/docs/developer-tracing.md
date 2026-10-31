# PathSeek 开发者诊断

`View Diagnostics` 会展示 Raycast/macOS 环境和索引状态。可在 PathSeek 偏好设置中启用 **Developer: Trace fd/fzf Calls** 查看本地子进程调用记录，默认关闭。

## 使用

1. 需要时开启 Developer Tracing。
2. 手动使用 **Build Index**，或通过 **Search Files and Folders** 输入查询。
3. 在 **View Diagnostics** 中选择 **Refresh Diagnostics** 或 **Copy Sanitized Debug Info**。

- `fd` 仅在用户主动建立/重建索引时启动（`manual-rebuild`），不会因为打开搜索窗口或输入查询词而启动。
- `fzf` 处理已有索引中的查询（`fuzzy-query`）；超过 150 条结果时记录 `limit-reached`，有时 `exit=null` 表示主动截断，并非失败。
- 诊断记录包括开始/结束状态、耗时、结果数量和脱敏命令结构，不记录搜索词、完整文件路径或 stderr 原文。
- 开启追踪后，本地日志在约 256 KiB 时轮换；显示时只保留近期事件。关闭后普通搜索不写追踪日志。

提交公开 Issue 前仍建议预览复制的诊断报告。请勿上传真实索引文件。

详见 [Issue #5](https://github.com/juezhong/raycast-pathseek/issues/5)。
