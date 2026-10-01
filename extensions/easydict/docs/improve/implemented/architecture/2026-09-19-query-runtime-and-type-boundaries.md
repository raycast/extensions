# Agent Note: 第二轮重构计划一 — 查询运行时与可信类型边界

Status: implemented

## Problem

[上一轮重构](2026-09-19-command-boundaries-and-modularization.md) 已完成命令依赖隔离、功能归属和原始结果的同步展示投影。重构前，查询生命周期分散在 [useQueryEngine](../../../../src/features/search/useQueryEngine.ts) 的多个 ref 与 `queryReducer` 的结果、pending、loading 状态中。Provider 结果、持久化数据与可执行配置的类型保证也不一致，需要重新确定状态所有者和信任边界。

本计划是两个先后计划中的第一份；第二份为 [内容模型、展示与持久化](2026-09-19-content-model-and-persistence.md)。本轮可以替换现有内部机制，交互行为、真实持久化数据和外部协议是验收依据；旧 helper、reducer 事件及测试实现不构成保留理由。

## Decision

已建立查询命令专用的 QueryRunner，统一持有查询 session 和每个服务的请求、结果状态；React hook 负责订阅和宿主适配。同时补齐现有存储格式的解码边界，分离可编辑配置与可执行配置，以及语言观察值与最终检测决策。本计划保持当前结果内容结构和存储写入格式，完成后再由计划二替换内容与快照模型。

QueryRunner、配置编译、语言检测和存储解码已分批交付并完成集成，六笔提交止于 `a7c133e`。当前结果内容结构及存储写入格式保持不变，供计划二继续切换；本阶段未引入第二套运行中的内容模型。

## Evidence and baseline

调查基线为 `04bc185`。上一轮最终检查为 43 个测试文件、299 项通过；这不是新计划的验收结果。实施前重新记录工作区、依赖和正式构建产物，避免将后续变化归到旧基线。

| 证据                                                                                                | 已确认的问题                                                                                        | 本计划归属                         |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------- |
| useQueryEngine 最终结果 dispatch 后调用默认 flush 的 debouncer.clear                                | 临时测试使用真实 hook：chunks 为 draft、最终返回 final，缓存为 final、界面为 draft                  | A1 修复；A3 用唯一最终提交路径替代 |
| 当前语言检测 reject 的 catch 只显示错误                                                             | 临时测试中 Toast 已调用，loading 仍为 true；多数真实检测错误已有回退，不能据此声称原生必现          | A1 修复；A3 以阶段状态覆盖失败收尾 |
| [缓存护卫](../../../../src/core/query/cache.ts) 未校验实际消费的可选字段及联合关系                  | detailsMarkdown 为数字仍被接受，真实投影随后调用 startsWith 崩溃；任意 type、字符串 isWord 也可通过 | A2 现有格式解码                    |
| [收藏 hook](../../../../src/features/favorites/useFavoriteWords.ts) 直接使用 useLocalStorage 的泛型 | SDK 的 JSON 解析不验证 FavoriteWord[] 形状；无效 displaySections 到达真实消费端会抛错               | A2 现有格式读取边界                |
| [配置类型](../../../../src/providers/profiles/types.ts) 同时表示草稿、存储和运行配置                | runnable boolean 通过后，下游仍重复解析模型和 endpoint                                              | A4 配置编译                        |
| [语言工具](../../../../src/core/language/utils.ts) 以 string 字段推导代码字段，并默认回退 auto      | emoji、显示名也属于 LangCodeKeys；任意非空且非 auto 字符串通过 isValidLangCode                      | A5 语言与检测类型                  |

复现实验临时保存在 `/tmp/easydict-query-lifecycle-audit` 与 `/tmp/easydict-boundary-repro.cjs`；正文已记录场景，实施时应将必要场景移入维护的测试，不依赖临时文件仍然存在。实验使用真实源码及受控运行时/Provider 输入，未在真实服务观察到 draft/final 差异，也未发现现有用户收藏已损坏。

## Runtime ownership

QueryRunner 每个查询命令实例创建一次，负责检测、并发请求、缓存命中、单服务重新生成、迟到服务和取消。它不依赖 React，不通过全局单例跨命令共享状态，不建设通用状态机、事件总线或依赖注入框架。网络和宿主副作用通过少量明确的边界连接；Toast、原生列表和播放动作的 UI 接线留在功能适配层，自动播放资格与次数仍由查询 session 约束。旧请求不能触发 Toast 或朗读，迟到 Provider 的自动朗读资格保持；异步音频失败不改变查询完成状态。

