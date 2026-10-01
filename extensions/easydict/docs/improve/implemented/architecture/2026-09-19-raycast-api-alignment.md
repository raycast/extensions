# Agent Note: 将 Raycast 文档与近期 API 更新纳入重构

Status: implemented

## Problem

[主重构计划](2026-09-19-command-boundaries-and-modularization.md) 已核对命令打包、生命周期和存储，但最初没有系统检查近期 API 更新及官方 utilities 是否能替代现有协调代码。本补充记录 2026-09-19 的专项调查，区分已经使用的能力、可简化的实现、运行时修复与暂不采用的功能；各项实施和原生验证记录由对应提案维护。

## Decision

本文维护版本调查、官方能力与采用边界，具体实施范围和验收交由主计划中的工作项维护。采用官方 API 的前提是减少实际维护成本，同时满足已有取消、缓存、配置和交互契约。

## Delivery ownership

| 调查结论                       | 实施提案                                                                                |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| 运行时基线与内存诊断           | [01 命令依赖隔离](2026-09-19-command-dependency-isolation.md)                           |
| 模型目录身份与 usePromise 评估 | [05 模型目录请求身份](../bug-fix/2026-09-19-model-catalog-request-identity.md)          |
| useForm 字段状态评估           | [06 Provider 表单字段](../../rejected/simplification/2026-09-19-provider-form-state.md) |
| 朗读与重查快捷键冲突           | [07 快捷键修复](../bug-fix/2026-09-19-query-audio-shortcuts.md)                         |
| 缓存与同步展示的采用边界       | [09 同步展示投影](2026-09-19-query-display-projection.md)                               |

Swift OCR、AI tools、help.md 与依赖升级仍是独立候选。本记录不另行管理上述工作项的代码验收进度。

## Review baseline

