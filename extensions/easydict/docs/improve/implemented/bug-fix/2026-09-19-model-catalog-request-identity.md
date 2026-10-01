# Agent Note: 按稳定目录身份加载 AI 模型

Status: implemented

## Problem

[主计划](../architecture/2026-09-19-command-boundaries-and-modularization.md) 工作项 05。[AIProviderForm](../../../../src/features/provider-management/AIProviderForm.tsx) 的 modelCatalog 对象依赖 API key，重建会重置已加载标记；[模型目录](../../../../src/features/provider-management/modelCatalog.ts) 对公共目录的 loadKey 却不包含密钥，存在目录身份未变仍重复加载的调用链。当前 [目录测试](../../../../src/features/provider-management/modelCatalog.test.ts) 不覆盖完整表单生命周期，实施前需补实际消费者的失败复现。

## Decision

统一 catalog、请求调度与缓存使用的身份规则。公共目录排除不影响结果的凭据变化，受保护目录保持端点与凭据隔离。让成功加载记忆和正在加载标记跟随稳定身份，而不是对象引用；保留 [modelDiscovery](../../../../src/features/provider-management/modelDiscovery.ts) 的既有缓存语义。

修复先独立交付，再评估 `usePromise` 是否能简化专用模型加载 hook。与 [表单简化](../../rejected/simplification/2026-09-19-provider-form-state.md) 按此顺序处理，避免用新状态容器掩盖原回归。

## Request contract

保持 300 ms 延迟、焦点与定时触发去重、失败重试和卸载取消。端点切换不显示旧端点模型，迟到响应不覆盖新目录，当前目录的缓存可以作为初始显示。身份不变时仍需保证后续显式操作能取得最新配置。

[API 审查](../architecture/2026-09-19-raycast-api-alignment.md#model-loading-and-provider-forms) 已核对 `usePromise` 的 abortable、execute 和调用代次；它不自动提供目录级成功记忆或焦点去重。若采用，显式错误处理保留现有提示，不重复触发默认 Toast。不能额外套入会重请求的 SWR 缓存。

## Test simplification

同批执行 [10 / T1](../testing/2026-09-19-test-surface-simplification.md#t1-模型目录使用真实规则与加载消费者)：移除目录测试中自行实现的公共端点判定，仅 mock 网络和 Cache 边界。真实加载消费者先复现回归，再承接公共目录改 key 与私有目录无 key 的行为检查，之后合并只锁定 loadKey 形态的旧断言；保留 discovery 的鉴权/缓存隔离及模型 ID 规范化测试。

## Alternatives considered

**只增加 useMemo。** 当前已有 memo，问题是身份定义与失效条件不一致，继续缓存对象不能解决契约。

**直接整体改写为官方 hook。** 会把回归修复和状态迁移混在一起；先用失败测试固定行为，再决定封装。

## Verification

真实 AIProviderForm 测试先复现 Zen base 与 Go completion URL 的公共目录改 key 重复请求，修复前两项均以“预期一次、实际两次调用”失败。catalog 复用既有缓存身份，分离 key 与 canLoad；表单按 key 选取显示数据、重置和取消，缓存格式不变。移除 catalog 测试中的端点 allow-list 替身和已由消费者承接的 loadKey 断言。

代码 review 确认公共/私有身份、等价 URL、目录切换、旧响应和 finally 所有权；随后 find-code-simplifications 确认剩余显示 key、成功记忆、进行中标记及 controller 各有独立职责，无继续合并的强候选。保留显式生命周期：usePromise 仍需补足 300 ms、成功记忆、焦点去重及目录缓存选择，不能形成明确净简化；06 字段评估独立进行。

主工作区 `npm run lint`、`npm test`（44 文件 / 283 项）、`npm run build`、`git diff --check` 通过。消费者测试覆盖公共/私有目录、缓存隔离、延迟与焦点去重、失败重试、无效 URL 原有提示、切换目录和卸载取消。真实原生表单交互及 Windows 仍留作集成验证，测试不宣称验证了原生控件呈现。

## Risks

过度稳定身份可能忽略真实端点或凭据变化；仅按对象引用失效又会重复加载。需要分别测试两种目录和交互路径，不能仅验证 loadKey 字符串。