| 所有者               | 保存的事实                                                                 | 退出或替换规则                                           |
| -------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------- |
| 查询 session         | 当前输入、检测阶段、已解析查询、服务 entries、启动时缓存代次、自动朗读状态 | 开始或清空查询替换 session，并取消旧工作                 |
| 服务 entry           | 最近接受的有效结果、当前 request 的状态与对象身份                          | 单服务重生成只替换该 request，保留已有结果直到接受新结果 |
| 缓存模块             | 清空代次、存储策略、TTL                                                    | 清空前启动的请求不能回填；新重生成使用新的清空代次       |
| React / Raycast 适配 | 订阅、稳定视图快照、查询 UI identity、listEpoch、选择锚点                  | 按原生挂载与导航契约更新，独立于请求 token               |

异步提交统一检查当前 session 与该服务 request 的对象身份，以及请求是否仍运行。启动、结果和结束以一次一致的状态更新发布。loading 由“检测中或存在运行中的服务请求”派生；检测阶段没有服务请求，不能仅依据 pending 数量判断。

流式批处理只发布中间内容。正常完成先取消待发布 timer，再接受 Provider 最终返回值、执行符合代次条件的缓存写入，并一次发布最终结果与结束状态。timer 回调也检查 session/request 所有权，不能只依赖 clearTimeout。异常和取消清理 timer，空结果不抹掉此前已接受的有效结果；不在最终提交后再次发布累计 chunks。生成器的最终 return 必须被消费，不能改成丢失最终返回值的普通 for-await 循环。

Runner 通过缓存的不可变 snapshot 与有限订阅接口对接 React，可使用 useSyncExternalStore；getSnapshot 不得每次创建新对象。关闭、卸载和 Strict Mode 的 effect 重放分别验证，不把订阅暂时移除直接等同于业务查询失效。每次通知的节流不得延误最终完成、清空和错误收尾。

第一阶段仍消费当前 QueryResult 与展示投影。原生 listEpoch 由适配层的视图快照派生器与 displaySections 在同次视图发布中确定；首个可见结果不能先出现、再由 useEffect 补更新 epoch。视图快照是派生值，不增加一套可独立写入的查询结果状态。新查询立即清空旧查询条目；首个可见结果前保留的是 List 实例与 epoch，不是旧结果。之后当前查询不因流片段或其他服务返回而重挂载；只有单服务重生成保留该服务已有有效结果。

## Type and decoding boundaries

复杂外部对象通过 decoder 从 unknown 构造符合契约的数据；小型局部护卫可以保留。不得用泛型、断言或不完整的 value is T 谓词替代验证。检查实际消费的字段和联合关系，明确可选字段的拒绝或降级规则；类型可信的内部协作者不反复执行整对象校验。

| 边界         | 输出与失败策略                                                                                 |
| ------------ | ---------------------------------------------------------------------------------------------- |
| 当前查询缓存 | 解码当前可重放结果；损坏、未知格式或非法判别关系成为 cache miss，保留清空保护                  |
| 当前收藏     | 解码旧数组快照；失败返回明确错误并保留原文，阻止将解码失败等价为空收藏后覆盖                   |
| AI profiles  | 保留 missing / ready / invalid / unsupported / error、写队列和旧版本迁移；结构合法不等于可执行 |
| 内部运行状态 | 用阶段与请求状态联合表达实际可达状态，不增加没有消费者的事件历史或 reason 字段                 |

收藏 reader 必须覆盖旧的有效缺省字段、旧 AI 标题和 Linguee 占位快照。未知未来版本和损坏数据不自动重写；存在坏单项时默认保留原存储并阻止破坏性保存，不悄悄丢项。错误状态提供原始数据的本地备份/导出入口；从用户明确选择的有效备份恢复时，先完整解码，再成功备份当前原文后才允许替换存储。未知未来版本默认只读与导出，提示使用兼容版本，不按损坏数据自动降级。恢复能力限定于数据错误处置，不扩展为通用收藏管理工具。本阶段不写入新收藏版本，这些 decoder 在计划二成为旧格式 reader，不再另造一份兼容逻辑。

配置采用“存储解码 → 可编辑 profile → resolveRuntimeConfig”的边界。解析结果区分 ready config 与具体 issue；ready config 持有实际 AI.Model 或已验证的 OpenAI-compatible 请求参数。Provider 构造及表单连接测试消费同一解析结果，运行配置不直接写回存储。模型暂时不可用、不完整旧配置和 keyless endpoint 继续可编辑，宿主权限和网络错误仍在执行时处理。原生 JSON 回退保留 profile 身份、队列与持久化更新语义。

