# Agent Note: 第二轮重构计划二 — 内容模型、展示与持久化

Status: implemented

## Problem

重构前，公共结果类型同时携带 Provider payload、查询内容、运行服务元数据与列表字段；旧 `core/query/displaySections.ts` 为每个翻译服务重复构建整份比较 Markdown；收藏构造再将这些界面字段写入持久化快照。校验器因此需要承诺一套复杂且职责混杂的对象形状。

本计划已在 [计划一：查询运行时与可信类型边界](2026-09-19-query-runtime-and-type-boundaries.md) 完成后按 B0–B6 交付。它使用计划一的 Runner、可执行配置、语言类型和旧格式 decoder，替换内容与持久化模型；不重新设计请求所有权、配置迁移或整个目录结构。

## Decision

已建立 ProviderContent → ComposedContent → Raycast ViewModel / Markdown / FavoriteSnapshot 的数据流。Provider 私有 decoder 从外部响应构造单服务内容，纯组合函数负责隐藏、补充与顺序；UI 按实际需要生成展示，缓存保存单服务内容，收藏保存收藏时已经组合好的内容。旧 payload 泛型、无消费者字段和重复转换随对应切换退役。

## Entry conditions and evidence

开始时以计划一验收提交和四命令正式产物为比较基线，核对 Runner snapshot、语言/配置类型及旧格式 decoder 的最终接口。计划一尚未通过时，只能并行调查协议 fixtures、旧收藏和设计取舍，不提前合入新的写入格式。

| 实施前证据                                                                                                                               | 重构方向                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| ListDisplayItem.key 的唯一生产读取是缓存字段检查，实际 UI ID 来自 [displayIdentities](../../../../src/core/query/displayIdentities.ts) | 删除内容 key 及各 formatter 的生成分支，保留真正的列表身份          |
| QueryResult 通过 spread 保留 result，缓存整体 JSON 序列化；翻译、Youdao、Linguee UI 不消费它                                           | Provider 私有解析完成后只输出标准内容，缓存及状态不保存原始 payload |
| [AIProviderForm](../../../../src/features/provider-management/AIProviderForm.tsx) 的词典连接测试读取 result.result.translation         | 先改为消费标准内容中的翻译，再退役公共 result 泛型                  |
| 每个翻译条目带一份“当前服务优先”的全量比较 Markdown                                                                                    | 按选中项生成比较详情，列表只派生轻量数据                            |
| 收藏保存翻译 detailsMarkdown，但 旧 `resultItemBody` 对翻译只读 copyText                  | 新快照保存内容，不保存重复比较正文                                  |
| 网络泛型与 JSON.parse 后的断言只提供静态声明                                                                                           | 外部响应按实际消费字段解码；不扩展为完整厂商响应校验框架            |

这些证据来自 `04bc185` 的调查，实施时需重新确认调用方。缓存与收藏解码缺口由计划一先补齐；本计划替换为更小的内容 schema，不重新复制旧格式 reader。

## Target data flow

```text
外部响应 / LLM JSON
  → Provider 私有解析与规范化
  → ProviderContent ─────────────────────→ QueryCache
  → QueryRunner 的服务结果
  → composeContent（保留输入顺序、隐藏、补充）
      ├─ 轻量 Raycast ViewModel
      ├─ 当前选中项的 Markdown
      └─ FavoriteSnapshot（收藏时的组合内容与服务元数据）

旧收藏 → favorites/legacyDisplay + legacy → 独立 saved legacy 内容
旧结果缓存 → cache miss（检测/词语证据版本保持不变）
```

协议字段、语义内容、请求状态、显示名和持久化版本分别表达。内容使用 kind 等语义判别值，Provider 身份不再承担判断 translation/dictionary 的职责；服务身份与排序使用计划一的运行配置。内部接口和只读数组防止意外修改 snapshot，不为此加入全树运行时 freeze 或到处 deep clone。

## Content model

ProviderContent 表达翻译或词典内容及查询词语信息。词典先覆盖已有的真实语义：翻译、释义、词形/词组对、例句和复杂正文。复杂有道现代汉语及 AI 正文可以保留窄范围 Markdown block，保留安全转义与现有内容表现；不建立通用富文本 AST、任意嵌套属性、插件 renderer 或 visitor 框架。

内容不携带 React key、Raycast accessory 对象、fromCache、排版后的 sectionTitle 或聚合比较 Markdown。词语、音标、考试类型、发音 URL 属于内容；缓存来源和当前服务请求属于运行时；服务标签、图标与顺序作为独立元数据。title、subtitle、copyText 仅在具有真实语义差异时由内容产生，不将旧 ListDisplayItem 全字段改名搬入新模型。

