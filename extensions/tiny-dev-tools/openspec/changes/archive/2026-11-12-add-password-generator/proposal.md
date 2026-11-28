# Proposal

## Why

工具箱现有五个命令均为「文本 ⇄ 文本」变换类，缺少**生成器**类能力。密码生成是开发者高频刚需（注册测试账号、生成 API key、配置服务凭证），用户目前需要离开 Raycast。参考对象 LastPass generator 的核心功能（长度/字符类调参、Easy to say/read 预设、强度指示、passphrase）与本项目基因完全兼容：随机源用 Node 内置 `crypto.randomBytes`（加密安全、零新增依赖）、词表为纯数据文件、全部逻辑可进 `pure.ts` 被 smoke 覆盖。Raycast Store 竞品（Password Generator by joshuaiz 等）均无「命令内交互调参 + 密码/passphrase 双模式 + 实时强度」的组合，存在生态空档。

## What Changes

- **新命令 `password-generator`**（List 模式，复用 hash 的 List 交互经验）：
  - 搜索栏输入数字调整长度（密码 8~64，默认 16；passphrase 词数 3~8，默认 6；仅当输入整体为十进制整数时生效，否则忽略；空输入用默认值）
  - **三档预设行**（对应 LastPass Easy to say / read / all）：`易读出`（仅字母）/ `易阅读`（字母+数字，排除歧义字符）/ `全部字符`（大小写+数字+符号，默认档）；**↑↓ 仅导航，回车选用**，选用后立即重生成；预设仅影响密码行
  - **密码行**：回车复制；快捷键一次性重新生成密码与 passphrase
  - **Passphrase 行**：随机单词 + 连字符连接（内置 1024 词表，每词恰 10 bits，默认 6 词 = 60 bits 中档）
  - **强度行内展示**：熵（bits）与弱/中/强档位并入 subtitle；弱档提示增加长度/词数
- **`src/lib/pure.ts` 新增纯函数**：`parseLengthInput(query)`（搜索串 → 解析出的十进制数值或 null，钳制由调用侧按密码/词数各自执行）、`generatePassword(opts: { length; preset })`（preset 三值枚举驱动字符类，v1 不暴露自由四类开关）、`generatePassphrase(wordCount, wordList)`、`estimateBits(count, poolSize)`；随机源为 `crypto.randomBytes` 拒绝采样（禁 `Math.random`）
- **词表数据**：新增 `src/lib/wordlist.ts`（内置 1024 个常见英文短词，纯数据常量；2 的幂规模使每词熵恰为整数）。不引 EFF 7776 词全文（数据量收益不成比例，v1 不值）
- **smoke 断言**：结构性质断言（长度、字符集约束、必含各类 ≥1、熵计算、解析钳制）+ 源码扫描断言（pure.ts 无 `Math.random`）——随机输出不可断具体值
- **README / package.json**：注册命令、功能清单、架构图同步（顺带修正 README 残留的过期断言数 42 → 实际 47）

明确不做：

- 可发音密码（音节模型复杂度高、现代场景 passphrase 更优）
- 生成历史 / 密码库存储（vault 是密码管理器的职责）
- zxcvbn 强度评估（外部依赖 ~800KB，熵估算替代）
- 预设外自由字符类多选（三档已覆盖高频场景，等真实需求）
- 密码长度与词数分开调参（共用同一搜索数字，见 design 取舍）
- 生成偏好持久化（LocalStorage 记住上次设置）
- Auto-fill / 零知识加密（越界，LastPass 本体的领域）

## Capabilities

### New Capabilities

- `password-generator`: 密码生成命令的交互契约——长度调参、三档预设（回车选用）、密码/passphrase 双模式、熵强度指示、加密安全随机源

### Modified Capabilities

（无——纯新增命令，不触碰现有五个命令与四个 spec）

## Impact

- 代码：`src/lib/pure.ts`（+4 纯函数）、新增 `src/lib/wordlist.ts`（纯数据）、新增 `src/password-generator.tsx`（List 模式，约 120 行）
- 构建/清单：`package.json` commands 追加 `password-generator`
- 测试：`scripts/smoke.ts`（+14 断言，47 → 61）
- 文档：`README.md`
- 随机安全：全部随机性来自 `crypto.randomBytes`（CSPRNG）；生成结果不写入扩展自身的任何持久存储（LocalStorage/文件/网络）
- 无对外 API 变化；纯增量，回滚 = 删除新增文件 + revert package.json
