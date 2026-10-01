# Agent Note: 隔离命令依赖并建立运行基线

Status: implemented

## Problem

[主计划](2026-09-19-command-boundaries-and-modularization.md) 工作项 01。[FavoriteWordsPage](../../../../src/features/favorites/FavoriteWordsPage.tsx) 原先从 hooks 总出口读取收藏 hook，间接引入查询引擎、注册表与 Provider。Raycast 为各命令独立打包，共享源码不等于共享运行实例，导入的副作用也会随命令发生。

前期调查所用 `@raycast/api 2.1.3` 的 CLI 使用独立入口、`entryNames: "[name]"`、`bundle: true`，未开启代码分割，Raycast API 与 React 等被 external 排除。此前使用其关键配置进行 `write: false` 的内存对照，仅将收藏 hook 改为直接导入：压缩 JS 从 1,531,524 字节降至 425,340 字节，实际出码的 `src` 模块从 73 个降至 23 个，Provider 模块从 38 个降至 0 个，有道 Cookie 顶层初始化调用消失。没有执行产物或修改源码；它不是正式构建或启动耗时测量，也不是目标缩减比例。

## Decision

将跨功能 hooks 导入改成明确文件入口，删除无人使用的总出口。先交付这一最小改动，记录四个命令的依赖与初始化行为。注册表切分属于 [工作项 02](2026-09-19-provider-catalog-and-runtime.md)，目录归位属于 [工作项 08](2026-09-19-module-ownership.md)，不混入本项。

## Scope and verification

| 命令               | 最终边界                                     | 本项验收与后续归属                               |
| ------------------ | -------------------------------------------- | ------------------------------------------------ |
| `easydict`         | 查询、检测、配置、展示、收藏操作、音频和笔顺 | 保留完整能力，记录基线；显式服务装配由 02 完成   |
| `favorites`        | 收藏存储、快照渲染、音频、笔顺和启动查询命令 | 本项切断 hooks 带入的查询引擎与无关 Provider     |
| `manage-providers` | 轻量目录、配置、模型发现及真实 AI 连接测试   | 本项记录路径；管理页和配置加载器的解耦由 02 完成 |
| `ocr`              | OCR 平台调用、结果处理与 `launchCommand`     | 保持薄入口，记录其依赖和平台 guard               |

按实际出码模块检查四个入口，核验顶层副作用；动态 `import()` 不能直接视为体积优化。正常浏览收藏不触发无关 Provider 初始化，音频等用户操作所需请求仍允许。查询仍须在实际请求前准备必要配置和 Cookie；若需要预热，由查询生命周期显式承担。

诊断方法沿用 [API 审查](2026-09-19-raycast-api-alignment.md#runtime-diagnostics-and-rendering)：记录 OS、桌面版本、API/utils 包版本，同一运行时比较 bundle、首个可见结果时间与流式行为。按需在配置加载、收藏反序列化和结果聚合边界使用 `captureMemorySnapshot`；仅在启用 memory reporting 时计入内存证据，不为单个 token 增加检查点。

## Alternatives considered

**只移动目录或统一改为动态导入。** 两者都不能直接证明依赖或产物减少。先采用已由内存实验验证的直接导入，再检查正式构建。

**同时完成所有注册表和目录迁移。** 会扩大 diff，降低这项低风险改动的独立可审查性，后续分别交付。

## Verification

实施基线为 `ca778c4`；当前 macOS Raycast 2.4.1.0、API 2.4.1、utils 2.3.1、esbuild 0.28.2。正式 `npm run build` 在相同版本和 dist 模式下构建，产物位于 Raycast 扩展目录；以下模块数来自正式 source map 的映射源码，不是额外打包器的输入计数。

| 命令             | 改动前 JS 字节 | 改动后 JS 字节 | src 映射模块（前 → 后） | Provider 映射模块（前 → 后） |
| ---------------- | -------------- | -------------- | ----------------------- | ---------------------------- |
| easydict         | 1,599,590      | 1,599,590      | 103 → 103               | 46 → 46                      |
| favorites        | 1,531,524      | 425,340        | 73 → 23                 | 38 → 0                       |
| manage-providers | 1,330,361      | 960,759        | 86 → 67                 | 46 → 39                      |
| ocr              | 7,680          | 7,680          | 2 → 2                   | 0 → 0                        |

代码 review 确认三个消费者只改变 import 路径，删除总出口，没有行为分支修改；随后按 find-code-simplifications 搜索全部消费者，未发现残留总出口引用或需要新增的包装。收藏产物不再包含有道 Cookie 模块；查询仍保留该初始化路径。管理页剩余执行依赖由 02 处理。

`npm run lint`、`npm test`（42 文件 / 260 项）、`npm run build`、`git diff --check` 通过。lint 最初因沙箱 DNS 无法验证 schema/作者失败，在允许联网的同一命令重跑后通过。macOS 原生收藏页已打开并显示现有五条收藏及详情，未修改收藏数据。

原生验证缺口：尚未量化冷启动和内存，没有 Windows 环境；音频、笔顺交互、OCR 与其他命令的完整原生回归留在集成验收中。字节数下降不作为耗时或内存改善的结论。前后正式产物和 source map 暂存于 `/tmp/easydict-refactor-evidence/01-before` 与 `01-after`。

## Risks

管理页和配置加载器仍可能带入完整注册表，这是 02 的范围，本项完成不能宣称所有命令已完全隔离。运行时版本变化也会影响性能，应单独记录。源码复用不能提供跨命令 JavaScript 单例。