Provider 内部允许保留必要的解析中间模型；对外只暴露消费得到的内容。两阶段 parse/normalize 如果分别承担外部解码与内容规则，可以保留。移除未消费字段时同时删除对应 DOM 读取、类型和夹具，而不是只在最终对象末尾丢弃。优先检查 Linguee wordItem.title/featured、解释项 audioUrl、百科 source/sourceUrl 和有道未消费的响应类型树；词头 audioUrl 会用于朗读，不能误删。

有道、Bing、彩云及其他直接使用 timedFetch<T> 或 JSON.parse 断言的入口需按实际使用字段解码，字段错误转为明确协议错误；无需声明或校验整个厂商响应。保留 Google RPC 解析、AI 可选字段降级、流式协议、native JSON fallback、重试和取消的已验证契约。Base Provider 的计时、取消与错误规范化可保留；是否用类不作为本计划额外目标。

## Composition and rendering

composeContent 是无副作用的内容组合，保留 DeepL 补充 Linguee、Youdao 翻译补充词典、音标/考试类型回退和隐藏源语义。未变化的 ProviderContent 不因其他服务更新被污染；缓存 replay 与实时结果走同一组合入口。首个 section 为空、非 Translation 的首项以及多个同类 AI profiles 都按现有消费者场景验收。

可见性与轻量列表字段不依赖生成所有详情 Markdown。适配层先得到完整且稳定的行身份，再按当前选中项生成详情，保留“当前服务排在比较表首位”和不同语言方向标注。Action.Push 的单项详情、列表右侧详情与收藏整页是三个真实渲染上下文，共享正文能力，但不相互存储完整页面字符串。

原生 Raycast 可能读取选择项之外的数据，因此先用安装类型和实际宿主验证按需详情接线；若不能稳定支持，只缩减重复的翻译 descriptor/join 与无用正文计算，并记录限制，不能破坏原生详情切换。最终方案不引入无上限 memo、全局 Markdown 缓存或双份可写展示状态。

排序属于服务集合和组合输出；流片段更新同服务内容不必反复 decorate/sort/undecorate。先明确同 order 的稳定规则及重新生成后的配置顺序，再用最简单的稳定排序或原位置替换实现。更新项在相同 order 下的旧移动行为必须显式评估，不能把改变该行为称为机械等价优化。

## Persistence and compatibility

| 保存位置 | 新格式职责                                                             | 兼容与错误处理                                                                                         |
| -------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 查询缓存 | 带版本的单服务 ProviderContent、到期时间与必要缓存身份                 | 旧 decoder 转换可明确支持的数据；其余成为 cache miss；清空代次、AI/普通策略、TTL 与 word evidence 保留 |
| 收藏     | 带版本的 ComposedContent、收藏时服务标签/图标/顺序、词语方向和创建时间 | 旧快照 reader 转为内容，继续离线读取；无效或未来版本保留原存储，阻止破坏性写入                         |
| 配置     | 使用计划一的既有保存配置格式                                           | 不将解析后的 URL 对象、AI.Model 运行值或宿主能力写回配置                                               |

收藏不随当前 Provider 开关、排序或配置重新组合，也不为展示旧收藏重新请求网络。新快照不保存重复翻译比较 Markdown 和缓存来源；词典真正的正文不能统一删掉。preview 可从快照内容派生，只有实测需要时再保存独立派生字段，并记录一致性责任。

新收藏写入采用独立版本的存储 key，保留旧 key 原文作为旧客户端和恢复入口，避免旧版本把新 envelope 当数组读取。没有新 key 时可在内存读取/转换旧数据；经明确的新版本用户写入才创建新 key。首次用户修改必须保存“完整转换后的旧集合加本次修改”，不能只写本次新增项。新 key 存在后以它为唯一事实源，不在每次启动重新合并旧 key，避免删除词条复活。删除最后一项或清空时写入合法的空 envelope，不能删除新 key 后再次回退旧集合。写入失败保留旧持久化内容，并恢复或保留失败前的内存视图，不能让 UI 假定切换已经成功。新 key 为未知/损坏版本时显示恢复状态，不静默回退旧数据再覆盖。损坏的新快照可由用户显式选择恢复合法旧快照或有效备份；必须先成功备份损坏原文，再写入完整的新 envelope，备份或写入失败不删除原数据。未知未来版本仅提供只读说明和原文导出，要求兼容版本读取，不自动或按损坏流程降级。

每次修改经收藏 repository 重新确认当前事实源，将新增、删除或清空操作应用到最新解码集合，不能用页面启动时读到的旧数组直接覆盖另一入口刚创建的新快照。用实例内队列处理本实例的重叠修改；这不构成跨命令原子事务，不宣称解决所有并发写入，也不预先引入跨进程锁框架。

