# Agent Note: 分离查询结果与同步展示投影

Status: implemented

## Problem

[主计划](2026-09-19-command-boundaries-and-modularization.md) 工作项 09。[useQueryEngine](../../../../src/features/search/useQueryEngine.ts) 构造翻译展示，`queryReducer` 改写跨服务内容并保存详情开关，`displaySections` 再生成最终展示。原始结果、展示组合和可推导状态混在不同位置，修改隐藏与补充规则时容易造成不同步。

## Decision

建立纯函数、同步的展示投影，再移走 reducer 中相应的展示改写和可推导字段。保留 Provider 结果、请求生命周期状态与真实时序标记；展示投影不通过 effect 写入第二份展示 state。

建议在 [服务集合边界](2026-09-19-provider-catalog-and-runtime.md) 和 [公共结果契约](2026-09-19-module-ownership.md) 明确后实施，避免同时更改身份、路径与展示语义。不要求整个目标目录树或全部局部优化完成。

## Data contracts

| 边界          | 内容                                                     | 必须保持                                                 |
| ------------- | -------------------------------------------------------- | -------------------------------------------------------- |
| Provider 缓存 | Provider 返回结果及其自身词典 sections                   | 不混入其他服务补充，保持缓存身份、模式、有效期与清空代次 |
| 实时展示投影  | 当前结果、隐藏与跨服务组合规则、最终 sections 和详情开关 | 同步计算可见性、详情和复制内容                           |
| 收藏快照      | 查询完成后用户看到的最终展示                             | 保留组合后的离线内容，与查询缓存独立                     |

DeepL 补充 Linguee 标题属于展示组合，不能把 DeepL 内容写入 Linguee 的 Provider 缓存；下一次查询按当次可用结果重新组合。收藏需要保存当时完整展示，而非丢失跨服务补充的原始单 Provider 结果。

列表首次可见与 `listEpoch` 必须采用同一套可见性规则。自动播放标记、列表挂载代次、手动选择锚点与请求/缓存代次各有真实时序职责，不能一并视为冗余状态删除。

## Verification

沿用 [生命周期](../../../../src/features/search/useQueryEngine.test.ts)、`reducer`、`coupling`、[缓存](../../../../src/core/query/cache.test.ts) 和 [收藏快照](../../../../src/features/favorites/model.test.ts) 测试作为起点，补足返回顺序变化、缓存重放与展示落点的行为断言。原生显示、选择和挂载情况分别验证。

同批执行 [10 / T3](../testing/2026-09-19-test-surface-simplification.md#t3-展示断言归入最终投影)：将 helper/reducer 的 coupling 断言收敛到真实投影，删除最终展示不会消费的中间 Markdown 断言，用真实 Youdao 规则验证 section 门槛。listEpoch 完整矩阵归状态所有者，hook 保留精简接线测试；缓存层与请求层的清空保护继续分别验证。覆盖迁移完成后才删除旧 helper API 的测试。

## Alternatives considered

**effect 同步展示状态。** 会出现结果完成而展示尚未更新的时刻，可能保存错误收藏快照。

**缓存聚合展示或删除全部列表状态。** 前者污染单 Provider 缓存，后者混淆可推导数据与真实交互时序。

## Acceptance criteria

- [x] 不同返回顺序、流式更新、隐藏源翻译和缓存重放产生等价最终展示，纯投影没有副作用。
- [x] Provider 缓存无跨服务内容，收藏保存完成后的同步投影，详情与复制文本一致。
- [x] 列表首次可见、自动选择、手动锚点与自动播放条件保持一致；流式或新增服务不额外重挂载搜索框。
- [x] 最新请求继续独占流式更新、最终结果、缓存写入及 loading 清理；清空前请求不能回填缓存。
- [x] Strict Mode effect 重放、真实卸载与晚加载服务行为保持正确。
- [x] 完成主计划代码检查，记录两个平台的原生展示、导航与音频验证情况。
- [x] T3 的展示规则在最终投影集中验证，中间实现测试退役，列表接线与不同层的缓存保护没有遗漏。

## Risks

投影可能被调用于结果尚不完整的时刻，收藏保存边界必须明确。删除 reducer 字段前先建立等价行为证据，避免同时改写持久化格式或隐藏策略。

## Implementation decisions

投影以本次所有原始结果为输入。隐藏的 DeepL/Youdao 翻译仍作为词典补充源，隐藏规则仅抑制独立展示；详情自动开关继续读取全部结果，含隐藏的长译文。Linguee 非 Translation 的首节仍可能消费补充后的 Markdown 正文，不能把所有中间正文都认作无消费者。

同代次重新生成 Youdao 后若不再提供音标/考试信息，投影恢复 Linguee 自身值；旧 reducer 的持久改写会残留此前补充。当前输入决定展示是去除派生 state 的直接结果，需要用消费者输出验证，并保持原始缓存无突变。

独立候选暂缓：hook 在 final dispatch 后调用默认 flush 的 debouncer.clear，理论上最终文本与累计 chunks 不同时可能被覆盖。OpenAI adapter 显式保持相等，Raycast adapter 允许采用 AI.ask Promise finalText；官方类型没有保证相等，但本次尚未复现宿主差异。09 不混入此修复。

## Delivered verification

投影统一生成翻译条目、词典补充、最终正文、详情与可见性；reducer 不再保存补充后的词典结果或详情开关，翻译运行时结果移除 displaySections/hideDisplay。hook 在 dispatch 前保留空结果接纳边界，并以 queryResults 为 memo 输入。listEpoch 只在当前代次首次可见前调用同一投影判断，避免每个流式更新重复计算完整 Markdown。

元数据恢复的真实 hook 用例先在旧实现准确失败（仍显示旧 supplement/CET4），在投影实现上通过。冻结输入的纯函数测试、两种完成顺序、隐藏源补充、有道一节/两节门槛、非 Translation 首项正文、元数据合并、详情阈值与 profile identity 均已验证。hook 同时验证 Provider 缓存保持原始 sections、收藏保存完成后的补充内容、缓存重放不请求 Provider、stream key/listEpoch 稳定与空重生成不丢失已接受结果。

T3 已删除 couplingRules/hideRules 生产入口和旧 coupling helper 测试，最终展示断言归 displaySections.test.ts；reducer 保留原始 state 和完整 epoch 矩阵，hook 通过隐藏源先完成/缓存重放与流式接线验证 epoch，不再重复完整重置矩阵。取消、Strict Mode、清空缓存、晚加载服务和自动音频测试保留。

macOS Raycast 2.4.1.0 已用最终产物完成 hello 查询及重新查询，看到词典/AI 返回后的列表与补充内容、详情正文、旧收藏完整展示和返回导航；⌘⌥R 触发查询朗读并进入 AudioPlayer。未修改收藏。手动选择与流式交错的完整原生矩阵、Windows、OCR、冷启动时间与堆内存测量仍未完成，自动化用例不替代这些缺口。

根代理完整 review 后执行 find-code-simplifications，将两处无消费者契约的对象引用断言改为内容断言，未新增抽象。最终主工作区 lint、43 文件 / 299 项测试、build、diff 检查通过。

本阶段实现已由 [第二轮内容与持久化重构](2026-09-19-content-model-and-persistence.md) 替代，当前组合与展示入口为 `core/content/compose.ts`、`view.ts` 和 `render.ts`。
