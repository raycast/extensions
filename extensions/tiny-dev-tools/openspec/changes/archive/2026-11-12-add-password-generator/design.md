# Design

## Context

项目已有五命令与四 spec，两次 List 化重构（timestamp 原生、hash 刚完成）沉淀了「搜索栏即输入 + List.Item 行级复制」的成熟交互范式。本 change 新增生成器类第一个命令，复用该范式。随机安全是本命令的特殊关注点：密码生成的随机性必须来自 CSPRNG，`Math.random` 不可接受。

## Goals / Non-Goals

**Goals:**

- LastPass generator 核心能力落地：长度调参、三档预设、passphrase、强度指示
- 随机源全程 `crypto.randomBytes`，零外部依赖
- 生成逻辑（含搜索串解析与钳制）全部下沉 pure.ts，smoke 以结构性质断言覆盖
- List 交互与 timestamp/hash 一致（↑↓ 导航、回车执行行级动作）

**Non-Goals:**

- 可发音密码、生成历史、vault 存储、zxcvbn、偏好持久化、auto-fill、预设外自由字符类多选（见 proposal 不做清单）

## Decisions

### 1. List 而非 Form：搜索栏数字调长度

生成器是「无输入浏览 + 轻调参」场景，List 天然契合：打开即出结果（空搜索=默认参数），输数字立即变长度。hash 的 `||` DSL、timestamp 的表达式解析都是同一心智。

- **解析规则**（固化进 pure.ts 的 `parseLengthInput`，返回解析出的数值或 null，钳制由调用侧执行）：仅当搜索串整体为十进制整数（允许前导零，`007`→7）才生效；`24abc`、`2 4`、空串等一律忽略并沿用默认参数（无状态回落，与 hash/timestamp 心智一致）。密码长度与 passphrase 词数**共用同一数字**（v1 接受此限制：两者本就是同一搜索串驱动的轻调参，参数各自钳制到各自边界 8~64 / 3~8；分开调参等真实需求再议）。默认值：密码 16 位、passphrase 6 词（60 bits，对齐 OWASP ≥60 bits 基线）
- 备选：Form + Checkbox 组——交互重、无行级复制，放弃

### 2. 三档预设：↑↓ 仅导航，回车选用

预设是行、不是开关：↑↓ 移动焦点**不产生任何副作用**，回车选用该预设并**立即重新生成密码行**。与 hash/timestamp 的行级回车心智一致，杜绝焦点路过误切换（取舍：焦点即切换会让 ↑↓ 导航路过预设时误触重生成）。

- 预设 → 字符类映射（对应 LastPass Easy to say / read / all）：
  - `易读出`（say）：小写 + 大写字母
  - `易阅读`（read）：小写 + 大写 + 数字，排除歧义字符 `I l 1 O 0 o`
  - `全部字符`（all）：小写 + 大写 + 数字 + 30 个符号（默认档）
- **符号字符集 29 字符清单**（排除空格与转义敏感字符）：

  ```
  ! @ # $ % ^ & * ( ) - _ = + [ ] { } ; : , . < > / ? ~ ` '
  ```

  排除：空格（粘贴断裂）、`" \` |`（Shell/JSON/正则转义高频冲突）。32 个可打印 ASCII 符号 − 3 = 29，总字符集 = 26+26+10+29 = **91**，spec 的熵示例与 smoke 断言以此为口径
- **预设仅影响密码行**：passphrase 的词本来就无大小写/符号语义，切换预设时 passphrase 行 SHALL 保持不变（不重生成）

### 3. 随机实现：randomBytes + 拒绝采样

```ts
function randInt(max: number): number  // crypto.randomBytes 拒绝采样，无 modulo bias
```

- `generatePassword`：从启用字符集逐字符采样；**必含约束**用「每启用类注入 1 个 + Fisher-Yates 洗牌」（洗牌亦用 randInt）
- 拒绝 `Math.random`：可预测性不可接受；拒绝采样消除 `bytes % max` 的 modulo bias
- smoke 断言结构不变量：长度、字符集成员资格、每启用类 ≥1、排除歧义生效；另加一条源码扫描断言（读 pure.ts 源文本确认不含 `Math.random`）

