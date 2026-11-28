# hash Specification（delta）

## WARNING: This is a delta spec

本文件是 `add-hash` change 的 spec delta，描述**新增**能力 `hash`。apply 后将转正为 `openspec/specs/hash/spec.md`。

## ADDED Requirements

### Requirement: 全量并排展示四种摘要
命令 SHALL 提供单一文本输入，并同时计算并展示 MD5、SHA-1、SHA-256、HMAC-SHA256 四种摘要；每种摘要 SHALL 以小写 hex 与大写 hex 两行成对展示（共 8 行），大写紧跟对应小写之后；展示 SHALL 无模式切换。

#### Scenario: 输入即算
- **WHEN** 用户在输入区输入或修改文本
- **THEN** 8 行结果实时更新，无需任何确认动作

#### Scenario: 大小写成对分组
- **WHEN** 结果展示时
- **THEN** 每个算法的小写行下方紧跟其大写行，按 MD5 → SHA-1 → SHA-256 → HMAC-SHA256 顺序排列

### Requirement: 空输入与空密钥行为
输入为空时所有结果行 SHALL 为空，不计算空串哈希；HMAC 密钥为空时 HMAC 两行 SHALL 显示占位符 `—` 且不参与计算。

#### Scenario: 打开命令
- **WHEN** 用户打开命令，输入区为空
- **THEN** 8 行结果全部为空

#### Scenario: 密钥留空
- **WHEN** 输入区有文本但密钥为空
- **THEN** MD5 / SHA-1 / SHA-256 六行正常计算，HMAC 两行显示 `—`

### Requirement: 所见即所哈希
哈希 SHALL 按输入框原始内容计算，不做 trim。

#### Scenario: 输入含空白
- **WHEN** 输入含前导/尾部空白字符
- **THEN** 哈希按原始内容计算，结果与用户所见文本一致

### Requirement: HMAC-SHA256 密钥语义
HMAC-SHA256 SHALL 以独立密钥输入框提供密钥；密钥 SHALL 按 UTF-8 文本处理，不做 hex 解码（密钥为空时的展示行为见「空输入与空密钥行为」）。

#### Scenario: 密钥实时生效
- **WHEN** 输入区有文本且用户修改密钥框内容
- **THEN** HMAC 两行结果实时更新，其余六行不受影响

### Requirement: 结果区只读与复制动作
8 行结果 SHALL 为只读；ActionPanel SHALL 提供按算法的 4 个复制动作（MD5 / SHA-1 / SHA-256 / HMAC-SHA256，均为小写 hex，复制 MD5 为首选动作）、粘贴到前台应用（粘贴内容为 MD5 小写 hex，与首选复制动作一致）、清空（⌃K，清空输入与密钥）。

#### Scenario: 复制首选动作
- **WHEN** 用户直接按回车
- **THEN** 复制 MD5 小写 hex 并提示成功

#### Scenario: 空输入时触发复制动作
- **WHEN** 输入为空且用户触发任一复制动作（含回车首选的复制 MD5）或粘贴动作
- **THEN** 不复制空串，提示「无结果可复制」

#### Scenario: HMAC 占位时触发复制 HMAC
- **WHEN** 密钥为空（HMAC 行显示占位符 `—`）且用户触发复制 HMAC-SHA256
- **THEN** 不复制占位符，提示「无结果可复制」

#### Scenario: 清空
- **WHEN** 用户按 ⌃K
- **THEN** 输入与密钥清空，8 行结果随之全部清空

#### Scenario: 大写结果取用
- **WHEN** 用户需要大写 hex
- **THEN** 点击对应只读行原生选中后 ⌘C 复制（不提供大写专用复制动作）
