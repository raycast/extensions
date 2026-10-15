# README 与 Raycast Store 素材录制清单

## 本轮实录（2026-10-15–16）

使用 `codex/store-ready` 的英文界面开发版本，录制代码为 `72401b373aed8bdb02bf12bb97fca33da1238aa5`，包含搜索防抖修复。Chrome 使用 `raycast-blaz` 演示配置：15 个公开 AI 项目和中文文档页面、6 个分组，并保留书签与历史案例。

六组演示的 6 个 GIF、6 个 MP4 已完成导出、完整解码与接触表检查。3 张商店 PNG 已检查为 2000 × 1250。实际查询、剪辑区间、文件尺寸和校验值见 [录制记录](../media/recording-manifest.json)，成品见 [素材预览](../media/recordings.html)。

## 实际案例与文件

| 文件（GIF 与同名 MP4）  | 实录内容                                                                                                 | 状态   |
| ----------------------- | -------------------------------------------------------------------------------------------------------- | ------ |
| `media/pinyin-search`   | `/t sxw` 显示 4 篇上下文文档，细化为 `/t sxwcj` 或 `/t sxwlx` 定位层级、类型                             | 已完成 |
| `media/domain-search`   | `/t kuaisu` 3 条 → `/t kuaisu rm` 2 条 → 加入 `claude.com` 后 1 条；交换词序仍找到同一篇 Claude 入门文档 | 已完成 |
| `media/english-search`  | `/t skills` 3 条 → `/t skills openai` 2 条，`openai/skills` 排在首位                                     | 已完成 |
| `media/source-filters`  | `/b zhishi zl` 找到“示例：知识蒸馏”；`/h openviking.ai zhibiao` 找到“指标与 Metrics”                     | 已完成 |
| `media/page-preview`    | 对“上下文层级”按 `⌘D` 展开已提取的缓存正文与 Markdown 表格                                               | 已完成 |
| `media/search-settings` | 在设置中将 History Result Count 从 10 改为 5，再恢复为 10                                                | 已完成 |

这些数量是本轮演示环境的实际结果，不是对任意用户数据的保证。相近中文标题来自 OpenViking，入门页面来自 Qwen、Claude Code Docs 和 Dify Docs，英文项目使用 GitHub 的 Agent / Skills 页面。搜索说明参考 Chrome 版，并链接 [text-search-engine](https://github.com/cjinhuo/text-search-engine)。

正文预览依赖 Chrome 中安装并启用官方 [Raycast Browser Extension](https://www.raycast.com/browser-extension)。本轮展示缓存正文的展开与可读内容，不把它当成刷新正文的验收。打开标签的操作保留在 README 说明和快捷键表中，不再嵌入旧版打开动作录屏。

## 剪辑与验证范围

- 六组素材来自真实 Raycast 窗口，保留原播放速度并裁去静止等待；未修改界面或伪造结果。预览片末尾停留 2 秒，使用真实最终帧。
- 搜索配置片仅展示字段编辑、通过 Tab 移出字段提交，以及恢复为 10；本轮未重新进入搜索命令验证结果数量。
- 配置画面中历史读取上限为 1,000、历史范围 14 天、书签显示数量 10、最优建议 2、严格搜索关闭，均未修改。不据此推断其他未展示设置。
- 两份 README 共用 `media/` 素材，静态截图为 `media/search-overview.png`、`media/page-preview.png` 和 `media/search-settings.png`。
- 已打开标签可能来自其他 Chrome 窗口；书签与历史使用演示配置。导出内容已检查为公开演示数据，避免纳入私人标题、网址或其他应用画面。

## Raycast Store 截图

三张商店图使用原生 **Capture Window → Save to Metadata** 导出，统一湖景背景和主题，均为 **2000 × 1250 PNG，16:10 横图**。捕获快捷键由内置 Capture Window 命令配置，不是插件的默认热键。官方建议至少 3 张，最多 6 张，详见 [官方截图指南](https://developers.raycast.com/basics/prepare-an-extension-for-store#screenshots)。

| 文件                                 | 展示内容                                         |
| ------------------------------------ | ------------------------------------------------ |
| `metadata/blazwitcher-raycast-1.png` | `/t sxw` 的 4 个相近中文标题，展示拼音首字母搜索 |
| `metadata/blazwitcher-raycast-2.png` | `/t skills` 的相近英文项目结果                   |
| `metadata/blazwitcher-raycast-3.png` | `⌘D` 展开的实际网页正文与表格                    |

商店截图不替代 README 媒体路径：README 使用 `media/`，商店展示使用 `metadata/`。浏览器版的 AI 分组、侧边栏、彩色命中高亮和 `Command+Shift+K` 唤醒演示不适用于此 Raycast 版本。