旧客户端只会看到旧快照，后续在旧客户端产生的修改不自动双向同步到新版本；新版本后续写入也不回写旧格式。此回退语义须在用户文档说明。整个切换不批量清理旧 key，不引入跨格式双写和后台迁移队列；如果实际产品要求跨版本双向同步，应单独确定范围，不能隐式附加。

旧枚举值、旧 AI 标题、Linguee 占位与缺省 translations 等兼容只存在于旧 reader/转换器；新内容消费端不继续携带它们。删除公共旧枚举前，核对网页动作、profile 迁移、缓存 key 与排序消费者，不能把 DictionaryType.Eudic 等非查询用途直接当死代码。

## Delivery sequence and parallel work

| 批次 | 交付                                                                                   | 前置与并行边界                                                            |
| ---- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| B0   | 计划一交接、新内容与快照 schema、行为 fixtures、缓存/收藏版本与回退说明                | 必须先完成；复用计划一的 schema 工具选择，不另选一套框架                  |
| B1   | 翻译和 AI 词典输出 ProviderContent，AI 表单连接测试读取内容；公共结果 payload 开始退役 | B0 后；可与 B2 分工，公共契约只由一个所有者维护                           |
| B2   | Youdao/Linguee 解码与内容转换，裁剪无消费者字段和类型                                  | B0 后；各 Provider 可独立 agent，实现按冻结契约交付                       |
| B3   | Runner 结果类型切换、缓存新 codec、纯内容组合                                          | B1/B2 达到最小完整集合后集成；不得让同一 session 混用未声明的两种结果模型 |
| B4   | 轻量列表、按需详情、动作与原生 identity 接线，剥离无效 key                             | B3 后最终合入；B0 后可独立原型，宿主效果实测后决定最终实现                |
| B5   | 收藏新快照 reader/writer、旧数据转换、预览/导出/音频/笔顺消费者切换                    | B3 的组合契约稳定后；可与 B4 并行，公共 renderer 修改串行集成             |
| B6   | 删除运行时旧模型、临时桥接与冗余测试，保留旧存储 reader；评估更严格编译选项并组合验收  | B1–B5 完成后；同步 AGENTS、开发文档及必要用户说明                         |

B1–B5 每笔合入保持可运行。B1/B2 可使用一个局部旧结果适配器；B3 切换后，由 B3 集成人员拥有单一 ComposedContent → 旧视图/旧收藏输入桥接，供尚未切换的搜索、动作和收藏消费者使用。B4/B5 分别移除各自依赖，B6 前删除全部运行时桥接。也可将 B3–B5 的全部必要消费者作为一次生产切换交付，不能合入断开的调用链。B5 的新 reader、恢复能力和全部收藏消费者就绪前，过渡版本继续按旧格式写入，不提前创建新 key。持久化旧 reader、最小 legacy 类型及其内容转换器是长期生产消费者，不属于必须删除的过渡代码。并行 worktree 由主代理 review 后集成，随后执行 [find-code-simplifications](../../../../.agents/skills/find-code-simplifications/SKILL.md)、必要修正、检查和提交。

## Test retirement and verification

按真实内容边界迁移覆盖：Provider 测试验证外部响应到标准内容；组合测试验证规则和无突变；renderer 测试验证复制文本、正文和转义；snapshot 测试验证序列化与旧数据读取；Runner 保留生命周期测试。ListDisplayItem.key、原始 payload 透传、已删除 reducer/helper、同构中间对象和无消费者 fixture 的断言随实现退役。实际列表 ID 与选择锚点测试保留，不能误用旧 key 测试代替。

删除测试前记录“旧场景 → 真实保护行为 → 新入口或退役理由”。关键回归通过故障注入或前后失败证明覆盖，避免比较两个都调用同一被测 formatter 的结果。缓存和收藏分别测试：旧格式、合法新格式、损坏可选字段、错误 kind、未知版本、JSON round-trip、无损错误保留及写入后重开。收藏还覆盖首次修改保留完整旧集合、旧页面存续时另一入口创建新 key 后再修改不会覆盖新集合、删除最后一项/清空后重开不复活、备份或写入失败恢复、多个长翻译、混合词典、不同语言方向、复制/导出/TTS/笔顺输入和旧客户端可见性。

每批完成 npm run lint、npm test、npm run build、git diff --check。四命令分别检查正式 bundle/source map：收藏可以依赖轻量内容 reader/renderer，但不得因此导入 Provider 网络实现、检测器或执行注册表；管理只保留配置与连接测试必需能力；OCR 继续通过命令参数启动查询。

记录典型词、长文本、多服务流式查询、较大收藏集合的投影/Markdown 调用次数、耗时及序列化字节。新方案与计划一基线使用同一输入和运行时比较，不用代码行数或 bundle 大小推导启动/内存收益；只有发现实际瓶颈才增加 memo 或增量索引。原生验证覆盖选择切换、当前服务优先、首次结果、详情导航、收藏离线展示和既有快捷键，分别报告 macOS/Windows 可用环境与缺口。

