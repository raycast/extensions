# 本地开发与调试指南

本项目是运行在 Raycast 内的 Blazwitcher 扩展，用于搜索 Google Chrome 标签页、书签和历史记录。以下命令均在项目根目录执行。

## 环境准备

- macOS、Raycast 和 Google Chrome。先启动一次 Chrome，确保本地配置目录已生成。
- Node.js：建议使用本项目已验证的 `22.22.2`，通过 npm 安装依赖。
- 项目包含 `package-lock.json`，首次安装或恢复依赖使用 `npm ci`，避免无意更新依赖版本。
- Raycast CLI 随 `@raycast/api` 安装，无须全局安装。项目使用 macOS 自带的 `/usr/bin/osascript` 和 `/usr/bin/sqlite3` 读取浏览器数据。

可以先检查终端环境：

```bash
node --version
npm --version
```

终端中的 Node.js 用于依赖安装、构建和测试；扩展界面实际运行在 Raycast 提供的运行时中。

## 本地安装与启动

进入包含 `package.json` 的 `blazwitcher-raycast` 目录，执行：

```bash
npm ci
npm run dev
```

`npm run dev` 对应 `ray develop`，会构建代码、将扩展导入本机 Raycast，并持续监听修改。出现 `ready - built extension successfully` 后，打开 Raycast 搜索 `Blazwitcher`，只保留“搜索浏览器”命令，入口文件为 `src/search-all.tsx`。来源通过下拉框、`/t`／`/b`／`/h` 和命令内快捷键切换。旧入口的 Raycast 启动热键需要改绑。

