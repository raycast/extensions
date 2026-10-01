# Agent Note: 分离 Provider 元数据、排序与执行装配

Status: implemented

## Problem

[主计划](2026-09-19-command-boundaries-and-modularization.md) 工作项 02。[ProviderManagementPage](../../../../src/features/provider-management/ProviderManagementPage.tsx) 和 [配置加载器](../../../../src/providers/profiles/configuration.ts) 只需排序候选等元数据，却导入 [执行注册表](../../../../src/providers/registry.ts)，进而带入具体实现。[翻译](../../../../src/providers/translation/index.ts) 和 [词典](../../../../src/providers/dictionary/index.ts) 分类注册表先计算顺序，总注册表又执行全局排序；生产分类 resolver 调用始终传入全局顺序。

## Decision

引入轻量 `providers/catalog.ts` 与排序模块 `providers/order.ts`，由 `registry.ts` 绑定执行工厂、运行条件及能力。名称、分类与默认顺序只在 catalog 定义，以类型约束校验目录和工厂对应。管理页与配置加载器都读取轻量入口；管理页真实 AI 测试仍直接使用所需适配器。

由功能装配处显式传入服务集合，删除 [useQueryEngine](../../../../src/features/search/useQueryEngine.ts) 的隐式默认执行注册表依赖。建议在 [命令隔离](2026-09-19-command-dependency-isolation.md) 建立基线后交付；不等待局部 Provider 简化或全仓文件迁移。

## Runtime contracts

`providerKey` 表示可排序身份，`serviceId` 表示独立请求与结果。同一 AI profile 的 `profile:<id>` 与 `profile:<id>:dictionary` 共享一个排序身份，请求、结果和取消仍分开。

保留现有服务集合更新规则：AI 配置未完成时先运行内置服务；新出现的服务 ID 可加入当前查询；已有 ID 的配置更新不重启当前请求，下次查询生效；单服务重新生成使用最新配置。Native JSON 回退会保存并重新加载配置，这种集合更新也不得触发全部重查。

统一运行时排序，但保留 `profile.order` 与 `providerOrder` 的持久化格式；前者仍有缺省排序消费者。网页 actions 读取分类、类型和 URL 能力时不应重新承担排序，既有操作顺序保持不变。

保留 repository 实例内写队列和配置加载去重。JSON 回退也是写入者，管理命令不是唯一入口。配置重新加载可以来自当前实例的操作；跨命令共享存储不等于共享队列，不增加尚无复现依据的锁或后台服务。

## Test simplification

同批执行 [10 / T2](../testing/2026-09-19-test-surface-simplification.md#t2-注册表测试收敛到目录和真实装配)：删除分类 resolver fallback 对应的旧测试入口，用真实混排装配验证两类身份及顺序，随后合并 helper-only 场景。隐式启用与删除 profile 不恢复偏好 AI 的行为保留。查询和配置测试移除旧注册表 mock，查询显式提供服务集合，并使用真实错误分类；不删除晚加载、重生成与取消覆盖。

## Alternatives considered

**只改管理页 import。** 配置加载器仍可通过共享配置 hook 绕回执行注册表，因此两条路径都必须处理。

**查询开始时冻结服务或配置变化时全部重查。** 分别会遗漏晚加载的 AI 服务，或因回退及配置更新产生重复请求。

**同时删除持久化排序字段。** 涉及缺省和格式转换，超出本项运行时排序职责。

## Verification

- [x] catalog 不导入具体 Provider；目录与工厂对应完整，名称和默认顺序无第二来源。
- [x] 管理页及配置加载器两条路径均不再引入完整内置执行注册表；AI 连接测试仍调用真实适配器。
- [x] 默认顺序、自定义混排、添加、复制、删除、停用、模式切换和网页动作保持现有行为。
- [x] 两种身份保持区分；晚加载加入、已有 ID 修改、JSON 回退重载和最新配置重新生成通过消费者层验证。
- [x] 旧请求不提交流式结果、最终结果、缓存或 loading 清理；配置与收藏格式、异常数据恢复语义不变。
- [x] 逐命令复查依赖与初始化，完成主计划的检查要求。
- [x] T2 的旧入口、mock 和重复断言在替代覆盖成立后退役；测试期望独立于被测排序实现。

## Risks

目录与工厂可能演变为重复配置源；执行注册表只绑定需要执行依赖的内容。服务数组引用改变也不等于服务身份变化，不能由引用变化决定重查。现有 [查询生命周期测试](../../../../src/features/search/useQueryEngine.test.ts) 与 [配置测试](../../../../src/providers/profiles/configuration.test.ts) 是验证起点，不自动证明重构正确。

## Consequences

轻量 catalog、order、web 入口已落地；分类注册表只绑定执行工厂，全局 registry 只排序一次。useQueryEngine 显式接收 snapshot，同 ID 配置更新不重启当前请求、重新生成和下次查询使用最新配置由消费者测试覆盖。运行时两类身份和持久化字段保持原样。

根代理 review 后执行 find-code-simplifications，删除已由真实装配覆盖的手工排序用例及排序模块的转发导出。T2 移除分类 fallback 测试和旧 registry/error mock，保留真实装配、隐式启用、删除 profile、取消和晚加载覆盖。

正式产物与 01 后对比：easydict 1,599,590 → 1,598,713 字节（含已合入的 03–05）；favorites 425,340 字节不变；manage-providers 960,759 → 223,214 字节；ocr 7,680 字节不变。管理命令 source map 只含 catalog/order 及真实连接测试所需的 AI 适配器、基类和共享 headers，不含内置执行 registry、Youdao/Linguee 解析器或其他内置翻译实现。证据位于 /tmp/easydict-refactor-evidence/02-after。

集成阶段在 macOS Raycast 2.4.1.0 打开管理页，确认既有内置/AI 混排、启停状态、DeepL 经 Linguee 隐式启用、有道间接启用显示，以及 Raycast AI 编辑表单与现有模型加载。没有修改配置、排序或保存；Windows 环境不可用。

最终 npm run lint、npm test（43 文件 / 281 项）、npm run build、git diff --check 均通过。