模型稳定后分别试验 noUncheckedIndexedAccess、exactOptionalPropertyTypes，以真实存在性与缺省语义解决诊断；不批量添加非空断言、as 或无意义 fallback。能以合理改动完成时按选项独立提交；成本仍主要位于本轮无关区域时记录剩余范围，不为开启 flag 阻挡功能交付。生成的 Preferences/Arguments 继续作为 manifest 契约，不重定义或添加 manifest 保证字段的猜测默认值。

## Alternatives considered

**厂商 payload union 一直传到 UI。** 虽减少适配器表面转换，却让协议变化传播到组合、收藏和渲染；采用 Provider 私有模型加语义内容边界。

**把 ListDisplayItem 改名为 Content。** 如果仍含 key、cache 标记和整页 Markdown，就没有减少职责，验收要求这些字段按所有权退出。

**所有内容统一成 Markdown。** 会损失列表、复制、TTS、笔顺、组合和收藏预览需要的语义结构；复杂正文保留窄出口，其余保留语义。

**立即重写所有旧收藏。** 放大失败恢复与回退风险；采用旧 reader、内存转换、独立新 key，并明确两个版本不双向同步。

**先引入通用 schema/AST/缓存框架。** 需要维护额外 DSL、失效和适配，先使用已确定的边界与真实字段，只接受有净删除证据的工具。

## Acceptance criteria

- [x] 计划一已验收并提供稳定接口和基线；计划二的契约、兼容及回退语义有明确记录。
- [x] ProviderContent、ComposedContent、运行时 entry、ViewModel、FavoriteSnapshot 职责分开；内容使用语义判别，外部 payload 留在 Provider 内。
- [x] 所有本轮消费的外部字段经真实 decoder 处理，字段错误、可选降级和联合分支有行为测试；AI 表单不再依赖 result.result.translation。
- [x] 公共 result 泛型、无消费者 key、废弃协议字段及临时适配器已退役，仍有真实存储/网页/排序用途的旧值只留在明确边界。
- [x] 组合不修改单服务结果，隐藏与补充、metadata 回退、不同到达顺序和缓存重放等价；显示与收藏不依赖整份旧 UI 对象透传。
- [x] 详情生成与列表可见性分离，当前服务优先、语言方向、列表 identity、流式选择和单项详情保持；按需方案的宿主限制如实记录。
- [x] 缓存保存单服务内容，收藏保存当时组合内容；旧快照离线可读，未知/坏数据可恢复，新旧 key 单向切换不会导致删除复活或旧数据被覆盖。
- [x] 复制、导出、音频与笔顺的真实消费者通过新内容模型工作；持久化字段与重复 Markdown 的减少有字节测量。
- [x] 冗余测试随旧实现退役，协议、生命周期、存储恢复和跨平台覆盖保留；更严格编译选项的采用或暂缓有实际诊断依据。
- [x] 每批 review、find-code-simplifications、代码检查与提交完成；四命令依赖、性能对照、原生验收及用户文档同步完成或明确列出环境缺口。

## Consequences

**语义模型过度泛化。** 过于通用的 block AST 会比现有 formatter 更难维护；只覆盖现有产品消费，复杂正文允许有限例外。

**内容损失与格式回归。** title、copyText、正文和发音地址并非总能互相推导；通过实际消费者对照，不以字段名称相似为删除依据。

**持久化回退误解。** 保留旧 key 只提供旧快照与恢复入口，不代表两个客户端同步；新版本保存前后的行为需清楚说明并验证。

**按需渲染引发原生选择差异。** 需要在实际宿主验证，详情计算不能反过来改变行 identity 或首个可见结果的挂载时机。

**公共 schema 带回重依赖。** decoder、内容类型和 renderer 使用明确文件入口与 type-only import，逐命令检查实际出码来源。

## Preparation log

计划一已完成 A1–A6；快捷键修正合入历史后，本计划实施基线为 `2db10eb`，计划一历史产物仍以当时的 `a7c133e` 标识。原生验证范围和人工快捷键结果见计划一验收记录。B1/B2 的只读协议与消费者调查已经完成，开始 B0 契约及行为基线实施。

