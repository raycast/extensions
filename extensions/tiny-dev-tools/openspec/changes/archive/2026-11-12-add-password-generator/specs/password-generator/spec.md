## ADDED Requirements

### Requirement: 双模式生成与长度调参
命令 SHALL 同时生成随机密码与 passphrase 两行结果；搜索栏输入 SHALL 仅当整体为十进制整数时（允许前导零）调整长度——密码取 8~64（默认 16），passphrase 词数取 3~8（默认 6），共用同一数字并各自钳制到边界；其余任何输入（非数字、混合、空格分隔）SHALL 被忽略并沿用默认参数（无状态回落，不记忆最近有效数字）；空搜索栏 SHALL 使用默认参数直接展示结果。

#### Scenario: 打开命令即见结果
- **WHEN** 用户打开命令，搜索栏为空
- **THEN** 密码行显示 16 位密码、passphrase 行显示 6 词词组（60 bits），均基于默认参数

#### Scenario: 数字调参
- **WHEN** 用户输入 `24`
- **THEN** 密码行变为 24 位、passphrase 行变为 8 词（24 钳制到词数上限）

#### Scenario: 混合与非数字输入忽略
- **WHEN** 用户输入 `abc`、`24abc` 或 `2 4`
- **THEN** 保持当前参数与结果不变，不报错

### Requirement: 三档字符预设（回车选用）
命令 SHALL 提供三档预设行：`易读出`（仅大小写字母）、`易阅读`（字母+数字，排除歧义字符 `I l 1 O 0 o`）、`全部字符`（大小写+数字+符号共 91 字符，默认档）；↑↓ SHALL 仅移动焦点不改变任何状态；回车选用预设后 SHALL 立即重新生成密码行；预设 SHALL 仅影响密码行，passphrase 行 SHALL 保持不变；当前生效档 SHALL 可视标识。

#### Scenario: 回车选用预设
- **WHEN** 用户 ↑↓ 聚焦 `易读出` 行并按回车
- **THEN** 该档成为当前档（可视标识更新），密码行立即重新生成且仅含字母，passphrase 行保持原样

#### Scenario: 焦点路过不误触
- **WHEN** 用户从密码行 ↑ 移动焦点经过预设行再到搜索栏
- **THEN** 预设不切换、密码不重新生成

#### Scenario: 易阅读排除歧义
- **WHEN** 预设为 `易阅读` 并多次重新生成
- **THEN** 密码不含 `I l 1 O 0 o` 中任何一个字符

### Requirement: 必含字符类约束
`全部字符` 档生成的密码 SHALL 至少包含大写、小写、数字、符号各一个；`易读出` SHALL 至少含一个大写与一个小写；`易阅读` SHALL 至少含一个大写、一个小写、一个数字。

#### Scenario: 全部字符档必含四类
- **WHEN** 在 `全部字符` 档生成 8 位（下限长度）密码
- **THEN** 四类字符各至少出现一次

### Requirement: 加密安全随机源
所有随机性 SHALL 来自 `crypto.randomBytes`（CSPRNG）；整数采样 SHALL 使用拒绝采样避免 modulo bias；实现 SHALL NOT 使用 `Math.random`；扩展自身 SHALL NOT 将生成结果写入任何持久存储（LocalStorage、文件、网络）。

#### Scenario: 随机源约束
- **WHEN** 审查实现代码与冒烟测试
- **THEN** 随机调用链无 `Math.random`，采样基于 `randomBytes` 拒绝采样（冒烟含源码扫描断言）

### Requirement: 熵强度指示
密码与 passphrase 行 SHALL 在 subtitle 展示熵（bits）与档位：密码 `长度 × log2(字符集大小)`、passphrase `词数 × log2(词表大小)`（词表规模 1024，即每词 10 bits）；档位阈值：`< 45` 弱、`[45, 70)` 中、`≥ 70` 强；弱档 SHALL 附带增加长度/词数的提示。

#### Scenario: 强度计算
- **WHEN** `全部字符` 档（91 字符）生成 16 位密码
- **THEN** subtitle 显示约 104 bits 与「强」档位

#### Scenario: passphrase 弱档提示
- **WHEN** 用户输入 `3`（词数钳制到下限 3）
- **THEN** passphrase 行显示 30 bits 与「弱」档位，并附增加词数提示

### Requirement: 行级动作与重新生成
密码行与 passphrase 行 SHALL 各自提供复制（首选，回车触发）与粘贴到前台应用动作；命令 SHALL 提供一个重新生成动作（快捷键取值为实现细节，spec 不锁死）同时重新生成密码与 passphrase 两行；预设行 SHALL 提供选用该预设动作（回车）。

#### Scenario: 回车复制密码
- **WHEN** 用户在密码行按回车
- **THEN** 复制该行显示的密码并提示成功

#### Scenario: 一键重生成双行
- **WHEN** 用户触发重新生成动作
- **THEN** 密码与 passphrase 两行同时基于当前参数重新生成
