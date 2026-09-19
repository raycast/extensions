# Mark（Raycast 书签）


Icons are stored as files under the library `icons/` directory (`Bookmark.icon.type = "file"`). Favicons are fetched on add/open refresh; Manage can backfill missing icons. goose-mark JSON imports convert remote/cache base64 icons into files.
本地优先的 Raycast 书签扩展：新增/编辑/删除书签、两级分类与多位置、收藏与最近使用、JSON 导入导出、显式冲突解决，以及可选的 BYOK AI 元数据建议。

实现说明：三个命令（`search` / `add-bookmark` / `manage-data`）均已实现；数据层与自检见 `src/repository.ts`、`src/import-export.ts`、`src/ai.ts`、`tests/core.test.ts`。构建通过不等于真实 Raycast 界面或多机同步已验收，详见文末「已知未验证」。

功能迁移对照、数据流与 iCloud 风险、AI 三协议、验收边界见 [`docs/migration-report.html`](docs/migration-report.html)（静态自包含页，可用浏览器打开）。

## 本机开发与安装

需要 Node.js 22.14+ 与 npm 7+（与本仓库 `package-lock.json` 对应）。

```sh
npm install          # 安装并保留 package-lock.json
npm run dev          # ray develop：在本机 Raycast 中出现开发版扩展
npm run build        # ray build：分发构建（含类型检查）
npm test             # node:test + assert 自检（合成目录，不用真实数据）
npm run typecheck    # tsc --noEmit
npm run lint:code    # eslint + prettier 检查
npm run lint         # ray lint（当前因许可常量失败，见「许可」）
```

安装已有源码的扩展：Raycast → Import Extension（需登录 Raycast 账号）选择本目录。本轮未找到官方公布的免费版插件数量上限，不将其作为已核实结论。

三个命令：

| 命令 | 作用 |
| --- | --- |
| Search Marks | 列表搜索标题/网址/描述/标签，按 ID 去重；筛选全部/收藏/最近使用/回收站/分类；打开（模板参数 Form）、复制 URL、编辑、管理分类位置、收藏、删除/恢复 |
| Add Bookmark | 复用同一表单新增书签，保存后以新的 heads 重挂表单（真实宿主中的重置行为未验收） |
| Manage Marks Data | 数据目录状态与校验、分类 CRUD、JSON 导入预览/差异决策/导出、冲突查看与解决、AI 配置状态 |

## 数据目录（本机配置）

- 默认：`environment.supportPath/marks-library`（首次使用自动创建，权限 `0700`），事件放在其 `events/` 子目录。
- 自选：在扩展设置里填写一个**已存在**的专用目录，必须为空或只含 `events`（允许 Finder 的 `.DS_Store`）；插件不会替你挑选位置。
- 自选目录可用 `Manage Marks Data → 校验自选目录` 先做只读校验（复制路径后手动填进扩展设置）。Raycast 未提供写 preference 的 API，插件不会假装替你保存。
- **切换数据目录只改变本机配置，不搬迁、复制、删除或合并旧库**；旧库留在原处，需要时手动导出/导入。
- 只接受普通文件和普通目录；`events/`、事件文件、临时文件出现符号链接或非普通文件时拒绝写入。
- 根目录与 `events/` 内的 `.DS_Store` 会被忽略，不读取其内容、不作为书签事件；其他未知文件仍触发只读保护。

### iCloud Drive

可以指向 `~/Library/Mobile Documents/com~apple~CloudDocs/<你的专用目录>`（务必在 Finder 中确认它真实位于 iCloud Drive）。风险与边界：

- iCloud Drive 只同步文件，不是数据库：**不保证延迟上限、不保证多机并发写不冲突、不保证零丢失**；Apple 官方只描述「联网后保持更新」与删除传播，没有并发合并保证。
- 目录可能只有云端占位（文件未下载）、可能内容滞后、可能被「移除下载」，离线时不可用；本插件遇到不可读会拒绝写入，不会以空库覆盖。
- 删除会传播到同一 Apple 账号的其他设备；免费 5 GB 与备份/照片共享，本插件不保证容量充足。
- 另一台 Mac 的绝对路径通常需要重新选择并校验；本插件不发送或同步数据目录配置。
- 多机「本地已写入」只表示本机文件已发布，不表示已上传或另一台设备可见；本插件不显示同步进度，也不把追加事件当作备份替代（请定期导出 JSON）。

### 从旧 goose-mark 迁移

旧库是 uTools 数据库，插件不读取它、也不读取原项目仓库（本轮原项目只读，未写入）。

1. 在旧版鹅的书签里导出 JSON（`{groups, bookmarks}` 结构）。
2. 打开 `Manage Marks Data → 导入 JSON`，选择文件。
3. 阅读预览统计与警告：附件/图标字段只被保留字段值，**不读取、不复制、不下载**；缺失 ID/时间会按提示生成或回退。
4. 同 ID 内容差异先打开「查看完整差异并选择」，按字段比较网址、删除状态、位置、描述、标签与分类结构，再选「保留本地」或「采用导入版本」；不同 ID 同 URL 只提示，不会自动合并。
5. 回到预览选择「应用导入」；建议在导入前先导出当前目标库作为备份（导出拒绝覆盖已有文件）。

Data 迁移限制：默认/回收站按导出里的固定 ID 映射（`g-default/sg-default`、`g-trash/sg-trash`）；`prevLocations`、`pinned`、`tags`、时间与汇总访问次数都会保留；**同 ID merge 时保留本地访问基数、历史访问事件与 `lastUsed`，导入的访问统计不会覆盖本地**。

