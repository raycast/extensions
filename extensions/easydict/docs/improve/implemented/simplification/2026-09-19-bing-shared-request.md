# Agent Note: 共享 Bing 检测与翻译的请求流程

Status: implemented

## Problem

[主计划](../architecture/2026-09-19-command-boundaries-and-modularization.md) 工作项 04。[Bing 检测](../../../../src/providers/detect/bing.ts) 与 [Bing 翻译](../../../../src/providers/translation/bing.ts) 重复维护配置获取、IID、表单 POST 及保留请求体的手动跳转。

## Decision

在 `providers/shared/` 提取接收文本、语言与 signal 的小型请求函数，集中确实相同的协议步骤。检测和翻译继续拥有各自响应解析、错误与有限重试；通用基类继续做最终错误规范化。

本项有两个真实消费者，可独立交付，不依赖目录迁移或注册表重构。不引入新的客户端框架，也不把不同错误和重试策略强行统一。

## Alternatives considered

**保持两份流程。** 协议修复仍需同步两个消费者。

**提取包含解析和重试的通用 Bing 客户端。** 两种用途的策略并不一致，小型请求函数足以消除已确认重复。

## Verification

已提取 [bing-request](../../../../src/providers/shared/bing-request.ts)，检测和翻译共享一次配置/IID 分配及保留 body/signal 的跳转请求。各自解析和翻译最多三次重试保持原位，移除检测中空的 host 判断分支。生产代码净减少 45 行。

代码 review 确认请求和解析边界保持一致；随后 find-code-simplifications 确认两个真实调用方、私有跳转函数、无新增状态或死导出，没有进一步高价值候选。新增 11 项协议测试在原实现与抽取后均通过，使用真实配置逻辑与两个 Provider，仅 mock 网络和宿主边界。

主工作区 `npm run lint`、`npm test`（43 文件 / 275 项）、`npm run build`、`git diff --check` 通过。未执行真实 Bing 网络请求；冷启动实际网络与原生表现仍需在集成环境验证，mock 结果不作为服务可用性保证。

## Risks

看似相同的请求外壳可能隐含不同重试边界；抽取前确认一次调用的责任范围。现有测试不足以自动证明共享协议正确，需要针对请求边界的覆盖。
