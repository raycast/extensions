# Agent Note: 随重构精简测试与模拟边界

Status: implemented

## Problem

[主计划](../architecture/2026-09-19-command-boundaries-and-modularization.md) 工作项 10。部分测试在 mock 中重新实现业务规则，部分夹具从未执行，还有测试只验证中间对象或手工复制生产编排。它们增加维护成本，却不能充分保护实际消费者。重构若只搬迁这些测试，会保留已经准备删除的内部接口与重复职责。

本轮按 [find-code-simplifications](../../../../.agents/skills/find-code-simplifications/SKILL.md) 只读审查当前完整项目，以 HEAD `693f5b9dd1e2e7f9417d3d72d91f665a7712f86f` 和干净工作树为调查基线，不追溯历史清理。用户已明确要求先补入计划，随重构分批实施；调查阶段没有修改生产代码或测试；后续交付结果见 Delivered batches。

## Decision

把精简作为相关重构批次的交付内容：先明确失败模式及其真实消费者，再删除无效夹具、重复业务 mock 和仅服务于已移除接口的断言。需要替代覆盖的项目，在新边界验证成立后才退役旧测试。没有证据支持现在删除整份业务测试文件，也不设文件数、用例数或行数削减目标。

本项维护具体删除依据、保留覆盖与处理结果；02、03、05、08、09 只引用对应要求，不另建重复进度表。无生产改造前置条件的 T5–T8 可各自形成小测试整理批次。目录迁移携带测试一起移动，测试行为调整单独展示，避免路径变更掩盖断言损失。

## Audit coverage

| 范围                                  | 已审查文件数 | 追踪的生产边界                                    |
| ------------------------------------- | ------------ | ------------------------------------------------- |
| AI 配置、目录、迁移、词典模型及适配器 | 19           | 配置加载和写队列、表单、网络协议与缓存            |
| 查询、检测、选择锚点                  | 9            | hook、reducer、展示投影、缓存代次与原生列表消费者 |
| 收藏、导出、音频、笔顺与错误          | 10           | 持久化、页面参数、文件与 shell、外部数据解析      |
| 注册表、Google 翻译、Linguee 格式化   | 4            | 服务装配、真实 RPC 解析与最终展示                 |

共 42 个测试文件、5,240 个物理行；已阅读全部文件并检查相应实现及消费者。三个独立 subagent 分别审查前三个领域，主代理审查第四组并复核主要候选。还检查了 Vitest 配置、CI 和 [AI Provider 开发约定](../../../development/adding-ai-provider.md)。规模只用于说明调查覆盖范围。

## Prioritized changes

以下保存调查时的候选证据与退役条件；行号来自调查基线，源码链接已更新到最终归属，已交付结果见 Delivered batches。所有条目均以保持产品行为、协议、持久化格式与兼容性为前提；测试用例的修正不授权修改对应生产行为。

### T1: 模型目录使用真实规则与加载消费者

归属 [05 模型目录请求身份](../bug-fix/2026-09-19-model-catalog-request-identity.md)。[modelCatalog.test.ts](../../../../src/features/provider-management/modelCatalog.test.ts) 第 8–18 行在 mock 中用两个 base URL 重写公共端点判定，而 [modelDiscovery](../../../../src/features/provider-management/modelDiscovery.ts) 按归一化后的 models URL 判定。第 91、105 行测试仅检查目录对象及 loadKey，无法发现表单因对象重建重复请求。

删除这份端点业务替身，使用真实 catalog/discovery，仅 mock 网络和 Raycast Cache。05 建立真实加载消费者的失败复现后，将“公共目录改 key 不重复请求”“私有目录无 key 不自动请求”收敛到该边界，再删除被替代的 loadKey 形态断言。保留静态模型去重、generic/Gemini ID 规范化及 discovery 层的鉴权和缓存隔离测试。

