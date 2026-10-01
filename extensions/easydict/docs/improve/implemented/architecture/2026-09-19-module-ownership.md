# Agent Note: 按职责归位功能模块与公共契约

Status: implemented

## Problem

[主计划](2026-09-19-command-boundaries-and-modularization.md) 工作项 08。重构前 components、hooks、types 与 ai-providers 分散了同一功能的维护入口；公共类型与厂商大响应类型之间还存在类型依赖循环。机械搬迁不能解决这些问题，应在命令与运行时边界明确后逐处聚合。

## Decision

在 [命令依赖隔离](2026-09-19-command-dependency-isolation.md) 和 [目录与执行分离](2026-09-19-provider-catalog-and-runtime.md) 明确边界后，迁移有实际归属收益的文件。每个小批次移动模块、测试及引用，保持行为与序列化格式，不等待所有局部简化，也不要求一次完成整棵目录树。

## Target ownership

```text
src/
├── easydict.tsx
├── favorites.tsx
├── manage-providers.tsx
├── ocr.tsx
├── features/
│   ├── search/                  # 页面、actions、输入选择、查询 hook
│   ├── favorites/               # 页面、模型、持久化和导出
│   └── provider-management/     # 页面、表单、测试与模型加载交互
├── providers/
│   ├── catalog.ts              # 轻量元数据
│   ├── order.ts                # 排序规则
│   ├── registry.ts             # 执行工厂装配
│   ├── profiles/               # 配置、持久化、预设、共享配置 hook
│   ├── translation/
│   ├── dictionary/
│   ├── detect/
│   └── shared/                 # 已有多个消费者的协议代码
├── core/
│   ├── query/                  # 状态、缓存和跨服务展示聚合
│   ├── results/                # 轻量契约与共用结果渲染，分开入口
│   ├── detect/
│   ├── language/
│   ├── audio/
│   └── stroke-order/
└── shared/                     # HTTP、错误、日志等通用工具
```

目录树表达目标归属，未涉及的目录可以继续存在。每次迁移先确认真实消费者，不能为了填满目录而增加包装层。

## Dependency rules

- 命令入口读取对应功能；跨模块使用明确文件入口，纯类型使用 type-only import。
- [useAIProviderProfiles](../../../../src/providers/profiles/useAIProviderProfiles.ts) 同时服务搜索与管理，放在配置域的明确 React 入口；配置类型、校验和持久化不反向导入 hook。
- 搜索保存收藏可以读取收藏模型和保存能力，该入口不顺带导入收藏页面。
- 查询输入、结果基础结构和图标描述成为轻量契约，不依赖具体 Provider 类或厂商响应大类型。保留 Provider 专属判别值及存储枚举语义。
- `core/results` 的契约入口和 Markdown/图标渲染入口分开；`core/query` 继续负责实时聚合，结果渲染仅共享搜索与收藏真正共用部分。
- AI 词典 prompt、parser 和结果模型已迁到词典实现；[词典候选判断](../../../../src/providers/profiles/dictionaryCandidate.ts) 同时影响翻译路由，保留在双方可依赖的策略模块。
- Provider payload、解析与词典 sections 保持厂商所有权；shared 协议代码须有多个真实消费者。

## Test simplification