语言类型从实际 catalog 建立，区分确定语言、自动检测源语言及未映射的 Provider 代码；展示 metadata 与 Provider code mapping 分开。保留 en、zh-CHS 等已保存的编码值，不附带更换存储编码。DeepL 源/目标差异、franc 多对一映射和当前自动选目标策略需明确测试。未知代码交给检测策略处理，不能靠 lookup 的隐式 auto 回退伪装为有效映射。

检测器从实际消费的外部字段解码出 Observation，策略层生成 Decision，停止在观察值上回写 prior/confirmed。原始响应与厂商代码留在检测器边界，不通过泛型或断言直接进入可信决策。先为现有共识、偏好、速度优先、置信度和本地回退建立行为对照，再替换表示；类型整理不授权调整检测策略。每次检测使用其自身的配置/检测器快照，避免重叠调用经模块变量影响另一查询。cache 是否可保存仍由最终决策的确认语义决定。

## Delivery sequence and parallel work

| 批次 | 交付                                                                                        | 前置与并行边界                                                           |
| ---- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| A0   | 记录基线、外部行为与新边界，确定 session/snapshot 和 decoder 输出，评估是否需要 schema 依赖 | 首先完成；只冻结本计划契约，不实现计划二内容模型                         |
| A1   | 将两个生命周期失败场景变为回归测试，修复最终 flush 与检测失败收尾                           | A0 后；与 A2、A4、A5 可并行，A3 最终切换前合入                           |
| A2   | 当前 cache 与 favorites 解码、错误保留和写入保护；完善实际消费字段校验                      | A0 后；可独立于 Runner 工作，cache/hook 交叉文件由主代理串行集成         |
| A3   | 专用 Runner、React 适配、原生视图 identity，退役 reducer 与镜像 refs/actions                | A1 后交付；A2/A4/A5 不是设计起步的前置条件，最终合入各边界后集成验证     |
| A4   | profile 草稿/存储与可执行配置分离，表单和工厂使用编译结果                                   | A0 后；同一 agent 拥有 profiles/runtime、Provider 构造和管理表单接线     |
| A5   | 语言 catalog/mapping、Observation/Decision 和检测局部快照                                   | A0 后；独立 agent 拥有 language/detect，公共查询类型与 A3 的修改串行合入 |
| A6   | 组合验证、文档与 AGENTS 同步、退役清单、四命令依赖复核，交接计划二                          | A1–A5 均完成后；不将仅通过局部测试视为集成通过                           |

同一工作树不并行修改同一个文件。独立分支或 worktree 实施后由主代理 review，再执行 [find-code-simplifications](../../../../.agents/skills/find-code-simplifications/SKILL.md)，修正后完成代码检查并按批次提交。发现影响产品语义、实际存储恢复或新增依赖的未定取舍时，先完成可审查原型再向用户说明问题；不因普通实现选择重复请求确认。

## Test retirement and verification

先保留可观察行为，再删除实现专属覆盖：queryReducer 与 QueryAction 退役后，其事件形状、pending 数组等测试退出；取消、顺序、首个可见结果、缓存清空和 stale completion 场景迁入 Runner/视图适配的真实入口。保留薄 React 接线与 Strict Mode 覆盖，避免完整行为矩阵在 Runner、hook 和页面重复三次。仅 mock 网络、存储与宿主，不在 mock 中重写业务规则。

专项矩阵覆盖：新查询取代旧查询；同服务多次重生成；重生成期间保留已有结果；旧请求不能更新结果、loading、缓存、Toast 或朗读；清缓存前请求完成不回填；迟到服务仅加入一次；已有 ID 配置不重启当前请求而用于下一次查询及重生成；全禁用、全缓存命中、检测失败和空结果；每次查询自动朗读一次；隐藏源先到与流式交错；非法嵌套存储、旧格式和未知版本；配置回退与并发保存；恢复前备份失败不覆盖原文、无效备份不写回；检测重叠及本地回退。

每个最终代码批次完成 npm run lint、npm test、npm run build、git diff --check。回归先失败后通过。正式构建检查查询、收藏、管理和 OCR 四命令；收藏不能引入执行注册表，管理保留连接测试必要能力。原生复核列表选择、输入焦点、详情/返回、清空、重查/朗读和命令重开，记录 macOS/Windows 实测与缺口，不以 mock 代替宿主结论。Raycast 生命周期与 API 采用 [raycast-extension](../../../../.agents/skills/raycast-extension/SKILL.md)，实施时核对安装类型及相关官方文档。