净收益是少维护一份错误的公共目录规则，并让测试覆盖实际回归。置信度高、风险中等；专项验证包括 base/completion URL、公共匿名访问、私有凭据隔离、延迟与焦点去重、切换端点、迟到响应和卸载取消。05 的回归先失败再通过，不能以当前全量测试通过代替复现。

### T2: 注册表测试收敛到目录和真实装配

归属 [02 Provider 目录与执行装配](../architecture/2026-09-19-provider-catalog-and-runtime.md)。已删除的分类注册表测试 `translation/index.test.ts` 调用无 order 参数的 resolver，但 [总注册表](../../../../src/providers/registry.ts) 是其唯一生产调用者且始终传入全局顺序；02 删除分类 fallback 时，其专属测试入口和重复准备代码一起移除。

[总注册表测试](../../../../src/providers/registry.test.ts) 的混排期望来自生产排序函数且只用空 profiles；原排序 helper 测试（现为 [order.test.ts](../../../../src/providers/order.test.ts)） 的 “keeps dictionary and translation modes of one AI provider together” 只比较两次 key helper，没有装配服务。用真实装配的内置/AI 混排场景承接：期望身份及顺序明确写出，同 profile 的两种模式共享 providerKey/order、serviceId 不同，不同 profiles 独立。保留排序纯函数的移动、补全与恢复边界，以及 catalog 与工厂完整对应的检查。

分类测试里的间接启用元数据，以及删除 profile 后不恢复偏好中的 AI 服务，都仍有真实消费者，须转存到新的 catalog/runtime 边界后才合并。当前总注册表对 `expect.arrayContaining(["OpenAI Translate", "Gemini Translate"])` 使用 `not.toEqual`，仅排除二者同时出现，不能替代分别排除每项的断言。清理因重型注册表产生的偏好猜测 Proxy 时，使用场景明确的设置输入。

[useQueryEngine.test.ts](../../../../src/features/search/useQueryEngine.test.ts) 第 129、133 行分类模块 mock 对应的生产导入只有类型，可删除；第 137 行默认执行注册表 mock 随 02 改为每例显式传入服务集合后删除。[configuration.test.ts](../../../../src/providers/profiles/configuration.test.ts) 仅为排序候选引入的执行注册表 mock 同步移除。hook 第 142 行自行实现 `handleRequestError` 的替身改为真实错误逻辑，仅替换 toast/宿主边界；可控制响应时序的 Deferred Provider 仍保留。

净收益是减少全局夹具、重复注册表入口和自制错误规则。置信度高、风险低至中等；专项验证运行 registry、order、configuration 和 query hook 场景，保留晚加载服务、同 ID 配置变化、重生成、取消、loading 与缓存清空保护，不以减少 mock 为由删除这些行为测试。

### T3: 展示断言归入最终投影

归属 [09 同步展示投影](../architecture/2026-09-19-query-display-projection.md)。旧 couplingRules helper 测试（已由 `最终投影测试` 承接） 第 76 行锁定中间 `detailsMarkdown: "translated existing subtitle"`，但 `displaySections` 会以 `resultItemBody` 覆盖词典正文；Translation 分支只读取 title。该 fixture 的 Translation 分支不消费中间 Markdown；Linguee 的 Common/LessCommon/Wikipedia 等 fallback 仍读取 detailsMarkdown，最终投影必须保留这些正文语义，不能统一删除。`minSections` 测试还将规则套在 Linguee 上，实际生产门槛用于 Youdao。

09 建立投影后，删除这类中间字段和无契约依据的引用相等断言，把 helper 与 reducer 的 coupling 测试收敛到最终投影入口。保留 DeepL/Linguee 的 title、copyText、最终正文、非首项不变与输入无突变，Youdao 的真实 section 门槛及音标/考试类型合并，同时覆盖两种返回顺序、隐藏源翻译、缓存重放和收藏最终快照。

hook 与 reducer 中重复的完整 listEpoch 序列可缩短：状态所有者保留完整边界矩阵，hook 保留“请求开始不换列表 key、首个可见结果才换 key”的接线验证。不能删掉 hook 场景，否则错误返回 queryGeneration 时，reducer 测试仍会通过。只有生产 helper/reducer 职责确实删除且覆盖已迁移后，才能移除相应旧测试文件或整组测试。

