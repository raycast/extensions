<p align="center">
  <img src="media/icon.png" alt="Blazwitcher Raycast 图标" width="96" height="96" />
</p>

# Blazwitcher for Raycast

在一个 Raycast 命令里，用中文、拼音、首字母或英文搜索 Chrome 标签页、书签和历史记录。

[English](README.md) | [简体中文](README.zh-CN.md)

在 Raycast 中打开 **Search Browser** 命令，即可在一个列表中搜索标签页、书签和历史记录。

![在 Raycast 中搜索浏览器](media/search-overview.png)

Blazwitcher for Raycast 是 Blazwitcher 的 Raycast 版本。Blazwitcher 是一款支持拼音模糊搜索的 Chrome 插件，用于统一搜索标签页、书签和历史记录，可在 [Chrome 应用商店](https://chromewebstore.google.com/detail/blazwitcher-search-and-sw/fjgablnemienkegdnbihhemebmmonihg) 安装，源码见 [GitHub](https://github.com/cjinhuo/blazwitcher)。

适合同时打开多个标签页、经常查找书签或访问记录的用户，通过键盘快速定位并切换标签页，或重新打开收藏和访问过的页面。界面采用 Raycast 原生列表、动作菜单和快捷键，两个版本都使用 [text-search-engine](https://github.com/cjinhuo/text-search-engine) 提供搜索能力。

**网页正文预览需要在 Chrome 中安装并启用官方 [Raycast Browser Extension](https://www.raycast.com/browser-extension)。** 选中已打开的标签页后，按 **`⌘D`** 即可在 Raycast 右侧面板预览提取的网页正文。

## 如何接入 Chrome

| 数据或操作                 | 读取方式                                                                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 已打开标签页与跳转         | JXA 脚本读取 Chrome 当前窗口和标签页，切换到指定标签，或在启动时捕获的当前标签／新标签中打开网址                                             |
| 书签                       | 读取并解析 Chrome 本地的 `Bookmarks` 和 `AccountBookmarks` JSON 文件                                                                         |
| 历史记录                   | 只读查询 Chrome 本地的 `History` SQLite 数据库，不修改原文件                                                                                 |
| 网页预览与可用的标签页图标 | 官方 Raycast Browser Extension 提供 `BrowserExtension.getTabs()` 和 `BrowserExtension.getContent()`；正文预览由 `getContent()` 读取 Markdown |

JXA 通过 macOS 的 `osascript` 执行，与 AppleScript 使用同一套自动化机制；首次使用时按提示允许 Raycast 控制 Google Chrome。基础搜索和跳转无需安装配套浏览器扩展，网页正文预览需要安装。

## 功能

### 模糊拼音搜索

搜索输入采用防抖处理，等待新结果时保留上一页，减少连续输入和切换来源时的列表闪烁。

支持中英文混合模糊搜索，搜索能力由 [text-search-engine](https://github.com/cjinhuo/text-search-engine) 提供。匹配越连续，结果越靠前；同相关度的历史记录按最近访问时间降序展示，帮助快速定位目标。搜索能力包括：

- 首字母与完整拼音搜索，支持中文、拼音和英文混合输入。
- 域名搜索与空格分词搜索，分词后无需按顺序匹配。

默认搜索标题与域名，匹配与排序规则沿用 [Blazwitcher Chrome 插件](https://chromewebstore.google.com/detail/blazwitcher-search-and-sw/fjgablnemienkegdnbihhemebmmonihg)（[GitHub 源码](https://github.com/cjinhuo/blazwitcher)）。这项设置名为**Match Chrome Blaz**，“Chrome Blaz”指的就是 Blazwitcher 浏览器版。需要搜索网址路径、查询参数或片段时，在扩展设置中选择**Full URL Search**，这个模式也保留标题优先排序。

先用 `sxw` 找到 3 篇标题相近的“上下文”文档，再输入 `sxwlx` 定位**上下文类型**。完整拼音同样有效：`shangxiawen` 找到这 3 篇文档，加上 `tq` 后定位**上下文提取**。

![用拼音首字母逐步缩小中文标题的匹配范围](media/pinyin-search.gif)

[观看拼音搜索录屏（MP4）](media/pinyin-search.mp4)。

英文搜索也可以逐步细化。在这组演示中，`/t skills github.com` 找到 3 个标题相近的标签；加上项目关键词，输入 `/t skills github.com openai` 后缩小到 2 个结果，**openai/skills** 排在首位。结合列表里的 GitHub 标题和网址，可以直观看出命中的项目。

![用英文项目关键词缩小相近 Skills 标签的搜索范围](media/english-search.gif)

[观看英文搜索录屏（MP4）](media/english-search.mp4)。

从 `kuaisu` 到 `kuaisu rm` 逐步缩小范围，再加上 `claude.com` 找到**快速入门 - Claude Code Docs**；换成 `rm claude.com kuaisu` 也能找到同一页。

![组合域名与空格分词，搜索顺序无关的关键词](media/domain-search.gif)

[观看域名与分词搜索录屏（MP4）](media/domain-search.mp4)。

### `⌘D` 网页预览

安装并启用官方 [Raycast Browser Extension](https://www.raycast.com/browser-extension) 后，预览入口才会出现。选中结果后按 `⌘D`，或通过动作菜单 → **Expand Preview** 打开原生右侧面板。每次进入搜索命令都默认收起。

![搜索命令右侧面板中的网页正文](media/page-preview.png)

预览会高亮标题和网址中参与匹配的文字，并以 **Tab**、**History** 或 **Bookmark** 标记来源。命中高亮位于右侧详情面板。

普通 HTTP(S) 标签页可以展示提取的 Markdown 正文；书签、历史、无痕标签和特殊协议页面仅展示已有基础信息。**Refresh Preview** 会重新读取选中标签的正文，不会刷新 Chrome 页面。

部分已有标签可能连接失败，动态网页的正文可能不完整。浏览器扩展能力不可用时会隐藏预览入口。具体限制见 [详情预览说明](docs/详情预览试用说明.md)。

![按 ⌘D 展开已提取的网页正文](media/page-preview.gif)

[观看网页预览录屏（MP4）](media/page-preview.mp4)。

### 一个列表，搜索三种来源

通过来源下拉框、搜索前缀或快捷键，缩小搜索范围。

| 来源         | 搜索前缀 | 默认快捷键 |
| ------------ | -------- | ---------- |
| 全部来源     | —        | `⌘⇧0`      |
| 已打开标签页 | `/t`     | `⌘⇧1`      |
| 书签         | `/b`     | `⌘⇧2`      |
| 历史记录     | `/h`     | `⌘⇧3`      |

切换来源会保留关键词，并移除原来的来源前缀。

默认模式会先筛选来源、匹配关键词，再合并重复记录。多个实际打开的标签页仍分别保留；书签与历史按相同标题或完整 URL 合并，依次优先保留标签页、历史、书签。单独搜索历史或书签时也会去重。“Full URL Search”沿用原有排序与去重方式，区别见 [搜索策略说明](docs/默认搜索策略对齐.md)。

输入关键词后，前 **2** 条结果显示在**Top Suggestions**中，其余结果按标签页、历史、书签分区展示。历史与书签默认各显示最多 **10** 条，包含最优建议中的对应记录；显示数量和建议数量都可以配置。

![标签页、书签与历史筛选](media/source-filters.gif)

### 搜索模式与自定义配置

打开 **`⌘K` → Extension Preferences**，选择搜索模式并调整参数。两种模式都支持相同的显示数量和严格搜索开关。

| 配置项                                                  | 默认值            | 可调整范围与作用                                                                      |
| ------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------- |
| Search Mode（搜索方式）                                 | Match Chrome Blaz | 默认搜索标题与域名；选择“Full URL Search”可进一步搜索网址其余部分，并保留标题优先排序 |
| History Date Range (Days)（历史时间范围）               | 14 天             | 0–36500 天；0 表示不限日期                                                            |
| History Reading Limit（历史读取上限）                   | 1,000 条          | 1–100000 条，按最近访问读取                                                           |
| History Result Count（历史显示数量）                    | 10 条             | 每次搜索 1–20 条，包含最优建议中的历史                                                |
| Bookmark Result Count（书签显示数量）                   | 10 条             | 每次搜索 1–20 条，包含最优建议中的书签                                                |
| Top Suggestions（最优建议数量）                         | 2 条              | 输入关键词后显示前 1–10 条；空查询不显示建议区                                        |
| Strict Search (Consecutive English Matches)（严格搜索） | 关闭              | 英文字符必须连续命中；中文仍支持拼音与首字母                                          |

读取上限决定参与搜索的历史候选数量，显示数量决定匹配后展示多少条结果；最优建议只是把前几条结果移到单独分区，不额外增加结果。保存后重新打开命令生效。数值超过上限时按上限处理，无效输入使用默认值。

已有用户保存的配置继续保留。Raycast 与 Chrome 版分别保存设置，自定义配置不会自动同步，标签页次序也可能存在差异；详见 [搜索策略说明](docs/默认搜索策略对齐.md)。

![Raycast 搜索参数设置](media/search-settings.png)

### 准确切换和打开页面

选中标签页后按 `Enter`，切换到该标签页；选中书签或历史结果后按 `Enter`，在记录所属的 Chrome 配置中打开。

也可以将任意结果打开到新标签页，或替换启动命令时正在使用的标签页。这两种操作沿用启动时捕获的 Chrome 目标；目标已关闭或失效时会提示失败，避免打开到其他标签。

按 `⌘Enter` 在新标签页打开，按 `⇧Enter` 在启动时的当前标签页打开。完整操作见下方快捷键表。

### 键盘操作与自定义快捷键

| 动作                     | 默认快捷键       |
| ------------------------ | ---------------- |
| 选择结果                 | `↑` / `↓`        |
| 打开结果或切换标签页     | `Enter`          |
| 在新标签页打开           | `⌘Enter`         |
| 在启动时的当前标签页打开 | `⇧Enter`         |
| 复制完整 URL             | `⌘C`             |
| 打开动作菜单             | `⌘K`             |
| 展开／收起可选预览       | `⌘D`，预览可用时 |

打开动作菜单 → **Shortcut Settings**，可以修改额外绑定或恢复默认，修改结果会跨次启动保留。预览不可用时，可以把它的快捷键分配给其他动作；保存时会停用冲突的预览绑定。主要的 `Enter` 和 `⌘Enter` 动作由 Raycast 管理。

需要一键启动时，在 Raycast Settings → Extensions 中为命令设置热键或别名。Raycast 版没有预设全局唤醒热键。

<!-- 演示 GIF：media/shortcut-settings.gif -->

### Chrome 多配置与本地启动缓存

书签和历史初始读取 Chrome 最近使用的配置。打开动作菜单 → **Switch Chrome Profile**，可以选择某个配置，或选 **All Profiles** 搜索全部配置。这个选择只在当前命令内生效；重新打开命令时，会再次采用 Chrome 最近使用的配置。标签页始终来自所有可读取的 Chrome 窗口，不受这个选择影响。

新安装默认读取最近 **14 天、最多 1,000 条**历史记录，两个值都可以在扩展设置中调整；读取上限最高 **100,000 条**，天数填 **0** 表示不限日期。搜索全部配置时，合并后的历史总量也受读取上限约束。已有用户保存的配置继续保留。无痕标签页默认排除，需要时可以在扩展设置中开启。

启动缓存默认开启，在读取最新数据期间先显示少量本地书签、历史快照，并标记缓存状态；缓存历史也按当前时间范围过滤。可以在扩展设置中关闭，或通过动作菜单 → **Clear Startup Cache** 清理。

<!-- 演示 GIF：media/profile-settings.gif -->

## 安装与开始使用

目前通过源码安装；上架后会补充 Raycast Store 安装链接。

需要 **macOS**、**Google Chrome**、**Raycast**，以及用于源码安装的 **Node.js 22.22.2 或更新版本**。使用前请先启动一次 Chrome。

```bash
git clone https://github.com/cjinhuo/blazwitcher-raycast.git
cd blazwitcher-raycast
npm ci
npm run dev
```

构建成功后，打开 Raycast，搜索 `Blazwitcher`，运行 **Search Browser**。命令与菜单采用美式英语，中文网页标题与中文／拼音搜索输入不受影响。

1. 输入标题、拼音、首字母或域名片段。
2. 用 `↑` / `↓` 选择结果。
3. 按 `Enter` 打开或切换页面，按 `⌘K` 查看更多动作。
4. 需要正文预览时，在 Chrome 中安装并启用官方 [Raycast Browser Extension](https://www.raycast.com/browser-extension)，然后选中已打开的标签页，按 `⌘D`。

`npm run dev` 会导入扩展并监听代码变化。导入完成后按 `Ctrl+C` 停止监听，已安装的命令仍可使用。更新时重新执行 `git pull`、`npm ci`、`npm run dev`。更多配置与排查步骤见 [贡献指南](CONTRIBUTING.md)。

### macOS 自动化授权

首次操作标签页时，macOS 可能询问是否允许 **Raycast 控制 Google Chrome**，用于本地脚本读取和切换标签页。如果曾拒绝，可到“系统设置 → 隐私与安全性 → 自动化”，在 Raycast 下启用 Google Chrome，再重新打开命令。

## 功能边界与隐私

- 当前支持 **macOS 上的 Google Chrome**，界面运行在 Raycast 内。独立的 [Blazwitcher 浏览器扩展](https://github.com/cjinhuo/blazwitcher) 提供浏览器内界面与 AI 标签分组。
- 默认搜索标题和域名，“Full URL Search”进一步支持路径、查询参数与片段；可选预览不会增加正文搜索、摘要或 AI 功能。
- 命中文字在右侧详情面板中高亮；列表行保留 Raycast 原生文字显示。
- 浏览数据在本机搜索。Chrome 的书签、历史和网站图标数据库保持只读；不读取 Chrome Cookie，也不向搜索或 AI 服务上传浏览数据。
- 可选启动缓存保存标题、网址等记录字段，每个配置最多 100 条书签和 100 条历史，有效期 5 分钟，总容量限制为 512 KB；不保存标签页或无痕数据。
- 网页预览正文仅保留在本次命令的内存中，不写入磁盘或搜索索引。官方浏览器扩展返回的网站图标可能通过其提供的图片地址加载。

## 参与项目

开发和排查请参考 [CONTRIBUTING.md](CONTRIBUTING.md)，历史验证的范围见 [验证记录](docs/验证记录.md)。反馈问题时，请在 [GitHub Issues](https://github.com/cjinhuo/blazwitcher-raycast/issues) 中提供复现步骤。

准备录制 GIF 或截图时，可按 [素材录制清单](docs/media-guide.md) 操作；商店截图、账号与发布步骤见 [Store 提交指南](docs/store-submission.md)。

[MIT 许可证](LICENSE) · [第三方声明](THIRD_PARTY_NOTICES.md)