Schema 库只有在有界原型能减少同构类型与 validator、保留版本与跨字段约束，且四命令实际产物代价可接受时采用；不复制现有结构后叠加第二套校验。现有直接运行依赖没有 schema 库。更严格 TypeScript 选项留到计划二收敛模型后处理；试验开启 noUncheckedIndexedAccess 与 exactOptionalPropertyTypes 的 293 条诊断不是本计划必须逐条打补丁的清单，也不代表 293 个运行时缺陷。

## Alternatives considered

**仅将 useQueryEngine 拆成更多 hooks。** 不改变多个状态所有者及同步义务，采用独立 Runner 并实际退役 reducer、事件协议和重复 ref。

**一次同时重写 Runner、ProviderContent 和收藏格式。** 生命周期错误和内容差异难以分辨，两个计划以前后可运行版本交接；第一阶段 decoder 在第二阶段继续承担旧数据读取。

**所有数据使用同一个 isValid。** 可存储、可编辑、可执行、可展示需要不同保证和失败处理，分别建立边界。

**保留所有数字代次或一并删除。** 允许 session/request 对象身份替代内部计数器，但缓存清空、查询 UI identity 与 listEpoch 保留独立语义，按消费者决定表示。

## Acceptance criteria

- [x] A1 两个真实代码边界复现先失败后通过；成功最终返回只提交一次，取消和旧请求不会再发布片段。
- [x] QueryRunner 是唯一查询业务状态所有者，queryReducer、QueryAction、重复 pending 记录和无效当前查询标记已退役；新增订阅与销毁责任有明确归属。
- [x] 检测、请求与已有结果的合法组合由类型表达，loading 可派生；重生成继续显示最近有效结果，所有异步提交与 Toast/朗读经过同一所有权检查。
- [x] 稳定 snapshot、Strict Mode、原生首次可见结果、选择锚点与清空同步通过对应自动化和可用宿主验收。
- [x] 当前缓存与收藏存在真正的解码边界，非法可选字段和错误联合关系被处理；收藏/profile 解码失败不会被空值覆盖，旧格式和当前写入格式保持可读。
- [x] 表单与 Provider 工厂消费可执行配置，保存配置与运行能力的差异明确；keyless、旧配置、JSON 回退和并发写队列保持。
- [x] 语言映射与显示 metadata 分离，观察值与决策分离；未知代码和 auto 区分，重叠检测、映射特例与现有检测策略通过行为对照。
- [x] 每批 review、find-code-simplifications、检查与提交已记录；有效覆盖迁移后才删除旧测试，没有新通用框架替代旧复杂度。
- [x] 四命令产物与依赖基线、未验证的原生路径、计划二使用的稳定接口和旧格式 reader 已交接。

## Risks

**换位置但不换所有权。** Runner 与 hook 同时保留可写结果、pending 或 loading 会扩大复杂度；验收要求实际删除重复事实。

**订阅生命周期与请求生命周期混用。** 临时取消订阅、Strict Mode 重放和真正关闭必须分别处理；取消后的 timer、缓存和自动朗读仍需所有权验证。

**收紧边界误伤有效旧数据。** 当前字段缺省、旧枚举、未知版本与损坏值按明确策略读取，收藏/profile 不做自动清空或静默删项。

**类型重构悄悄改变检测和配置策略。** 原来的 fallback、迟到服务、不可执行配置和 JSON 回退都有生产消费者；策略变化单列，不作为重命名或类型收窄附带发生。

## Execution log

- A0：以 `04bc185` 的干净工作区重新正式构建。发现本机旧 `ray develop` watcher 会在源码变化后覆盖 build 产物，因此停止旧 watcher，在 `/tmp/easydict-round2-baseline` 固定提交重建，正式基线保存至 `/tmp/easydict-round2-evidence/00-before-formal`：Search 1,597,495、Favorites 425,340、Manage Providers 223,216、OCR 7,680 字节；分别 104/23/39/2 个源码模块。早先 `00-before` 是被开发构建覆盖的混合结果，不用于比较。现有类型、协议和存储迁移边界各自承担不同约束，本批保留局部 decoder，不引入仅搬迁校验代码的 schema 依赖。
- A1：`78227f5 fix(query): settle final stream and detection failures`。两个仓库内回归测试先失败后通过；review 确认最终缓存及结果由 final 返回值提交，检测失败结束 loading；简化检查移除无消费者的 flush 参数与完成后再次发布分支。lint、43 文件 / 301 项测试、build、diff check 均通过。
- A2 / A4 / A5：独立 worktree 并行实施；主工作区从 A1 开始 A3。root 串行集成与正式构建，避免多个 Raycast build 竞争同一安装目录。

