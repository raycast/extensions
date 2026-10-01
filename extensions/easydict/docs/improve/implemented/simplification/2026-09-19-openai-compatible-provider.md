# Agent Note: 合并单一实现的 OpenAI-compatible 专用抽象

Status: implemented

## Problem

[主计划](../architecture/2026-09-19-command-boundaries-and-modularization.md) 工作项 03。原专用基类 只有 [一个具体子类](../../../../src/providers/translation/ai/openai-compatible.ts)，配置 getter 从同一 profile 取值，默认 token 实现始终被覆盖。两层结构没有实际复用收益。

## Decision

将专用基类和具体类合并，由具体实现直接继承通用流式基类。通用基类继续负责计时、取消和最终错误规范化；本项不更换流式库、Provider 协议、数据格式或 AI 词典解析。

本项可独立交付。与目录迁移涉及同一文件时，先交付行为保持的合并，再移动路径，避免同时修改。

## Preserved behavior

保持 endpoint 规范化、model/key、token 参数、headers、prompt、流式片段和最终返回。现有错误翻译、取消和协议恢复继续归于原有责任边界；不能为了删除一层继承复制通用基类逻辑。同步 AGENTS 中的入口路径。

[测试审查](../testing/2026-09-19-test-surface-simplification.md#coverage-to-retain) 未发现只服务于 protected getter 的冗余测试；保留现有公开 request 契约，随类合并调整入口。当前测试 collect helper 不读取 async generator 的最终 return，须验证最终结果及取消契约，不能把删除继承层解释为减少有效协议覆盖。

## Alternatives considered

**保留单一实现的专用基类。** 增加读取路径，却没有当前复用者。

**统一所有 Provider 为新的客户端框架。** 会扩大协议与错误行为的调整范围，保留现有通用模板方法已经足够。

## Verification

代码 review 逐项比较 endpoint/key/model 规范化、token 参数、headers、prompt、流式片段、最终返回和基类错误路径，未发现阻断问题。随后 find-code-simplifications 确认专用基类及四个 getter 无残余消费者，删除迁入文件后不再有跨文件消费者的结果类型 export；未增加生命周期状态或协议框架。

公开 request 测试由 2 项增至 6 项，新增契约先在原实现上通过，再验证合并结果；最终覆盖两种 token 参数、片段和 generator 最终 return、取消与错误规范化。原 keyless 与每次请求的 headers/session 覆盖保留。生产代码减少 30 行，删除一个专用抽象文件。

主工作区 `npm run lint`、`npm test`（42 文件 / 264 项）、`npm run build`、`git diff --check` 通过，AGENTS 入口已同步。未执行真实付费模型调用；协议证据来自公开 request 和外部流接口边界测试，原生流式显示留给集成验证。

## Risks

继承顺序、默认值和 `return`/流片段处理可能在机械合并中改变；逐项比较请求与返回契约，不以编译通过代替协议验证。
