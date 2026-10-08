# 项目协作约定

## 项目目标

在 Raycast 窗口内实现 Blazwitcher 的单栏浏览器搜索，使用 `text-search-engine` 搜索 Chrome 标签页、书签和历史记录并准确跳转。

## 工作方式

- 说明、设计、注释和界面文案使用中文；代码标识符及 OpenSpec 必需关键字保留英文。
- 当前方案见 `docs/实施计划.md`，证据见 `docs/验证记录.md`。
- 不修改相邻参考仓库，不修改 Raycast 安装包或私有数据库。未经要求，不提交、推送或发布。
- 保持默认单栏，不启动独立浮窗。2026-09-30 用户确认允许主动展开原生右侧详情；详情只在本次命令中保留开关状态。历史实现保存在 `.local/rejected-desktop/`，不属于当前构建。
- 不以静态类型或构建通过代替实际界面验证；不能声称未完成的高亮已实现。

## 实现约定

- 使用 TypeScript、React、Raycast API、npm 和锁文件，仅保留“搜索浏览器”一个 `view` 命令。
- 复用 `text-search-engine` 核心匹配，保留原文范围，不另写拼音算法。
- `HighlightWithRanges` 是 React DOM 组件，不能直接传给 Raycast `List.Item`。内置 Clipboard History 的高亮实现和公开扩展 API 必须区分；当前调查见 `docs/Raycast列表高亮调查.md`。
- 不用括号、Unicode 伪字形、图片标题或右侧预览冒充真实行内高亮。
- 动作和快捷键共用 `src/actions.ts` 与 `src/shortcuts.ts`；设置使用原生 Form，不拦截 DOM 键盘事件。
- 当前页与新标签操作使用命令挂载时捕获的 Chrome 目标；目标失效不能回退到其他窗口。
- 标签按真实 ID 重新定位。标题、URL、查询均作为数据传递，禁止拼接为可执行代码。
- 浏览数据仅在本地处理，不持久化完整索引，不在日志输出标题和完整 URL。
- 单来源失败保留其他结果；权限归属 Raycast；复制和跳转使用原始记录并校验版本。

## 验证

使用 `npm run dev` 开发，`npm run check` 完成类型、测试、格式、构建检查，`npm run test:local` 检查本机数据与性能。分别记录逻辑测试、原生界面和真实 Chrome 跳转，不混用历史版本证据。

## 参考

- `../raycast-extensions/extensions/google-chrome`：读取、列表与 Chrome 控制。
- `../text-search-engine`：拼音匹配、范围约定及 DOM 高亮组件。
- `../blazwitcher/packages/blazwitcher-extension`：组合字段搜索、排序与来源筛选。
