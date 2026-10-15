# Raycast 列表行内高亮调查

检查日期：2026-09-16。本机 Raycast `2.4.1.0`，公开 SDK `@raycast/api@2.4.1`，匹配库 `text-search-engine@1.5.3`。

## 内置 Clipboard History

只读检查本机已安装应用的前端资源：

`/Applications/Raycast.app/Contents/Resources/macos-app_RaycastDesktopApp.bundle/Contents/Resources/frontend/`

- `main-window-BtJOQAxd.js`：`ClipboardListItem`（压缩后函数 `WN`）在标题周围使用 `gh`。
- `gh` 来自 `theme-icon-C-79Md5Q.js` 的 `r` 导出，对应内部 `HighlightRoot`；同文件还有 `HighlightProvider`。
- `HighlightRoot` 根据查询分词，在文本节点上创建 DOM Range，通过 CSS Custom Highlight API 注册 `raycast-highlight`。这解释了用户截图中的蓝色文字背景。
- 该逻辑是字面文本匹配，不会自动把 `zhoubao` 映射成“周报”。拼音仍需要我们的命中区间。

未复制、修改或注入 Raycast 本体代码。

## 第三方扩展路径

同一个 `main-window-BtJOQAxd.js` 中的 `NodeListComponent`（函数 `Xq`）直接将 `e.title`、`e.subtitle` 作为字符串子节点渲染，没有给标题套 `HighlightRoot`。

`filteringEnabled` 只控制结果过滤和排序（`Pq`），没有接入高亮。公开 SDK 的 `List.Item.title` 类型是字符串或 `{ value: string; tooltip?: string }`，没有命中范围、React 节点或富文本参数。

官方文档：[List](https://developers.raycast.com/api-reference/user-interface/list)。不要将“内置命令能够做到”解释为“第三方 API 已开放”。

## HighlightWithRanges

参考源码：`../text-search-engine/packages/text-search-engine/src/react/highlight.tsx`。

组件输出 HTML `div` 并使用 `document` 注入样式，因此能在浏览器/Electron 的 React DOM 中使用，不能作为原生 List 标题或子组件使用。它还会原地排序传入范围，在 DOM 环境复用时应先复制；当前版本不引入该组件。

## 当前结论和实验状态

当前公开接口和本机扩展渲染代码没有提供与 Clipboard History 相同的行内高亮入口。我们保留单栏和拼音搜索，不引入独立浮窗、详情预览、括号标记或私有接口。

已在真实 Raycast 完成 `filtering=true` 的最小列表实验：

- 初始查询“周报”：匹配标题“2026 H1 周报 - 飞书云文档”和“我的周报和日报”，标题及 subtitle 中的“周报”均没有彩色背景。
- 查询 `zhoubao`：通过 keywords 保留两条结果，原文“周报”仍没有高亮。

实验样例保存在 `.local/highlight-probe.tsx`，正式入口已恢复为实际浏览器搜索。期间曾出现旧启动入口的 Hooks 错误，更新 SDK、四个 view 清单并重新构建后实际列表已成功加载；不再是当前阻塞。