- A3：`13eaf5c refactor(query): centralize request ownership in runner`。root 与独立 agent review 通过；技能检查删除已无生产消费者的 reducer、事件协议与排序包装。11 项 reducer 实现测试由既有 20 项 hook 行为测试与 5 项 Runner 快照/生命周期测试承接。lint、42 文件 / 295 项测试、build、diff check 通过。纯 loading 变化仍会重建投影，交给 B4 的实际渲染计量处理；原生验收与 A2/A4/A5 集成后执行。

- A4：`d64c8f0 refactor(providers): compile executable AI configuration once`。ready/issue 编译结果统一交给 Provider 与表单；review 补回不可执行配置的稳定服务 ID，避免修复配置自动重启当前查询。技能检查将动态服务组装收回 registry，删除两个单消费者入口和额外 pair 类型；保留可编辑配置、原生 JSON 回退及保存队列。lint、42 文件 / 298 项测试、build、diff check 通过。
- A2：`b917ce1 fix(storage): decode saved results and preserve invalid favorites`。5 条新边界回归先失败后通过；root review 后将内部 decoder 收为私有，去掉 cache 与 decoder 两处重复字段矩阵。保留旧数组格式，非法/未来数据禁止覆盖，恢复先验证备份并成功保存原文。lint、45 文件 / 340 项测试、build、diff check 通过；恢复 UI 自动化调用真实 repository 与文件 I/O，未对用户实际收藏执行修改。

- A5：`04c8be3 refactor(detection): separate observations and language decisions`。外部协议仅输出 Observation，策略层构造 Decision，检测器与偏好采用每次调用的独立快照。原 catalog 的 50 项 metadata 与 367 项反向映射逐项一致；`fil → tl` 在查询入口归一化，未知语言在边界明确处理。旧代码的重叠检测与 Bing 非字符串语言两个回归先失败后通过。root 与独立 agent review 修正仅偏好繁体中文时的原有回退策略，并补齐检测为 `tl`、目标为 `fil` 时选择另一偏好语言的测试。技能检查移除无消费者 payload/prior、重复观察状态和仅旧返回对象形状的断言，保留协议、置信度、排序与回退的行为覆盖。lint、47 文件 / 375 项测试、build、diff check 通过。

- A6 集成修正：`a7c133e fix(providers): preserve active queries during JSON fallback`。独立集成 review 找到 profiles 刷新导致服务短暂移除、JSON 回退等待期间取消仍 Toast/retry 两处跨批问题。真实 usePromise 与存储边界的两项刷新回归，以及两种 stale Toast 和一次真实 Provider retry 回归，均先失败后通过。hook 直接保留已有 data，没有新增镜像状态；同一 request signal 传递至 UI 回退边界，全部请求入口统一检查取消。保存已确认的 Provider 能力事实保持，取消只抑制旧请求通知与重试。root/独立 review 与 find-code-simplifications 通过；最终 lint、49 文件 / 381 项测试、build、diff check 全过，未 push。

## A6 acceptance and handoff

代码交接基线为 `a7c133e`。正式四命令产物已保存至 `/tmp/easydict-round2-evidence/plan1-final`，对照固定提交 `04bc185` 的正式构建；本机旧开发 watcher 已停止，避免开发产物覆盖对照。

| 命令             |  基线字节 |  当前字节 |   差值 | 当前源码模块 | 依赖核对                                                              |
| ---------------- | --------: | --------: | -----: | -----------: | --------------------------------------------------------------------- |
| Search           | 1,597,495 | 1,602,359 | +4,864 |          108 | 查询执行与检测依赖位于本命令                                          |
| Favorites        |   425,340 |   434,535 | +9,195 |           28 | 增加可信 decoder 与数据恢复；无 Provider 网络实现、执行注册表或检测器 |
| Manage Providers |   223,216 |   222,881 |   −335 |           40 | 保留配置和 AI 连接测试；无完整执行注册表或检测器                      |
| OCR              |     7,680 |     7,680 |      0 |            2 | 保留参数启动查询边界                                                  |