净收益是减少多层重复描述展示规则，并解除无效中间值对实现的约束。置信度高，listEpoch 合并为中高；风险中等。专项验证投影、Markdown、query hook、缓存与收藏场景，另外按 09 验证原生选择和挂载。

### T4: 收藏测试减少自制 hook 与手工编排

归属 [08 模块归属](../architecture/2026-09-19-module-ownership.md) 的收藏批次。[useFavoriteWords.test.tsx](../../../../src/features/favorites/useFavoriteWords.test.tsx) 第 17–57 行自行实现同步 Map 存储、React hook 注入桥接及恒为 false 的 isLoading，还实现了生产未调用的 removeValue。安装包中的真实 useLocalStorage 使用异步 LocalStorage、JSON 和 usePromise/mutate；当前 fake 的常量不能证明生产加载状态。

优先使用真实存储 hook，把 fake 下移到 LocalStorage 边界，删除自制 hook；验证异步读取后空列表、持久化后重读、两个词条的最新优先顺序、方向区分、指定删除和清空。若真实 utils 导入需要更大的无关宿主模拟框架，则退回局部精简：移除 React 注入桥接和未用方法，不把 fake 的同步状态写成生产保证，也不声称已验证真实持久化生命周期。

[favorite.test.ts](../../../../src/features/favorites/model.test.ts) 第 153–187 行的两项 “stroke order integration” 手工复制 [FavoriteWordsPage](../../../../src/features/favorites/FavoriteWordsPage.tsx) 参数编排，页面接错参数也不会使它们失败。若收藏职责整理产生真实展示 selector，改测该入口并删除测试内接线；没有这样的生产边界时暂缓，不为减少测试专门造 helper。保留翻译回退与汉字方向、去重、过滤、数量上限的领域测试。

问题置信度高；完整替换存储 fake 的净收益置信度中等，须比较删除与新增的模拟成本，风险中等。专项验证实际 hook/selector 的输出及持久化边界；将生产 sourceText/translatedText 接错时，相应消费者测试应失败。

## Small companion changes

以下证据充分、风险低、置信度高，可独立成小批次，也可随对应模块重构实施；不需要等待所有架构工作完成。

| 编号与范围              | 删除或精简依据                                                                                                                                                                                                                                          | 保留契约与专项验证                                                                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T5 检测夹具             | [detect/index.test.ts](../../../../src/core/detect/index.test.ts) 的 CancelledRemote/Local 两个默认 Provider 未被执行：第一个测试替换注册表，第二个在已取消入口直接返回；删类与默认注册，beforeEach 只清空状态                                          | 保留两个取消测试及共识/落败 Provider，分别及共同运行，确认 loser abort、取消不记错误、已取消时不启动检测；不依赖暂缓的检测器架构改造                                                      |
| T6 合法 profile fixture | [repository.test.ts](../../../../src/providers/profiles/repository.test.ts) 多处复制同一合法 profile；使用文件内返回新对象的 fixture，显式覆盖场景相关字段                                                                                              | 保留 round-trip、JSON 回退、并发队列及无效排序验证；不把不可信 raw JSON 通过合法 fixture 工厂构造，不扩展成全仓 fixture 框架                                                              |
| T7 重试中的重复 headers | [词典 adapter 测试](../../../../src/providers/dictionary/ai/providers.test.ts) 两个 JSON 重试场景重复完整 UA/session 形状，已有专用 adapter 和 [headers 测试](../../../../src/providers/shared/openai-compatible-headers.test.ts) 承担格式检查          | 删除重复完整值断言；保留第一次 native JSON、第二次取消 responseFormat、同一次重试沿用 session、只有明确不支持时持久化回退、其他错误不重试；两种失败仍分别命名，运行 adapter/headers tests |
| T8 收藏占位 fixture     | [favorite.test.ts](../../../../src/features/favorites/model.test.ts) 第 115 行测试名是“跳过 Linguee 占位”，实际 formatter 输入只生成 Example；直接使用现有 Translation section fixture 构造占位项及后续真实译文，移除完整厂商 payload 和 formatter 导入 | 保留单独旧占位快照与非 Linguee 同文译文场景；运行 favorite 与 Linguee formatter tests，确认遇到占位即提前结束的错误会使新场景失败                                                         |