B0 采用单一语义内容作为事实源。B1/B2 通过同一个局部 adapter 从内容派生旧 `translations`/`displaySections`，不并行维护旧 formatter 和新 builder 两套事实。B3 明确切断旧入站模型：Runner/cache 仅接收带 `content` 的结果，旧 UI 只通过出站适配继续运行；B4/B5 依次切换消费端，B6 删除运行时桥接。持久化旧 reader 和 legacy 内容转换仍保留。B3 同时切换 Provider base 的计时、Runner 的流式中间内容/空值/音频、缓存的 TTL/word evidence 与表单测试；结果缓存的内容版本独立于检测和词语证据版本，旧结果在边界明确 miss 或转换。legacy 分支只允许收藏转换和 saved-content decoder，新的 Provider 与 query cache 不接收。新收藏 key 仅在 reader、恢复界面和全部消费者都就绪的 B5 开始写入。独立审查认为这一切换方式比一次同时替换 B3–B5 更便于定位行为差异。

内容契约草案只保留已有真实语义：翻译 paragraphs；词典 translation、equivalents、definitions（plain/structured）、form-set、pairs、examples、summary 与复杂 chinese-entry。词头、词性、频率、例句、音标与发音地址保持语义字段；普通新结果不保存 key、accessory、cache 来源、排版 sectionTitle 或整页比较 Markdown。旧收藏不可反解的格式化正文保留在专属 legacy 分支，不能用于新 Provider 的通用出口。Linguee 和 Youdao 的有限来源布局差异可由外层元数据选择，不建立通用布局 DSL。正式类型定义前还要用真实消费对照裁剪这些变体。

组合采用有限 `primarySupplement` 保存已计算的 translation/phonetic/examTypes，作用仍为首 section 的首项，不跨越空首 section，不要求原首项一定是翻译。Provider 原内容不修改，收藏保存当时的组合决定。Youdao 单/多词形均为一个汇总复制单位，AI 词形为逐项；Linguee featured/unfeatured、最后项的词性与频率、词头标点、首例译文和两处 DOM 节点移除均有实际语义，不能按字段相似合并。

B1 fixtures 清单覆盖各翻译 Provider 的实际消费字段与协议错误，包括 Bing 配置/首项 translations、彩云 target、Youdao 解密后的 tgt 数组及 DeepLX 无效到期时间/cookie。现有 translation raw payload、`StreamChunk.role`、`TranslationItem` 没有运行消费者；AI 表单的 `result.result.translation` 是必须先切换的真实例外。

B2 fixtures 清单覆盖 Youdao ec/ce 及共存、newhh 分类/递归/例句、首项 web translation 匹配、百科单独返回和畸形叶子；Linguee 直接使用 HTML 覆盖 featured 移除、placeholder、频率/词形、词头音频、examples/related/wiki 和未知语言。当前 Youdao 专属解析只有 ec/ce，其他支持请求的语言不能被误记为已有完整词典协议。保持真正消费的字段校验，不把约千行未消费厂商类型树迁移成另一份完整 schema。

调查原文保存在 `/tmp/easydict-b1-translation-boundary-inventory.md`、`/tmp/easydict-b2-decoder-audit.md` 与 `/tmp/easydict-b0-content-contract-review.md`；关键决策在本段与正式计划中保留，后续实施不依赖临时文件长期存在。

## B0 contract

新内容类型位于 [core/content/types.ts](../../../../src/core/content/types.ts)。翻译保留原有 paragraphs 及各服务的换行策略；词典只保留 translation、equivalents、definitions、pairs、form-set、examples、summary、chinese-entry 八类语义。服务身份、显示元数据、缓存来源和请求状态位于外层。Provider 输出的 query 使用既有 QueryWordInfo，避免同时维护两个词语协议；内容及组合按不可变值使用，不增加运行时 freeze。

过渡期间仅允许 content → 旧结果/视图的单向适配。每个 Provider 的新 builder 代替旧 formatter，旧 formatter 不成为新 builder 的输入；真实协议类型留在 Provider 私有边界。公共 result payload 与生成 key 在对应消费者切换时删除。最终结果与流片段仍保留原有 async generator 协议，B1 只删除无人消费的 chunk.role，不在同批重写流式生命周期。

新鲜结构化 AI 字段按纯文本转义后渲染；复制与朗读仍使用原始纯文本。现代汉语递归正文是唯一新鲜 Markdown 出口；旧收藏不可逆的历史正文由保存内容的独立 legacy 分支承接，不允许新 Provider 或查询缓存产生该分支。词形分组、Linguee 频率/标点、空首节不补下一节、补充作用于非 Translation 首项均保持行为基线。Tencent 缺少 TargetText 时继续按空结果处理，类型重构不额外改变此策略；存在但非字符串的 TargetText 属于协议错误。

有道首个可用 newhh.pinyin 仅作为主译文的 pronunciation 回退，即使该拼音项没有 sense 也保留；不提升到 query.phonetic，避免改变 Youdao → Linguee 的跨服务音标补充。正式类型中的 translation.pronunciation 只表达这种词条级差异，不作为所有服务重复保存 query 音标的字段。

