# Proposal

## Why

准备上架 Raycast Store（面向全球用户）：审核对 UI 语言有硬要求（界面文案英文为绝对主流，Store 竞品全部纯英文），且中文文案散布在命令 description、界面文案（EmptyView/Toast/subtitle/placeholder）、README 三层。用户已注册 Raycast 账号（用户名 `caitale`），本 change 完成上架前的全部代码与仓库准备工作。

## What Changes

- **改名 "Dev Toolbox" → "Tiny Dev Tools"**（Store 已有同名 Dev Toolbox 扩展、DevKit/toolkit 语义邻近、Quick 前缀蹭官方嫌疑——多轮查证后定案；`name: tiny-dev-tools`）
- **manifest（package.json）**：`author` 改为 `caitale`（注册用户名，审核 bot 校验项）；`keywords` 补充（json, base64, hash, jwt, case, timestamp, url, converter, password, types, typescript, decoder）；**顶层 `description`**（Store 列表第一屏）与 9 个命令 `description` 全量英文化；`$schema` 验证存在（现状已有）；`@raycast/api` 升至 **1.x 最新**（npm update 语义内；2.x major 升级单独立项，不在本 change）
- **用户可见文案全量英文化**（实证 ~164 处中文字面量：9 个 tsx + `src/lib/pure.ts` 两处用户可见返回值）：
  - tsx：EmptyView、Toast、subtitle、placeholder、Action title（复制→Copy、粘贴到前台应用→Paste to Frontmost App）、预设/语言行、List.Section、时间单位（秒→s/毫秒→ms/微秒→µs）
  - **pure.ts 三类**（审查发现的关键遗漏）：`fmtRelative` 返回值（"刚刚/3 分钟前/1 天后"→"just now / 3 minutes ago / in 2 hours"，完整格式非缩写）、`jwtStatus` 四态 label（已过期/尚未生效/有效/无过期时间，L472-480）、`b64Decode` 异常消息（展示于 Failure Toast）
  - 调试路径：prefill.ts 的 DEBUG Toast detail 一并处理
  - 范围含模板字符串与单引号属性（实测另有 ~20 处：Toast `已解码 N 轮`、`复制${label}`、List.Section 标题等）
  - 翻译原则：技术术语原样（camelCase/Base64/HS256）、标签短促（Store 风格）、中文注释保留（开发者内部）
- **README 重构为双语**：英文在前（Store 页面直接引用 GitHub README，全球用户第一入口：简介、9 命令清单、安装、开发指南），中文在后（既有项目文档完整保留）
- **上架准备清单**：
  - `.workbuddy/` 卫生确认（实证：**从未被 git 跟踪**、.gitignore 已含——本项为验证性步骤而非操作）
  - git 历史扫描（密钥模式 + 内网 IP 段模式；提交信息全中文保留——历史不重写）
  - `metadata/` 目录占位（截图任务在英文化后由用户执行：PNG 2000×1250、screenshot-1.png 起、最多 6 张、用 Raycast Window Capture）
  - package-lock.json 变更随 API 升级一并提交（官方要求 lock 入库）
- **smoke 断言**：4 条 `fmtRelative` 断言（L82-85，硬编码中文返回值"刚刚/1 分钟后/1 天前"等）随翻译同步更新为英文期望值；其余断言（数据/结构类）零影响；断言总数 155 不变（实测 grep 157 个 assert 调用点，运行计数 155——口径差为 try 块内不执行路径，既有现象）

明确不做：

- 运行时多语言切换（i18n 框架）：Raycast 生态惯例是单一语言发布，违背零依赖基因，收益为零
- 命令内部标识符（name 字段如 `timestamp`/`hash`）变更——只改 title/description 展示层
- 中文注释转英文（内部代码文档，不影响审核）
- 截图本身（需要英文界面运行态，由用户在英文化合入后执行；本 change 交付占位与指引）
- 提审（`npm run publish` 由用户执行，需 GitHub 交互认证；本 change 交付"可提审状态"）

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `extension-packaging`: 「manifest 满足 schema」Requirement 扩展为上架就绪（author 注册用户名、keywords、命令描述英文化、$schema、API 版本最新）；携带原场景

## Impact

- 代码：`package.json`（author/keywords/9 descriptions/API 版本）、9 个 `src/*.tsx` 文件文案（~60 处）、README 重构
- 仓库：`.workbuddy/` 验证性确认（从未被跟踪、ignore 已含——无 git 操作）
- 测试：smoke 零变更（断言不含中文字面量，需验证确认）
- 文档：README 双语化
- 无行为变更：所有交互逻辑、预填、验签、复制动作完全不变，仅展示字符串替换
- CI：lint/typecheck/smoke/build 四道闸门照常（文案变更后全绿才合入）