### 4. 熵估算替代 zxcvbn

`estimateBits(count, poolSize) = count × log2(poolSize)`（生成器视角的生成熵；均匀随机下即安全熵——zxcvbn 评估的是「人类弱密码」，对均匀随机值无增益，1Password 同样以 bits 展示）。

- 档位（半开区间）：**< 45 弱 / [45, 70) 中 / ≥ 70 强**
- 弱档 SHALL 在 subtitle 追加提示「增加长度/词数」
- 数值口径：91 字符集 16 位 ≈ 104 bits、24 位 ≈ 156 bits；1024 词表 3 词 = 30 bits（弱）、6 词 = 60 bits、8 词 = 80 bits

### 5. 词表：内置 1024 词（规模进 spec）

`src/lib/wordlist.ts` 导出 `WORDLIST: string[]`：1024 个（2^10）常见 4~7 字母英文短词，全小写、无连字符/空格。**词表规模 1024 为 spec 级承诺**（bits 展示依赖它：每词恰 10 bits）；未来若换 EFF 7776 词表属于 spec 变更（熵展示数值会变），非静默升级。词表内容不含仅由歧义字母构成的词（如 `ill`、`oil`），普通含 `l/o` 的词不在此约束内。

- 备选：EFF short list 7776 词（~70KB 数据）——每词 12.9 bits，v1 收益不抵数据成本

### 6. 交互行布局（List）

```
搜索栏: 24                        ← 整数十进制才生效，钳制 8~64 / 3~8
○  易读出          预设 · 仅字母
○  易阅读          预设 · 排除歧义字符
●  全部字符         预设 · 默认            ← ● 标识当前档；↑↓ 导航，回车选用
#  yK#9mP2$vLqX…   密码 · 24 位 · ~157 bits 强   ← 回车复制
-  horse-battery…  Passphrase · 8 词 · 80 bits 强 ← 回车复制
```

- 密码与 passphrase 同屏双行（生成场景常两者对比取舍），各自回车复制
- 行级动作沿用项目惯例：复制（回车，同 timestamp/hash）+ 粘贴到前台应用（`Action.Paste`，timestamp/hash 均有先例）
- 强度并入 subtitle（bits + 档位），弱档附提示；不单独占行

### 7. 重生成快捷键：待原型验证的假设

spec 承诺「存在一个快捷键动作一次性重新生成密码与 passphrase 两行」。首选 ⌘R，**但 ⌘R 在 Raycast List 聚焦态是否可用尚未在项目中验证**（项目内无先例，此前 design 引用 timestamp 使用 ⌘R 属于不实表述，已更正）。实现 task 2.2 第一步为原型验证：⌘R 可用则用之；被 Raycast 保留/冲突则 fallback `⌘↩`；均不可则用 Action 默认无快捷键（仍可从动作面板触发）。快捷键具体取值是实现细节，spec 只约束「存在该动作且作用于两行」。

### 8. spec 撰写对照（历史审查教训沉淀）

- 交互契约全文单一口径：回车选用预设
- 字符集清单、词表规模等被数值引用的常量必须在 design/spec 固化且逐字符清点核实
- 熵示例数值按 91/1024 口径计算
- API 签名 proposal/design/tasks 三处一致
- 持久存储约束以扩展自身为范围表述

## Risks / Trade-offs

- [1024 词表熵上限 80 bits（8 词）] → 对 passphrase 场景足够（OWASP 建议 ≥60 bits）；换词表 = spec 变更，显式管理
- [密码长度与词数共用一个数字] → v1 接受（轻调参场景）；真实需求出现开 change 分离
- [⌘R 不可行] → fallback ⌘↩ / 无快捷键动作，spec 不锁死具体键位
- [随机断言只能是结构性质] → 四类不变量 + 源码扫描断言，已覆盖可执行验证；卡方分布检验属过度工程，拒绝

## Migration Plan

无数据迁移。纯增量：新增两文件 + pure.ts 追加 + manifest 注册。回滚 = git revert。