这些改动分别减少未执行的测试实现、重复合法实体、重复协议断言和错位夹具依赖。它们不要求减少用例数；T8 修正的是测试承诺与实际输入不一致的问题。

## Coverage to retain

- 查询缓存单测检查存储层拒绝旧 cacheGeneration，hook 测试检查请求传入启动时 generation，保护不同失效点；旧结果、旧 loading 清理、清空后迟到、同服务重生成、Strict Mode、晚加载服务及选择锚点也不合并成一个“取消”场景。
- 迁移、损坏存储恢复与旧收藏仍有持久化消费者，不因名称含 legacy 或只在测试构造旧字段而删除。迁移返回引用是否改变还决定配置层是否再次写入；不能统一视为实现细节。
- 公共端点 URL/auth 表和 presets 默认值受开发约定保护；cacheIdentity 与 testFingerprint 分别保护缓存身份和是否重新测试，翻译与词典 adapter 各自的 keyless/headers 测试也保护不同调用方。
- [03 OpenAI 合并](../simplification/2026-09-19-openai-compatible-provider.md) 当前没有仅测试 protected getter 的冗余用例。[公开 request 测试](../../../../src/providers/translation/ai/providers.test.ts) 应随类移动继续保留；其 collect helper 未读取 async generator 最终 return，合并时仍须验证最终结果，不能把已有片段测试误作完整返回覆盖。06 的领域校验和 testFingerprint 不因状态 hook 改变而退役。
- Google 测试使用真实 RPC 解析器、mock fetch，覆盖长度、UTF-16、批次返回次序、部分失败、429、challenge、取消与读取响应超时；RPC 夹具编码是外部协议 fixture，不是待删除的业务 mock。Linguee formatter 的无精确词条、空首项和真实翻译也分别保留。
- 音频并发临时文件、Windows 特殊字符路径、TTS 长度边界、笔顺 404/503 策略与 SVG 转义/上限、收藏导出格式、活跃 signal 与取消 signal 的错误区分都有独立失败模式，当前无整组删除依据。

## Delivered batches

T1 已随 05 交付：真实模型加载消费者先失败后通过，端点业务 mock 和被替代的 loadKey 断言退役。T5–T8 作为独立测试整理交付，4 个测试文件净减 78 行，用例数保持；代码 review 后的 find-code-simplifications 未发现进一步强候选。检测保留未启动 Provider 的构造 spy，headers 保留非空 session 与重试复用。

T8 的临时故障注入证实：生产逻辑遇占位便提前返回时，旧 fixture 仍通过，修正 fixture 后准确失败；随后恢复生产文件并确认无生产 diff。最终主工作区 lint、test（44 文件 / 283 项）、build 和 diff 检查通过。T2、T3、T4 已分别随 02、09、08 交付，详见下文。

## Execution and verification

每个实施批次记录“旧文件/场景 → 删除或合并理由 → 保留/替代入口 → 验证结果”，不再维护一份与代码相同的固定用例清单。无执行路径的 fixture 写明不可达依据；需要替代覆盖的项目，先确认真实生产入口接错或规则失效时测试会失败，再移除旧断言。仅改变测试时不顺手修改产品语义。

迭代运行受影响的 focused tests；每个最终代码批次按主计划完成 lint、test、build 和 diff 检查。公开契约仍缺覆盖时允许增补必要测试，净收益以删除的重复职责、mock 业务规则与维护面评估，不以测试变少评估。不新建全局 SDK 模拟层，不以大 snapshot 替代具体断言。

