# Agent Note: 评估用 useForm 收拢 Provider 表单字段

Status: rejected — useForm 未减少实际同步、校验或生命周期责任

## Problem

[主计划](../../implemented/architecture/2026-09-19-command-boundaries-and-modularization.md) 工作项 06。[AIProviderForm](../../../../src/features/provider-management/AIProviderForm.tsx) 维护十余个输入字段，并同时协调模型加载、连接测试和保存。字段容器可以简化，但双提交入口和回退更新也可能增加封装成本，本项是有退出条件的评估。

## Decision

在 [模型目录身份修复](../../implemented/bug-fix/2026-09-19-model-catalog-request-identity.md) 后，以小型原型评估 `useForm` 的 values、setValue、itemProps 和校验反馈。领域规范化和 profile 校验留在配置域；模型请求、连接测试、取消和测试指纹保留独立生命周期。依据来自 [API 审查](../../implemented/architecture/2026-09-19-raycast-api-alignment.md#model-loading-and-provider-forms)。

只有减少实际字段同步和校验代码时才落地。若双提交路径需要更多包装，记录理由并拒绝此提案；这不阻挡其他重构。不要为采用 hook 而改动保存策略、存储格式或动作顺序。

## Evaluation

已在安装版 @raycast/api 2.4.1、@raycast/utils 2.3.1 上完成可编译原型。生产 diff 为 +53/-68，473 行降至 458 行；11 个字段状态和绑定收进 useForm，预设 setters 合为 reset，但领域校验、模型加载、取消、测试指纹及双保存策略均保留。Dropdown 的字符串回调使原型需将 UI 值统一为 string，再在 profile 构建边界收窄 4 个枚举值。主保存走 handleSubmit，次保存仍直接调用 submit(false)。

同组 18 项真实表单消费者测试在原型和原实现上均通过；包括模型请求身份、保存、条件隐藏字段、预设、三路校验和 Native JSON 回退后的指纹。原型 tsc、局部 eslint 通过。根代理 review 后再执行 find-code-simplifications；直接使用 values、部分字段迁移或把领域校验移进 hook 都未证明能减少实际职责，因此保留显式字段状态。

原型已撤回，生产和现有测试无变更。新增 8 项用例仅作为实验对照，没有为已拒绝的实现扩大长期测试面。实验 patch 与日志保存在本机 /tmp/easydict-refactor-06-useform-prototype.patch、/tmp/easydict-refactor-06-evaluation.md 和 /tmp/easydict-refactor-06-baseline-consumer-tests.log。没有为撤回的实验运行全量 build 或原生验证；这些检查不构成现有产品行为的新验证。

## Alternatives considered

**保留显式字段状态。** 若更符合双提交和条件字段，是可接受结果；用实际 diff 而非 hook 名称判断。

**把所有交互状态纳入 useForm。** 请求身份、取消和测试指纹不属于输入值，会扩大状态容器责任。

## Acceptance criteria

- [x] 原型对照能说明减少了哪些字段同步或校验代码，或记录不采用的具体原因。
- [x] Test & Save、Save Without Testing、Test Provider 都保持正确流程和前两个动作的默认快捷键。
- [x] 预设切换、条件字段、手填模型、Native JSON 回退后的草稿更新及测试指纹一致。
- [x] 保存失败、取消、卸载和保存后返回行为保持一致，没有重复错误提示。
- [x] 采用实现时完成主计划的代码检查与原生验证；不采用时移至 rejected 并记录理由。

## Risks

将表单包装和业务校验重复维护可能增加复杂性。原型可独立撤回，不能要求其他工作项等待采用决定。