primarySupplement 的 phonetic 或非空 examTypes 任一存在时，两字段成对替换首行旧值，包括清除缺失的另一字段；不逐字段做空值回退。首节为空时仍不跨节补充。现有 displaySections 行为测试在 B3 迁移到组合/展示真实入口。

结果缓存内容版本在 B3 升为 2，并独立于现有版本 1 的检测/词语证据缓存；不转换旧结果缓存，旧格式成为 miss。命中策略、TTL、word evidence、清空代次与 AI 服务身份判定保持。B0–B2 不写新格式，缓存读取仍由现有 decoder 负责。

收藏在 B5 完成全部 reader/writer/恢复/UI 消费者切换后才写入 `favorite-content-v1`，值为 `{version: 1, favorites: [...]}`。每个收藏保存 `{query, services, createdAt}`；每个 service 保存 Provider 身份、收藏时 serviceId/label/order/icon、内容及已计算的 primarySupplement，排除请求状态、fromCache 和聚合比较 Markdown。旧 key `favorite-words` 保持原文。无新 key 时只读转换旧全集；第一次明确修改保存完整转换集合加本次操作；空集合也写合法 envelope。新 key 存在后唯一权威，损坏不回退覆盖、未来版本只读、恢复先备份，失败不更新 UI 为成功。保存类型在 B5 与真实消费者一起落地，B0 不增加未接线的 repository 或第二套旧 decoder。

## Execution log

- B0：`b4afa03 refactor(content): define semantic contracts and behavior baselines`。冻结新鲜语义类型、缓存/收藏版本及单向桥接策略；新增有道 8 项可观察行为测试，用 Linguee 两个完整场景替换原弱断言，测试总数维持 3 项。独立 review 找到并补齐 pinyin-only 首译文回退与成对元数据替换约束；root review 与 find-code-simplifications 通过。lint、50 文件 / 389 项测试、build、diff check 全过。`/tmp/easydict-round2-evidence/plan2-baseline` 保存 `2db10eb` 四命令产物及 source map，每个仓库源码与安装产物逐项比对一致；B0 构建后四命令字节完全不变。

- B1：`406e4a7 refactor(providers): emit semantic translation and AI content`。翻译 Provider 与 AI 词典输出语义内容，通过单向 adapter 兼容旧消费端；移除翻译 raw payload 类型、无消费者 chunk.role 与 TranslationItem，AI 表单改读内容。未知协议字段按实际消费校验，保留错误优先级、段落、取消及 Bing/DeepLX 缓存规则；真实故障注入覆盖 17 项旧失败。独立 review、root review 与 find-code-simplifications 通过；lint、53 文件 / 424 项测试、build、diff check 全过。正式 bundle 为 Search 1,608,339 bytes / 112 modules、Favorites 434,535 / 29、Manage 226,983 / 43、OCR 7,680 / 2；Favorites 未引入 Provider 网络或检测依赖。桥接仅在 B3–B5 过渡期间存在。

- B2：`3dfdc0d refactor(dictionary): decode consumed fields into semantic content`。Youdao 仅解码真实消费字段，删除旧格式化链和约千行未消费协议类型；Linguee 直接由 HTML 生成语义内容，删除未消费 DOM 字段，保留词头音频与占位/featured 节点移除。旧阅读契约迁到真实 decoder→builder→临时 adapter，新增畸形叶子及空页面/未知语言场景。独立 review 找到 web 空槽位导致后来条目被提升的问题，两个先失败回归修复后通过；空音标回退同样先失败验证。root review、find-code-simplifications、lint、56 文件 / 454 项测试、build、diff check 通过。HTML fixture 格式化后显式保留协议相邻节点，聚焦 8 项再次通过。

