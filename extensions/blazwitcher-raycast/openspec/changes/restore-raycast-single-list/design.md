## Context

独立 Electron 浮窗已被用户否决。公开 List 标题仅支持字符串；Clipboard History 使用宿主内部 HighlightRoot，扩展列表未接入。

## Goals / Non-Goals

目标是在 Raycast 内保留单栏浏览器搜索、来源过滤、分页、统一结果动作、快捷键设置和准确跳转，并明确高亮尚未完成。

不引入独立窗口、双栏详情、图片标题、括号标记、私有组件注入或 Raycast 本体修改。

## Decisions

- 仅保留“搜索浏览器” view 命令，渲染 SearchBrowser。
- BrowserService 在扩展 Node 进程内持有索引，数据仅驻留内存。
- 查询序号及数据版本用于取消过期搜索和拒绝旧记录操作。
- 50 条分页降低宿主传输和渲染成本，保留原始 URL 与真实标签 ID。
- 公开 SDK 不能达到的命中着色和自定义双行布局单独记录限制，不替换需求后宣称完成。

## Risks / Trade-offs

迁移 no-view 到 view 后必须验证宿主正确重新载入；本次已实际加载单栏并完成原生高亮实验。原生列表行内高亮仍缺少公开接口。
