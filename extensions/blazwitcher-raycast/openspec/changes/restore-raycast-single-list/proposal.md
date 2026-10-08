## Why

用户取消独立浮窗，要求搜索留在 Raycast 窗口内，保留自己的单栏布局，并调查 Clipboard History 的行内高亮能力。

## What Changes

- 搜索入口恢复为原生 view 命令（当前仅保留“搜索浏览器”），移除独立应用启动和安装依赖。
- 单栏展示标题、URL、来源、结果数、筛选和原生动作；关闭详情。
- 复用匹配及读取逻辑，保留分页、取消、版本校验和错误隔离。
- 如实记录高亮 API 限制，当前不声称行内彩色高亮完成。

## Capabilities

### New Capabilities

- `raycast-single-list`：Raycast 内的单栏搜索与原始记录操作。

## Impact

修改搜索命令、列表组件、数据服务、文档及验证。Electron 相关实现归档到忽略目录，不再参与构建。