这些是独立命令的构建与依赖数据，不推导为原生启动速度或内存结论。

计划二使用的稳定入口：`QueryRunner` 的命令实例/session/request 所有权、缓存代次、订阅与不可变 snapshot；`resolveAIProviderRuntimeConfig` 的 ready/issue 联合；`LanguageCode`/`SourceLanguage` 和 `DetectionObservation`/`DetectionDecision`；旧结果 decoder 与收藏 repository 的 invalid/unsupported/error 保留、串行写入与先备份后恢复规则。现有 `QueryResult`/`DisplaySection` 仍是本阶段模型，必须在下一阶段按真实消费者退役。

原生验收环境为 macOS 26.5.1 / Raycast 2.4.1.0，本地正式构建。四命令安装产物逐项 SHA-256 比对，与 `a7c133e` 保存的正式产物一致。未修改用户实际收藏或 Provider 配置。

| 场景                     | 验收证据                                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| 查询启动、首次结果与换词 | `hello`/`architecture` 参数启动正常；输入修改先清空旧行，连续换词后显示最后一次 `dictionary` 结果；方向键可选择词典释义         |
| 清空与重查               | 清空输入与 Escape 均清除结果；重新输入正常；动作面板的 Requery All Services 清空并重新显示结果                                  |
| 长文本与单服务重新生成   | 多个服务显示完整翻译；切换选中服务后比较详情将该服务排首位；Regenerate AI Result 期间保留已有结果；重新生成中清空后无旧结果回写 |
| 详情与快捷键             | 点击 Show More Details 显示单项正文，Escape 返回；用户手动验证 `⌘M` 正常打开详情                                                |
| 旧收藏与命令跳转         | 现有 5 条收藏正常读取、筛选、切换，旧词典及 AI 正文保留；Open in Easydict 以 `canons` 参数进入实时查询并显示结果                |
| Provider 管理            | 列表的既有 Provider 状态、筛选、Raycast AI 编辑页及不保存返回正常                                                               |
| 朗读                     | Read Query Text 动作可触发，未观察到错误；工具无法确认实际发声，不记录为音频输出通过                                            |

快捷键诊断结论：自动化 `pressKey("super+m")`、`cmd+m` 等操作进入 Quick AI；对固定重构前版本 `04bc185` 的同一操作也出现相同现象。用户随后确认手动 `⌘M` 正常，扩展的详情快捷键通过人工验收。异常只在自动化输入路径中观察到，底层键位映射或拦截原因未确定，不归因于 Easydict 或用户的 AI 设置。对照后已恢复当前 `a7c133e` 构建，并再次核对全部命令产物哈希。

保留的验证范围：`⌘K`/其他带修饰键的工具输入未获得可信执行结果；实际发声、OCR 截屏识别和 Windows 宿主未实测。损坏收藏的恢复使用真实 repository/文件 I/O 与 UI 自动化测试覆盖，没有为原生验收破坏用户数据。锁屏造成的中断已经恢复，核心 macOS 交互与用户手动详情快捷键验收完成。具体证据保存在 `/tmp/easydict-round2-evidence/plan1-final/native-verification.json`。

A6 验收与接口交接完成。代码检查沿用 `a7c133e` 的 lint、49 文件 / 381 项测试、build 与 diff check 结果；基线对照后正式 build 再次通过。此次仅更新验收记录和链接，没有源代码修改，不重复整仓 lint/test。计划二的生产实施前置条件已满足。

后续快捷键修正：用户指出第一轮 `c2b892e` 移动既有朗读键位不妥，现恢复 Read Query Text 为 Cmd/Ctrl+R，Requery All Services 改为 Cmd+Option+R / Ctrl+Alt+R。上述 `04bc185` 对照已包含 `c2b892e`，只能排除 Quick AI 自动化现象由第二轮引入，不能说明第一轮键位变更合理。修正及独立检查、原生标签核对见[快捷键决定](../bug-fix/2026-09-19-query-audio-shortcuts.md)。本节构建表仍对应 `a7c133e`。

快捷键修正随后按用户要求通过 rebase 合入原提交（现为 `d6bc29a`），当前分支 HEAD 为 `2db10eb`。最终 tree 与修正后已验证的 `843c3e6` 一致，后续九个提交仅改变提交身份，补丁经 range-diff 核对不变。本节旧 SHA 保留为当时构建及验证证据的标识，历史由本地 `refs/backup/shortcut-rebase-20260919` 引用保留。