B4 接线前复核安装的 `@raycast/api` 2.4.1 类型及 [List 官方文档](https://developers.raycast.com/api-reference/user-interface/list)：selectedItemId / onSelectionChange 提供受控选择，detail 仅展示选中项。按需计算仍需原生验证，不能仅据 React mock 宣称宿主正确。[官方 API changelog](https://developers.raycast.com/misc/changelog) 当前最新记录为 2.3.0，包含视图更新传输/内存优化；安装包已高于该文档版本。2.0 的 memory diagnostics 可用于实际 OOM 调查，本轮不因可用而加入无瓶颈证据的长期监控代码；快捷键保持已确认配置。

- B3：`5a91f0e refactor(query): carry semantic content through runtime and cache`。Provider/base/Runner/cache 统一 `{type,content}`，删除公共 payload 泛型与旧缓存 decoder；检测/词语证据维持 v1，结果缓存切 v2，旧结果 miss。composeContent 独占隐藏、阈值与跨服务补充；旧 UI 仅消费出站桥。Runner 以 snapshot 结果数组作为唯一结果集合，按服务 order 插入，保留同序到达/重生成移动，纯 loading 更新不重排或重投影。独立 review 找到缓存身份错配和同步订阅清空后的旧缓存回写，真实 Runner+cache 两项测试先失败后修复（`/tmp/easydict-b3-runner-before.log`）。review、find-code-simplifications、lint、58 文件 / 489 项测试、build、diff check 全过；新旧 decoder 复用基本字段校验，删去旧结果缓存专属测试和 6 项重复原子字段用例，实际 identity/生命周期契约保留。

B5 兼容补充：旧格式允许无 displaySections 但有显式 translations 的收藏，无法把其优先预览挂在并不存在的首服务上。新 FavoriteSnapshot 因此允许窄 `legacyPreview?: readonly string[]`，由旧转换计算最终旧预览（显式 translations 优先，再按旧正文回退）并由新 reader 保留；fresh builder 不保存 preview。此字段保护已有无正文收藏的复制/列表行为，不制造虚构服务。

- B4：`46dc2f8 refactor(search): derive lightweight rows and render selected details`。列表只生成轻量字段；选中项才构建比较/正文，Action.Push 挂载时构建单项详情；公共视图接入动作、图标和真实列表 identity，移除对旧 key/displayType 的依赖。Provider 阅读契约迁入新 renderer；旧收藏写入暂保单一出站桥。root review、独立 review、find-code-simplifications、lint、60 文件 / 510 项测试、build、diff check 通过。原生 macOS 验证 hello 首结果/单项页/返回、长段落六服务右侧比较、Down 切换当前服务优先、清空后详情清空；动作顺序及快捷键未改。Windows 宿主不可用，不宣称已原生验证。

- B5：`7fa0148 refactor(favorites): persist semantic snapshots with safe legacy recovery`。收藏保存组合后语义内容与服务元数据，旧 display 快照经独立 legacy 分支转换；只保留不可逆正文和旧预览，不保存比较整页、缓存标记或 key。新 key 首次明确修改保存完整旧集合，旧 key 原文保留；新 key 存在即唯一权威，空集合不回退，未知版本只读，恢复先备份并重选 key+raw 防止覆盖期间的新写入。真实旧机器/词典混合分组丢正文回归先失败后修复（`/tmp/easydict-b5-mixed-group-before.log`），另有预览/非连续分组标题/三条迁移红绿证据。全部复制、音频、笔顺、恢复及搜索收藏消费者切换，收藏页仅为选中项生成正文。root review、交叉独立 review、find-code-simplifications、lint、63 文件 / 545 项测试、build、diff check 全过。原生首次读取 5 条旧收藏、切换详情、新增 hello 后 6 条含原全集、从独立命令重开、移除测试条后恢复原 5 条均通过；没有清空或修改原有词条。

## Final verification

独立试验更严格的 TypeScript 选项：`noUncheckedIndexedAccess` 共 300 条诊断（生产 30、测试 270），`exactOptionalPropertyTypes` 共 132 条（生产 123、测试 9）。范围横跨音频、Provider、配置、查询及收藏；`primarySupplement` 的成对清空确实需要显式 undefined，不能通过机械省略字段改变语义。本轮暂缓启用两个选项，未用批量断言或空值 fallback 消除诊断；当前既有严格配置与正式 build 类型检查通过。诊断保存在 `/tmp/easydict-plan2-final-indexed-access.log` 和 `/tmp/easydict-plan2-final-exact-optional.log`。

正式构建 source map 的每个仓库源码逐项比对当前实现一致；产物在 `/tmp/easydict-round2-evidence/plan2-final`。以下仅为独立命令打包体积，不推导启动速度或运行时内存。

| 命令 | 计划一基线 bytes / modules | 最终 bytes / modules | 字节变化 |
| --- | --- | --- | --- |
| Search Word | 1,602,415 / 108 | 1,614,377 / 116 | +11,962（+0.75%） |
| Favorite Words | 434,535 / 28 | 451,303 / 36 | +16,768（+3.86%） |
| Manage Providers | 222,881 / 40 | 221,761 / 40 | −1,120（−0.50%） |
| OCR | 7,680 / 2 | 7,680 / 2 | 0 |

收藏的新 codec 和兼容读取增加了打包代码；source map 确认 Favorites 没有 Provider 网络实现、检测器或执行注册表，管理只保留配置、模型发现和连接测试所需 AI Provider，OCR 仍只有入口与日志。每命令独立打包的边界保持，本轮不以共享目录数量冒充运行时去重。

原生 macOS / Raycast 2.4.1 验证已覆盖首次查询、按需单项详情、六服务长段落比较、选中项置顶、清空详情、旧收藏读取与切换、新收藏首次保存全集、独立命令重开、移除本次测试条以及最终构建重开不复活；最后由收藏的 Open in Easydict 成功启动 canons 实时查询。原 5 条收藏保持，测试 hello 已移除。动作顺序和既有快捷键源码保持；不再通过 CUA 合成 modifier 组合，此前用户人工确认 Cmd+M 正常，Read Query 保持 Cmd/Ctrl+R。Windows 无原生宿主，实际扬声器输出、破坏性损坏注入和 OCR 本轮未重跑；跨平台路径、音频/笔顺输入与恢复失败路径由自动化测试保护，不能据此宣称 Windows 原生验收。

测试退休映射：旧 displaySections 套件由 compose/view/render 真实入口承接；旧 resultMarkdown 套件由新 renderer 和 legacy 保存读取承接，并补短词 SVG 转义、长词回退、空段落、首行补充前缀/空 subtitle。旧 results/decode 套件迁入 favorites/legacyDisplay，经真实旧收藏 reader 验证兼容与拒绝，不再断言中间 DTO 原样 round-trip。旧缓存 layout 拒绝用例改为合法语义 section 缓存回放的先失败后通过回归。真实列表 identity、生命周期、协议字段、旧收藏恢复和跨平台测试保留。

## Performance evidence

对照脚本、冻结源码/hash、计数与时序原始 JSON 保存在 `/tmp/easydict-round2-evidence/content-performance/`，基线为 `2db10eb`，新实现对应 B6。Node 24.14.0 / Apple M1，5 次 warmup batch、31 次交错 old/new batch，计时与 AST 插桩计数使用不同构建；p50/p95 是批次均值的分位数。典型词来自现有合成 Linguee HTML fixture 经真实两版 parser/formatter；长段落和流片段为明确合成内容。真实逐行 title/subtitle/copy、预览、整页/选中 Markdown、90 个流快照和 500 收藏 copy-all 均先验证等值。没有真实厂商 raw 响应，缓存 bytes 是省略旧 raw payload 的保守内容基线；不推导网络延迟、宿主耗时或进程内存。

| 工作量 | 旧 p50 ms | 新 p50 ms | 构造次数或字节证据 |
| --- | --- | --- | --- |
| 单词投影 | 0.0075 | 0.0031 | 同样 11 行，未请求正文的列表不生成正文 |
| 六服务长段落投影与可见详情 | 0.0444 | 0.0125 | 比较正文从 6 次降为选中项 1 次；新投影本身 0 次 |
| 三服务 90 个流快照 | 0.4588 | 0.3134 | 比较正文 267 次 → 90 次 |
| 500 收藏首次选中页内容工作 | 6.8488 | 4.7820 | 全集列表/复制所需预览保留；正文 500 页 → 1 页 |
| 500 收藏切换选择的内容工作 | 6.3679 | 2.0166 | 正文 500 页 → 1 页；新 copy-all 命中按集合 memo |
| 500 收藏预览各计算一次 | 0.0441 | 4.3167 | 新格式从内容派生，旧格式读预存 preview，存在计算成本增加 |
| 强制生成全部 500 页正文 | 7.9303 | 10.0854 | 新格式全量渲染更慢；实际 UI 按选中项生成 |
| 500 收藏序列化 | 14.8163 | 3.1799 | 13,592,888 → 2,569,655 bytes（约 −81.1%） |

字节对照：典型词缓存 5,113 → 2,214，单收藏 6,250 → 2,373；六服务长段落单收藏 214,829 → 29,725。纯机器翻译缓存反而因 content 外层增加 28,842 → 28,980 bytes，因此不宣称所有缓存都变小。500 集合为 450 个典型词和 50 个长翻译；这些比例只代表该输入。Page 场景按冻结的真实组件控制流调用真实 copy/preview/Markdown 函数，排除 React 调度、原生 reconciliation、音频与网络；完整尾部数据保留在 timings.md/results.json。预览增加的计算尚不足以支持引入新索引或缓存，保留简单派生逻辑。

- B6：`5250c35 refactor(content): retire legacy display paths and finalize boundaries`。完成旧 runtime display 模型、出站桥、重复 renderer 和无消费者测试的退役，旧 display decoder/枚举内聚 `favorites/legacyDisplay.ts`；合并通用 header/comparison，删除临时 cache layout guard。其合法语义缓存回放回归在旧 guard 下先失败（`/tmp/easydict-b6-layout-before.log`）。root review、独立 review、find-code-simplifications、lint、61 文件 / 532 项测试、build 和 diff check 通过；四命令源码/产物核对、性能对照、最终原生冒烟、中英文 README 与 AGENTS 同步完成。两个更严格编译选项暂缓，理由和诊断数见上文，Windows 原生环境缺口保留。