收藏批次执行 [10 / T4](../testing/2026-09-19-test-surface-simplification.md#t4-收藏测试减少自制-hook-与手工编排)，优先把自制 useLocalStorage fake 下移到宿主边界，只有净减少模拟成本才采用完整替换。若产生真实展示 selector，改测其笔顺编排，删除测试内复制的页面接线；没有该边界时暂缓，不专为测试增加生产 helper。T6 合法 profile fixture、T7 重复 headers 和 T8 收藏占位 fixture 可同模块随行或独立整理，具体依据与验证只在 10 维护。

所有有效测试随模块移动，路径变化本身不构成删除依据；搬迁与测试行为调整分别呈现。parser、迁移、数据恢复和跨平台测试保留，不扩展为统一测试框架。

## Alternatives considered

**完成整个目录树后再交付。** 大量路径变化会遮蔽行为差异，采用有明确归属收益的小批次。

**把共享配置 hook 放进管理功能或统一所有结果结构。** 搜索依赖配置但不应依赖管理页面；各 Provider 的真实响应差异也不需要抹平。

## Acceptance criteria

- [x] 每批列明移动模块、真实消费者与责任边界，行为修改另行交付；未移动部分明确保留。
- [x] 轻量契约无厂商响应类型循环，纯配置不依赖 React hook，搜索不因模型入口加载收藏或管理页面。
- [x] 序列化字段、判别值、配置与收藏格式不变；迁移后 AGENTS、测试及文档链接正确。
- [x] 逐命令核查无依赖回流或 bundle 膨胀，完成主计划代码检查。
- [x] 已确定范围的迁移完成即可交付；未证明收益的路径调整不阻挡展示投影工作。
- [x] T4 的真实边界替换或局部精简有成本依据；随行测试调整符合 10 的覆盖映射，机械搬迁未丢失有效测试。

## Risks

机械替换 imports 可能重新引入总出口或运行时循环；需要检查出码依赖。与其他工作项触及同一文件时按顺序合入，避免同时做路径迁移和协议调整。

## Delivered batches

### 08a — result contracts and shared rendering

query/display 契约合并到 core/results/types.ts，request/display 判别值集中到无依赖 kinds.ts，图标描述不再依赖 profiles。Markdown、图标和 appearance 分为明确渲染入口，没有总出口或旧路径转发；厂商 payload 留在 Provider 内。AGENTS 和实际消费者引用同步更新，既有测试随迁移。

根 review 核对完整 types/kinds、厂商 payload 和渲染入口；非 import AST 对照确认 167 个保留/迁移文件的内容一致（仅归一化 appearance mock 路径），22 个结果/图标声明和 7 个 kind 声明完全一致。没有新增搬迁测试或提前删除 09 的字段。

08a 的后置 find-code-simplifications 未发现需扩展的强候选；最终 lint、43 文件 / 281 项测试、build、diff 检查通过。正式产物为 easydict 1,598,725、favorites 425,340、manage-providers 223,216、ocr 7,680 字节，Provider 映射依赖分别为 50/0/13/0；与 02 相比无依赖回流，微小体积变化来自符号及已合入快捷键修改。

### 08b — feature and provider ownership

按职责归位 60 个文件：查询 UI/actions/hooks 进入 features/search，收藏模型/持久化/导出/页面进入 features/favorites，管理表单/模型发现/测试指纹进入 features/provider-management。共享配置与 React 入口进入 providers/profiles，词典 prompt/parser/payload 回到 providers/dictionary/ai，HTTP/错误/日志/加密进入 shared。StrokeOrderPage、types/preferences 和 core 的已有职责保留，没有新 façade 或总出口。

独立工作树先完成 root review、find-code-simplifications 和验证；随后在 09 最终代码上重放移动与 import 脚本，没有复制旧正文。主工作区 168 个源码/测试文件的非 import AST 保持不变，文件总数不变。T4 单独 review 后采用真实 useLocalStorage，删除自制 React hook/注入桥和未使用方法；原 7 项行为契约保留，验证真实加载、JSON 持久化、顺序更新和重新挂载。没有实际收藏展示 selector，笔顺手工接线候选继续暂缓。

最终 lint、43 文件 / 299 项测试、build、diff 检查通过。四命令 source map 经旧新路径归一化后与 09 完全相同，无新增或缺失出码模块；正式产物字节为 easydict 1,597,495、favorites 425,340、manage-providers 223,216、ocr 7,680。profiles 迁进 providers 使目录统计数上升，但不表示新增执行依赖。AGENTS、两篇维护的 Provider 开发文档和 improve 链接已同步。

macOS 最终产物已验证查询/详情/返回、既有五条收藏及旧快照、管理页状态与表单打开，以及独立朗读与重新查询快捷键。没有修改配置或收藏。Windows、OCR、完整原生流式手动锚点矩阵、冷启动与内存量化保留验证缺口。
