# README 与 Raycast Store 素材

## 本轮录制

2026-10-16，基于 `cjinhuo/blazwitcher-raycast` 最新 master 提交 `232b0144fb443ce8bf8ee339e9b1a00f256e3fd9`，在 `codex/store-media-20261016` 分支录制。包含已合并的搜索防抖、英文界面，以及新版预览命中高亮和来源标签。

使用 `raycast-blaz` Chrome Profile，恢复 11 个公开页面、5 个真实分组（不计空白标签）。页面来自 OpenViking、Qwen、Claude Code、Dify 和 GitHub AI 项目；书签、历史使用该配置中的公开演示记录。标签搜索仍按产品行为读取所有可访问窗口，录制前通过公开查询收窄，成品只保留公开演示结果。

## 文件与实际案例

| 文件（GIF 与同名 MP4） | 实录内容                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `media/pinyin-search`  | `/t sxw` 3 条 → `/t sxwlx` 1 条；`/t shangxiawen` 3 条 → `/t shangxiawen tq` 1 条      |
| `media/domain-search`  | `/t kuaisu` 3 条 → `/t kuaisu rm` 2 条 → 加 `claude.com` 后 1 条；交换词序仍找到同一页 |
| `media/english-search` | `/t skills github.com` 3 条 → 加 `openai` 后 2 条，`openai/skills` 排在首位            |
| `media/source-filters` | `/b zhishi zl` 找到“示例：知识蒸馏”；`/h openviking.ai zhibiao` 找到“指标与 Metrics”   |
| `media/page-preview`   | `⌘D` 展开标题命中高亮、Tab 标签和正文；向下选择另一篇文档，随后收起                    |

配置使用本轮的静态 `media/search-settings.png`，未改动设置。旧配置 GIF/MP4 已移除，避免混入旧版本演示。

这些结果数量仅描述本轮演示数据。正文预览依赖官方 [Raycast Browser Extension](https://www.raycast.com/browser-extension)。本轮确认“上下文类型”和“上下文编译概览”的真实 Markdown 正文可见；未据此声称验证了 Refresh Preview。书签、历史预览仅提供基础信息。

## 导出与检查

5 段原始视频由桌面录屏采集。成品保留原速，只裁出完整 Raycast 命令窗口并删去静止等待，不改写界面、标题或结果。每段输出 GIF（15 fps）和 MP4（30 fps）。剪辑区间、尺寸、校验值和实际查询见 [录制记录](../media/recording-manifest.json)，可在 [素材预览](../media/recordings.html) 播放。

三张 Store PNG 来自真实 Raycast 窗口截图，保留原始 1500 × 950 界面像素，居中放在统一灰蓝背景上，输出 **2000 × 1250 PNG**。本轮未使用 Capture Window 的保存按钮：该按钮未被桌面自动化工具暴露。窗口内容未经修改，背景不含其他应用或私人数据。

| 文件                                 | 内容                             |
| ------------------------------------ | -------------------------------- |
| `metadata/blazwitcher-raycast-1.png` | 3 个相近中文标题的拼音搜索       |
| `metadata/blazwitcher-raycast-2.png` | 相近 Skills 项目的英文查询       |
| `metadata/blazwitcher-raycast-3.png` | 新版预览高亮、来源标签和提取正文 |

README 共用 `media/` 素材，商店截图位于 `metadata/`。官方尺寸、数量和内容要求见 [Store 截图规范](https://developers.raycast.com/basics/prepare-an-extension-for-store#screenshots)。Chrome 版 AI 分组操作与侧边栏不属于 Raycast 功能；录屏里的分组是 Chrome 中已有的真实分组。

已用 Raycast 官方 `check_metadata_images.py` 和 `check_raycast_images.py` 校验三张 PNG 的尺寸、窗口留白、背景一致性和外观；均通过。初次提交的浅灰背景与预览窗口顶部对比不足，已调整背景颜色，未改动窗口像素。