## 数据格式与上限

- 每次写入是一个不可变事件 `events/<UUID>.json`：`{schemaVersion, eventId, occurredAt, mutations[], visits[]}`；实体版本由 `eventId` 标识，`baseHeads` 引用已读到的所有当前头。
- 无覆盖发布：wx 写临时文件 → fsync → `link(tmp, final)`（EEXIST 拒绝）→ 删除临时名；不使用可覆盖 rename。发布成功但临时文件清理失败时会重新读取 final 核对并提示，不会自动重试。
- 首版上限（超限即报错并禁止写入，不做隐式清理）：单事件/导入 10 MiB、事件数 10,000、累计 100 MiB。
- 未解决多头/结构冲突时普通写入全库暂停，只允许在 `Manage Marks Data` 里解决冲突。
- 损坏、缺父、依赖环、未知 schema、未知正式文件、目录不可用：状态为 `blocked`，命令只读展示问题，不会以空库继续保存。

## 导入导出边界

导入只接受本插件导出格式或旧 goose-mark 的 `{groups, bookmarks}`；声明未知版本、含 `settings`/`apiKey`/`token` 等字段会被拒绝（错误不回显字段值）。导出只从已验证且无冲突的实体构建白名单对象，不包含 AI 配置、数据目录或运行时设置，只写你明确选择的目录，目标已存在则拒绝。

## AI（可选，直接 BYOK）

- 协议：`openai-responses`（`/responses`）、`openai-compatible`（`/chat/completions`）、`anthropic`（`/messages`），各协议在扩展设置里各有一个独立 password key；另有 baseUrl、model 两项。
- 隐私：只有你在表单里勾选的字段（标题/网址/描述/标签）会发送；发送前弹出确认，明确显示协议、服务地址、模型与字段清单；返回建议以纯文本前后对照展示，选择「填入表单」后才写进表单，保存仍需你提交表单。
- 不发送分类位置、访问统计或目录路径。API Key 仅作为认证头发送至你配置的服务，不进入提示词、日志、书签库或导出；不调用 Raycast AI（`AI.ask`）。
- 只有 HTTPS；本机 loopback HTTP 例外；`redirect: error`、20 秒超时、响应体 1 MiB 上限；`Responses` 仅在 405/501 时降级为同服务的 Chat，401/429/网络错误不重试、不降级。
- password preference 只是 Raycast 的密码型输入控件，**不等同于已验证的 macOS Keychain 保护**，请按自己的威胁模型判断是否填写。
- 无 key、取消、超时或供应商错误都不影响普通书签功能。

## 冲突与恢复

`Manage Marks Data` 会为每个实体列出全部并发版本（含墓碑、位置、访问基数与版本 ID）。选择「保留此版本 / 保留并移入回收站 / 保留并修复到默认位置」后，必须**一次解决全部冲突**才允许应用；应用时会基于该实体全部当前头写新版本，分类引用无效会被整体拒绝，不会自动复活或自动删除。

## 未实现（不在本版范围）

HTML/网址精灵导入、批量操作、拼音搜索、死链探测、网页抓取、分类排序（上移/下移）与拖拽排序、回收站清空、复制描述、子分类跨一级移动或提升为一级分类。图标管线（含附件读取/下载）需要替换旧 uTools 附件接口，能力本身可以重做。以上都是首版取舍或适配工作，不代表 Raycast 平台不能做；逐项对照见 `docs/migration-report.html` 第 2 节。

## 验证状态（2026-09-15 CST，本机）

已运行：`bun run build` 通过；`npm run typecheck` 通过；`npm run lint:code` 通过；`npm test` 16/16 通过（合成目录 + mock fetch，未使用真实数据）。

`npm run lint` 当前失败，唯一原因是 `package.json` 的 `license: "UNLICENSED"` 不满足 Raycast 商店对常量许可的要求（图标、ESLint、Prettier 均通过）。保留 `private: true` / `UNLICENSED`（继承原项目专有许可）是本轮批准的决定，因此**提交商店前必须先解决许可**。

`author` 字段当前为 `eachann`，是主会话批准的本地元数据，未与 Raycast 账号核验；发布前需确认或替换。

## 已知未验证

- 真实 Raycast 宿主内的界面、键盘路径、Form/List 行为与提示（本轮无浏览器/桌面交互，也没有可视化验收），包括 Add Bookmark 保存后表单重挂与根视图 `pop` 的实际表现。
- 真实 AI 供应商联网调用、密钥配置与错误文案；自检只覆盖请求构造、鉴权头、超时、脱敏与解析（mock fetch）。
- 真实 iCloud 多机同步、占位文件与并发写入；本轮未做多设备实测。
- 商店发布（许可常量、许可证文件、审核元数据）。

## 审查处置

主会话已修复模板空 authority 绕过、AI 预览动态 Markdown、导入差异展示不足、Finder 元数据误阻断、访问写入警告遗漏与 AI 密钥文案；标签改为逗号分隔输入，支持从空库创建新标签。新建一级分类自带「未分类」子分类是明确保留的默认行为，与两级位置模型及原项目习惯一致。商店许可门禁仍未通过，不代表已具备发布资格。

## 许可

`private: true`、`license: "UNLICENSED"`，继承原项目 `/Users/eachann/Work/goose-mark` 的专有许可；本仓库不含可再分发授权，未做任何提交、推送或发布。