| 核对对象     | 2026-09-19 的证据                                                                                                                                          | 对计划的影响                                                                                          |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 已安装依赖   | [package-lock.json](../../../../package-lock.json) 与本地包一致：`@raycast/api 2.4.1`、`@raycast/utils 2.3.1`                                              | 新能力先核对当前 `.d.ts` 和实现，不能仅凭网页要求升级                                                 |
| API 更新记录 | [API changelog](https://developers.raycast.com/misc/changelog) 已列出 2.0.0、2.3.0；2.0 的 CLI 要求 Node.js ≥ 22.22.2                                      | [CI](../../../../.github/workflows/ci.yml) 已使用 22.22.2；本地包也声明这一最低版本                   |
| 桌面应用版本 | [macOS](https://www.raycast.com/changelog) 与 [Windows](https://www.raycast.com/changelog/windows) 页面均已列出 2026-09-14 的 v2.4；v2.3 发布于 2026-09-11 | 实测报告分别记录操作系统、`environment.raycastVersion`、API 包和 utils 包版本，不将四者当作一个版本号 |
| npm 发布状态 | 实施时 `npm view` 已成功读取官方 registry：API 2.4.1、utils 2.3.1，与本地安装一致                                                                          | 本轮无需新增依赖升级；后续升级仍需重新核对发布元数据和最终安装类型                                    |

本次读取了官方更新记录、生命周期、Manifest、Environment、Preferences、Cache、AI、Keyboard、List、内存诊断，以及 `usePromise`、`useCachedPromise`、`useCachedState`、`useLocalStorage`、`useForm`、`withCache` 文档，并对照本地包类型和相关实现；另查阅了官方 Swift 集成与 AI tools 指南。它是针对本项目的文档审查，不代表所有 API 已穷尽或功能已实测。表单 useForm 实际原型和对应采用边界已由独立 subagent 实施评估，再由主代理 review；其他能力按工作项验证。

## Recent changes and applicable decisions

### Runtime diagnostics and rendering

API 2.0 增加了内存诊断，2.3 改善了扩展视图更新的数据量与压缩。后者是运行时改进，不能从升级 npm 包直接推导效果，也不足以证明可以删除现有流式节流。[API 更新记录](https://developers.raycast.com/misc/changelog)

当前本地类型已有 [`captureMemorySnapshot(label)`](https://developers.raycast.com/api-reference/utilities#capturememorysnapshot)。在工作项 01 的诊断工作中，可在配置加载、收藏反序列化、结果聚合等边界加入少量检查点；不要对每个 token 调用。它只在开启 memory reporting 时记录堆统计，关闭时无操作，不返回堆数据，也不是完整 heap dump。官方说明的启用路径是内存不足错误页的 Reload with Memory Reporting，不能把未启用时的调用当作有效测量。

使用 [`environment.entryPointName`、`entryPointType`、`entryPointMode` 和 `raycastVersion`](https://developers.raycast.com/api-reference/environment) 标注诊断记录，保持简短的固定标签。这些入口字段已在当前类型中存在；`commandName`、`commandMode` 是旧别名，但项目源码没有使用它们，不需要安排迁移。bundle 体积、首个可见结果时间、流式流畅度与堆内存分别记录；同一运行时比较改动前后。

### Model loading and provider forms

[useForm](https://developers.raycast.com/utilities/react-hooks/useform) 提供 values、setValue、itemProps 和校验反馈，可评估用于当前 [AIProviderForm](../../../../src/features/provider-management/AIProviderForm.tsx) 的字段状态。这是已有工具的采用机会，并非本次新发布能力；工作项 06 已用原型核对双提交、条件字段及回退草稿，因未减少实际责任而不采用。

[usePromise](https://developers.raycast.com/utilities/react-hooks/usepromise) 提供 abortable、execute、onError 和 revalidate，本地 2.3.1 实现已有调用代次与卸载取消，但不提供按目录身份的焦点去重和成功加载记忆。工作项 05 已完成身份修复，因本地生命周期仍需保留而未采用；默认错误 Toast、旧 data 保留与业务错误处理也需在消费者处对照。

### Cache and streaming semantics

| 候选 API                                                                                                      | 已核对的语义                                                                                              | 本项目决策                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| [useCachedPromise](https://developers.raycast.com/utilities/react-hooks/usecachedpromise) / `useFetch`        | `useCachedPromise` 采用 stale-while-revalidate，命中后仍执行 Promise；`useFetch` 的本地实现建立在该机制上 | 不直接替换付费 AI 或翻译结果缓存，避免命中后额外请求；模型加载也无需叠加第二套持久缓存                                               |
| [withCache](https://developers.raycast.com/utilities/functions/withcache)                                     | 提供 `maxAge`、`validate`、`clearCache`；本地 2.3.1 有效命中直接返回，但在执行后写缓存，没有清空代次检查  | 可用于简单且无额外契约的昂贵读取；不能直接替换已有查询缓存。请求开始后清空，仍可能被包装函数写回                                     |
| [useCachedState](https://developers.raycast.com/utilities/react-hooks/usecachedstate) 的 `cacheWriteDebounce` | 文档与当前类型支持延迟写入 Cache                                                                          | 当前查询只缓存最终结果，并非每个流片段都落盘，因此没有直接收益；不把 profile 密钥或收藏迁到可淘汰的 Cache                            |
| [useLocalStorage](https://developers.raycast.com/utilities/react-hooks/uselocalstorage)                       | 当前类型仍是 `setValue(value)`，不接受函数式 updater                                                      | [收藏 hook](../../../../src/features/favorites/useFavoriteWords.ts) 的最新值读取不能仅因“新版 API”而删除；这也没有提供跨命令原子事务 |

查询 Provider 继续使用 [`AI.ask`](https://developers.raycast.com/api-reference/ai) 的 Promise 与流事件适配统一协议。`useAI` 的本地签名属于 React hook，不能直接放入 Provider 类，也不替代多服务取消、单服务重生成和缓存清空保护。保留现有请求编排，避免同一答案同时由 hook 与引擎维护两份状态。

### Shortcuts and native behavior

Raycast 2.0 调整了部分 Common 快捷键；当前官方 [Keyboard 表](https://developers.raycast.com/api-reference/keyboard) 中 Pin 为 macOS `⌘.` / Windows `Ctrl+.`，MoveUp/MoveDown 为 `⌘⌥↑↓` / `Ctrl+Alt+↑↓`。收藏和管理页已经使用 Common，无需重写为硬编码组合；文档和原生验收应以目标运行时实际显示为准。

[工作项 07](../bug-fix/2026-09-19-query-audio-shortcuts.md) 维护 Read Query Text 与 Common.Refresh 的声明冲突、原生复现和修复验收；本记录不再复制具体修复进度。

[List.throttle](https://developers.raycast.com/api-reference/user-interface/list) 仅说明搜索事件会延迟，没有提供 [useDebouncedQuery](../../../../src/features/search/useDebouncedQuery.ts) 当前的 600 ms 可取消调度契约。不能直接删除该 hook 或叠加两层延迟。桌面 v2.1 修复子页面 Escape 导航，v2.2 修复图标 tooltip、表单信息等显示；这些应加入原生回归场景，不能据此认定项目的 `listEpoch` 与选择锚点已无必要。[macOS 更新记录](https://www.raycast.com/changelog)

Windows v2.4 修复了 Cache namespace 含非法目录字符时写入失败的问题。当前项目使用的 `query-results`、`ai-provider-models`、`stroke-order-v1` 等固定 namespace 均没有该问题；后续继续使用稳定名称，不把 endpoint 或 `profile:<id>` 原样用作目录 namespace。[Windows 更新记录](https://www.raycast.com/changelog/windows)

### Opportunities outside the main refactor

**Swift OCR 集成是值得单独验证的简化。** 目前 [构建脚本](../../../../scripts/build-swift.mjs) 手动构建双架构二进制并放入 assets，[OCR 命令](../../../../src/ocr.tsx) 再执行 chmod 与子进程。官方 [extensions-swift-tools](https://github.com/raycast/extensions-swift-tools) 提供 `@raycast` 函数、生成的 TS 接口与 CLI 集成，有机会减少这些胶水代码。迁移需要改写目前的 `main.swift` 入口，并核验 Xcode/Swift 工具链要求、分发、截图权限、取消行为和两种 Mac 架构；没有证明这些条件前保持现状。CLI 1.104.6 已补跨平台跳过原生编译时的类型与 loader 生成，但 Windows 构建通过不等于 Windows 能运行 Swift OCR。[API 更新记录](https://developers.raycast.com/misc/changelog)

**`help.md` 有明确适用范围。** [Preferences 文档](https://developers.raycast.com/api-reference/preferences#help-for-required-preferences) 说明它只显示在缺少必填 Preferences 的设置流程。当前必填项都有默认值，动态 AI profiles 在自有表单中管理；优先改善该表单的字段说明，不假设增加 `help.md` 就能解决 AI 配置引导。

**Raycast AI 新模型与 BYOAI 不构成删除自有 profiles 的依据。** 当前 [模型目录](../../../../src/features/provider-management/modelCatalog.ts) 已读取并去重 `AI.Model`，两类 Raycast Provider 也已有访问检查及 signal。公开 AI API 没有在已核对文档中提供本扩展可依赖的“枚举用户自定义端点与凭据”契约；桌面 AI 的自定义模型功能不能自动视为 Extension API 的同等能力。继续保留两类适配器和现有默认模型。2.3 的数值 creativity 修复对当前传入 `"none"` 的代码没有直接修改需求。[AI API](https://developers.raycast.com/api-reference/ai)、[API 更新记录](https://developers.raycast.com/misc/changelog)

**AI tools 是后续产品能力。** 官方 [AI Extension 指南](https://developers.raycast.com/ai/create-an-ai-extension) 允许增加独立 tool 入口。完成无 UI 的 Provider 和查询边界后，可再考虑词典查询、翻译或收藏检索工具；本轮不提前增加工具框架、入口或后台任务。

**已有官方工具继续使用。** 图标已使用 `getFavicon`，Windows 播放已使用 `runPowerShellScript`，配置加载和笔顺页已使用 `usePromise`。Node 全局 fetch 虽已可用，[timedFetch](../../../../src/shared/http.ts) 与 [错误处理](../../../../src/shared/errors.ts) 仍依赖 ofetch 的超时、响应与错误语义；移除它不等于删除一层 polyfill，需另有收益证据。本次不更换网络栈或添加代理层。

## Alternatives considered

**仅将依赖更新到 latest。** npm 包版本与桌面运行时不同，类型升级不会自动获得宿主的渲染和 AI 修复。先记录版本和验证能力，必要的依赖升级独立交付。

**全部异步状态与缓存改用官方 hooks。** 它们可减少表单模型加载的通用协调代码，但 SWR、函数缓存和 Provider 流式引擎的契约不同。保留重要不变量，只替换语义匹配的边界。

**把所有新能力加入同一轮重构。** Swift、AI tools 和配置引导各有独立收益与验证成本，不应阻挡已经证实的命令依赖解耦。

## Acceptance criteria

- [x] 实施时核对涉及能力的官方文档、已安装类型和目标宿主版本，更新有变化的调查结论；已成功核对 npm 当前发布版本。
- [x] 采用建议有明确对应的工作项和验收归属，不在本文重复维护代码交付状态。
- [x] 未采用的能力保留具体理由，候选范围没有自动成为主线前置条件；新能力需单独提案。

## Risks

**版本与文档可能不同步。** 同时保留审查日期、官方链接和本地类型证据；本次已核对 npm 当前版本与 macOS 本机 Info.plist 2.4.1.0；Windows 本机验证仍缺失。

**官方封装也可能改变行为。** 默认重验证、错误 Toast、上一次 data 保留和缓存写入时机都需对照真实消费者；减少行数不是唯一验收标准。

**性能改善可能来自宿主升级。** 在同一桌面版本进行前后对照，再记录新版宿主的单独结果，避免把两种收益归到代码重构。

**原生简化可能提高构建成本。** Swift 集成减少手写调用层，却引入宏、插件及工具链要求，先验证全流程净收益。

## Implementation review

2026-09-19 继续实施时重读官方 API changelog、Keyboard、useForm 和 usePromise，并核对安装版类型与实现。官方 API changelog 最高条目仍为 2.3.0，不能用该页面条目代替 npm 发布版本。05 保留显式模型生命周期并修正目录身份，06 经可编译原型对照后拒绝 useForm，07 消除明确的快捷键声明冲突。withCache 2.3.1 仍在 await fn 后无代次检查地写缓存；useLocalStorage 仍只接受值式 setValue；因此相关保留决策不变。