调查基线：`npm test` 通过，42 个文件、260 项测试；该结果仅记录调查起点，不代表最终验收。文档交付检查格式、相对链接和 `git diff --check`；lint/build 及原生验证留给代码实施批次。

## Alternatives considered

**重构结束后统一删测试。** 容易让旧接口被测试继续依赖，也使删除依据脱离对应实现；采用同批退役，前置条件明确的独立小整理可提前。

**按测试数量、覆盖率或重复语句比例删减。** 不能区分相似断言保护的不同失效点；以真实消费者和失败模式作为判断依据。

**所有测试都升级为完整页面集成。** 会增加宿主模拟与异步成本；领域规则留在纯函数层，装配与接线只保留必要消费者场景。完整真实 utils 方案也必须有净简化收益。

## Acceptance criteria

- [x] T1–T3 随 05、02、09 建立真实边界覆盖并退役对应冗余测试，保留场景映射与验证证据。
- [x] T4 随 08 明确采用完整边界替换或局部精简；selector 候选只有生产边界成立才实施，否则记录暂缓依据。
- [x] T5–T8 完成独立或随行整理，删除无效准备与重复断言，T8 的实际输入符合测试名。
- [x] 03/06 和目录迁移保留有效契约测试；没有为凑删除量移除迁移、数据恢复、并发、跨平台或外部协议覆盖。
- [x] 每次测试退役都有明确消费者证据与保留/替代位置，没有新增成本更大的通用测试框架；对应代码批次完成主计划验证。

## Risks

同名或相似断言可能保护不同层的接线，删除前须比较故障传播路径。真实 utils 引入测试宿主成本不确定，因此 T4 保留有界的退路。源码路径与行号记录调查基线，实施搬迁时更新引用及场景映射；测试总数变化不能单独证明本项成功。

### T2 delivered with provider assembly

02 已用真实 catalog 与 factory 装配覆盖默认顺序、自定义混排、同 profile 两类服务身份、模式路由和隐式启用，删除分类 resolver 的旧测试入口及被真实装配覆盖的手工跨类排序用例。查询测试显式传入服务集合，移除旧注册表和错误归类业务 mock；晚加载、同 ID 更新、最新配置重生成与请求所有权覆盖保留。

### T3 and T4 delivered

T3 随 09 删除旧 coupling/hide 实现及 helper 专属测试，将最终 title/copyText/正文、真实 Youdao section 门槛、metadata 补充与无突变断言集中到投影。reducer 保留原始 state 和完整 epoch 矩阵；hook 删除重复的完整 epoch 序列，用两种返回顺序、隐藏源先到、stream、缓存重放与完成收藏保护接线。两处无真实契约的引用相等断言改成内容断言。保留 fallback Markdown 的真实消费者，没有把所有正文都当作冗余。新增元数据恢复回归先在旧实现失败、再在新实现通过。

T4 随 08b 使用真实 utils 2.3.1 useLocalStorage，只 mock Raycast LocalStorage/启动环境；删除 React 注入桥、自制 useState/useCallback hook、未用 removeValue、恒定 isLoading 与泛型窥视 helper。原 7 项契约全部保留；持久化场景验证两次顺序更新与重新挂载恢复。单独测试变更净减 25 行，迁移再合并同目录 import。未为没有实际 selector 的笔顺接线增加生产抽象，该条件候选明确暂缓。

最终共有 43 个测试文件 / 299 项通过，lint、build、diff 检查通过。用例增加来自真实协议/消费者/投影契约；没有以数量减少为目标。03 的公开 generator 最终返回、取消与错误覆盖保留；06 原型拒绝后没有引入实验专用长期测试；迁移、数据恢复、跨平台音频、缓存代次和外部协议测试未退役。

本阶段的展示投影实现已由 [第二轮内容与持久化重构](../architecture/2026-09-19-content-model-and-persistence.md) 替代；旧路径仅用于记录当时的行为证据，当前保护入口为 `core/content/compose.test.ts`、`view.test.ts`、`render.test.ts` 与收藏 legacy 测试。