开发期间保持该终端运行。保存代码后会重新构建；自动重载由 Raycast 的 Developer 设置中的 **Auto-reload on save** 控制。如果界面未更新，先确认构建成功，再退出当前命令并重新打开。CLI 的导入和重载行为参见 [Raycast CLI 文档](https://developers.raycast.com/information/developer-tools/cli)。

在终端按 `Ctrl+C` 停止开发进程，只会停止监听和日志输出，不等于卸载扩展。下次开发重新执行 `npm run dev` 即可；不要同时启动多个相同项目的开发进程。

### 构建与安装的区别

```bash
npm run build
```

本项目的构建脚本是 `ray build -e dist`；`dist` 指构建环境，并非输出目录。当前 CLI 在未传 `-o` 时写入本机 Raycast 扩展目录并通知构建刷新，不发布到商店。首次导入或重新注册命令使用 `npm run dev`；仅需独立产物时可执行 `npx ray build -e dist -o dist`。不同 checkout 若使用同一个扩展名称，会写入同一个默认目录，验证时要确认实际加载的版本。

### 设置与权限

在扩展中按 `⌘K`，选择“扩展设置”：

- **历史记录读取上限**：默认 `20000`，最高 `100000`。切换到“全部配置”后仍受合并后的总上限约束。
- **无痕标签页**：默认关闭，需要时自行开启。

快捷键通过 `⌘K` → “快捷键设置”修改，保存后立即生效。来源切换默认使用 `⌘⇧0/1/2/3`，可分别自定义或留空停用额外绑定；来源动作菜单及下拉框始终保留。扩展偏好中的旧来源快捷键仅在首次没有已保存配置时迁移，后续修改不会生效。

书签和历史的 Chrome 配置通过 `⌘K` → “切换 Chrome 配置”选择，也可选“全部配置”。标签页来自所有可读的 Chrome 窗口。

重装时，如果卸载曾选择保留设置，旧的历史上限和无痕偏好会继续生效，不一定是默认值。修改历史上限或无痕偏好后，重新打开命令以确认配置生效；命令内快捷键设置无需重新打开。

首次读取或切换标签页时，macOS 可能询问是否允许 **Raycast 控制 Google Chrome**。若此前拒绝，可按界面提示到“系统设置 → 隐私与安全性 → 自动化”检查 Raycast 对 Chrome 的授权，然后退出并重新打开命令。

文件读取失败时，先查看列表底部“来源状态”的错误提示，检查 Chrome 是否已初始化、所选配置是否正确，以及 Raycast 的文件访问权限。不要通过删除或修改 Chrome 原始数据库来排查。

## 日常调试

### 查看日志与错误

运行 `npm run dev` 的终端会显示构建信息以及扩展的 `console.log`、`console.debug`、`console.error` 输出。需要临时埋点时，优先记录请求序号、数据版本、记录数、错误分类和耗时，避免打印真实标题、完整 URL、搜索词或完整结果对象。

调试时结合三处信息：

1. **开发终端**：检查编译失败、运行日志和堆栈。
2. **Raycast 错误界面**：未捕获异常会展示错误，开发模式包含定位信息。
3. **“来源状态”和操作提示**：单来源加载失败会保留其他可用结果；打开或复制失败会显示提示。此类已处理错误不一定出现在异常界面。

日志与错误界面的说明参见 [Raycast 调试文档](https://developers.raycast.com/basics/debug-an-extension)。提交问题时保留复现步骤和必要错误分类，不附完整浏览历史或未经脱敏的日志。

### 定位代码

| 需要排查的问题                             | 优先查看                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------- |
| 列表、来源筛选、快捷键、打开和复制动作     | `src/components/search-browser.tsx`                                             |
| 输入更新、取消旧查询、分页与配置切换       | `src/hooks/use-browser-search.ts`                                               |
| 数据加载、刷新、来源错误隔离、结果版本校验 | `src/browser/service.ts`                                                        |
| 拼音匹配、排序与原文命中范围               | `src/search/engine.ts`、`src/search/highlight.ts`                               |
| `/t`、`/b`、`/h` 来源前缀                  | `src/search/query.ts`                                                           |
| 标签页读取、按真实标签 ID 跳转             | `src/browser/chrome.ts`、`src/browser/chrome-scripts.ts`                        |
| Chrome 配置、书签与历史读取                | `src/browser/profiles.ts`、`src/browser/bookmarks.ts`、`src/browser/history.ts` |
| SQLite 只读访问与锁冲突快照                | `src/browser/sqlite.ts`                                                         |

### 断点调试（可选）

Raycast 官方文档推荐通过 VS Code 扩展 [Raycast（tonka3000.raycast）](https://marketplace.visualstudio.com/items?itemName=tonka3000.raycast) 附加调试器：

1. 用 VS Code 打开本项目，安装上述编辑器扩展。
2. 在终端执行 `npm run dev`。
3. 在 VS Code 命令面板运行 `Raycast: Attach Debugger`。
4. 在源码中设置断点，然后在 Raycast 中打开目标命令并触发相应操作。

该流程引用自 [官方调试指南](https://developers.raycast.com/basics/debug-an-extension)，本项目尚未单独验证当前 Raycast 版本的断点附加流程。不要把只调试构建 CLI 的 Node 进程当作已附加到扩展运行时。

### 检查 React 状态（可选）

需要查看组件树和 props 时，可按照官方当前说明全局安装 React Developer Tools：

```bash
npm install -g react-devtools@6.1.1
react-devtools
```

同时保持 `npm run dev` 运行，并在 Raycast 中打开扩展命令。这里使用全局安装，不修改项目依赖；这只是排查组件状态的可选工具，不是使用扩展的前置条件。连接方式与版本要求以 [官方调试指南](https://developers.raycast.com/basics/debug-an-extension) 为准，本项目尚未实测此流程。

## 检查与验证

| 命令                 | 检查内容                               |
| -------------------- | -------------------------------------- |
| `npm run typecheck`  | TypeScript 类型检查                    |
| `npm test`           | 搜索、数据读取、服务状态和内存回归测试 |
| `npm run lint`       | ESLint 与 Prettier 检查                |
| `npm run format`     | 格式化项目文件，会修改文件             |
| `npm run build`      | Raycast 发行构建，写入本机扩展目录     |
| `npm run check`      | 依次执行类型检查、测试、格式检查和构建 |
| `npm run test:local` | 读取本机 Chrome 数据并输出诊断统计     |

修改代码后，按影响范围运行测试；完成改动后运行 `npm run check`。仅修改 Markdown 时，可以先做针对性的格式检查：

```bash
npx prettier --check CONTRIBUTING.md
```

`npm run test:local` 会读取 Chrome 最近使用配置的书签和最多 20,000 条历史，统计读取、索引、固定样例查询的耗时和内存；不输出记录的标题和 URL。它不读取真实标签页，也不覆盖 Raycast 界面、自动化权限或实际跳转，且不会读取 Raycast 偏好中的自定义历史上限。

该脚本由终端启动，因此终端与 Raycast 的权限可能不同：终端读取成功，不代表 Raycast 读取一定成功。

涉及 OpenSpec 变更时，在已安装 OpenSpec CLI 的环境中额外执行：

```bash
openspec validate restore-raycast-single-list --strict --no-interactive
```

OpenSpec CLI 不属于本项目 npm 依赖；普通本地安装和运行不需要它。

### 在真实界面中验收

自动化检查之后，按本次改动选择以下场景进行人工验证，并在 [验证记录](docs/验证记录.md) 中区分“逻辑测试通过”和“真实界面已验证”：

- 打开统一搜索入口并切换来源，并尝试 `/t`、`/b`、`/h` 前缀。
- 搜索已知记录，覆盖中文、全拼、首字母、混合查询、URL 和空查询；例如准备标题包含“周报”的记录，再输入 `zhoubao`。
- 连续输入、删除、快速切换查询，确认旧结果不会覆盖新结果；滚动超过一页，检查分页。
- 用上下键选择，Enter 打开，`⌘Enter` 新建标签，`⇧Enter` 在捕获标签打开，`⌘C` 复制原始完整地址，`⌘K` 打开操作菜单。
- 切换 Chrome 配置；修改历史上限和无痕偏好后重新进入命令。
- 关闭或移动标签页后尝试跳转，确认不会误开其他标签；失败时应保留界面并提示重试或重新打开命令。
- 改动权限处理时，单独验证拒绝与恢复；改动界面时，检查明暗主题、长标题和长 URL。

## 常见问题

| 现象                             | 排查方式                                                                                                                |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Raycast 搜不到扩展               | 确认在正确项目目录执行了 `npm run dev`，终端构建成功，并在 Raycast 设置中确认“Blazwitcher 拼音搜索”及对应命令已启用。   |
| 保存后仍显示旧界面               | 检查构建错误和 Developer 的自动重载设置；退出命令重新打开。必要时停止当前开发进程，再启动一次。                         |
| Chrome 标签页为空或无法切换      | 确认 Chrome 正在运行，并检查 Raycast 控制 Chrome 的自动化权限；重新打开命令。                                           |
| 书签或历史缺失                   | 检查所选 Chrome 配置、历史上限和“来源状态”。终端诊断与 Raycast 的权限需分别判断。                                       |
| 提示“结果已更新，请重新选择”     | 这是过期结果保护。等待新结果后重新选择；不要绕过请求序号或数据版本校验。                                                |
| 能搜索到拼音结果，但文字没有高亮 | 当前公开 `List.Item` 接口尚未实现所需的彩色命中高亮，这不是安装失败。参见 [高亮能力调查](docs/Raycast列表高亮调查.md)。 |

## 卸载与重新安装

1. 先在开发终端按 `Ctrl+C`，停止 `npm run dev`。
2. 打开 Raycast 设置，找到 **Blazwitcher 拼音搜索**。
3. 右键扩展，选择 **Uninstall Extension**。
4. 需要保留配置时选择 **Uninstall but Keep Settings**；需要清除扩展配置和数据时选择 **Uninstall and Delete Settings**。

卸载不会删除项目源码。之后重新安装，回到项目根目录执行 `npm run dev`；如果依赖已删除，则先执行 `npm ci`。不要通过修改 Raycast 私有数据库或应用安装包来注册、重置或移除扩展。

## 提交到 Raycast Store

发布前确认 `package.json` 的 `author` 是自己的 Raycast Store 用户名，并使用合法分类；依赖升级同步更新 npm 锁文件。

```bash
npm run check
```

检查包含官方 `ray lint` 的 manifest、图标和源码校验，以及项目类型检查、回归测试、全仓格式和分发构建。构建完成后还需要在 Raycast 中实际验证搜索、来源切换、复制、Chrome 跳转和权限失败时的提示。

在 Raycast 的 Window Capture 中启用“Save to Metadata”，使用公开演示数据拍摄商店截图并保存到 `metadata/`；推荐至少 3 张 2000×1250 PNG。README 使用的其他媒体放在 `media/`，运行时图标放在 `assets/`。不要在截图中展示私人标题、地址或配置信息。

新增或更新 `CHANGELOG.md`，版本标题使用 `## [变更标题] - {PR_MERGE_DATE}`。官方审核合并后会替换日期占位符。

```bash
npm run publish
```

发布命令会要求登录，并向 `raycast/extensions` 创建或更新 PR。PR 中说明拼音、首字母、中英文混合搜索与已有 Google Chrome 扩展的区别，并附演示录屏或截图；官方审核合并后才会上架。发布流程见 [官方文档](https://developers.raycast.com/basics/publish-an-extension)。

## 协作约定

- 提交改动前阅读 [AGENTS.md](AGENTS.md) 与 [实施计划](docs/实施计划.md)，说明本次变更和验证范围。
- 保持 Raycast 默认单栏列表，可通过 `⌘D` 主动展开原生详情。正文加载独立于搜索、仅驻留内存；独立 Electron 历史方案位于忽略目录 `.local/rejected-desktop/`，不属于当前运行或构建流程。
- 使用 `text-search-engine` 的匹配结果，不重复实现拼音算法；不以括号、图片标题或右侧详情代替列表行内高亮。
- 依赖变更同步更新 `package-lock.json`。不手工修改生成的 `raycast-env.d.ts`，不纳入 `node_modules/`、`dist/`、真实浏览数据或调试日志。
- 涉及行为变化时同步更新说明和相应 OpenSpec；如尚未实测某个场景，明确记录，不用构建通过代替验收。
