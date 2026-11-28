# base64 Specification

## Purpose

定义 Base64 命令的交互契约：UTF-8 安全的编解码往返、URL-safe 容忍、只读结果区、交换与清空动作，并与 URL Codec 命令的交互保持一致。

## Requirements

### Requirement: UTF-8 安全的编解码
编码 SHALL 对任意 Unicode 文本（含中文、Emoji）产生正确 Base64；解码 SHALL 容忍 URL-safe 字符（`-`/`_`）与缺失 padding；「编码后解码」SHALL 还原原始文本；命令挂载时若选中文本或剪贴板文本匹配 input-prefill 规范的 base64 detector，SHALL 自动预填输入框（解码模式，行为同现状）。

#### Scenario: 中文与 Emoji 往返
- **WHEN** 输入 `中文 emoji 🎉 mixed` 执行编码再解码
- **THEN** 还原为原文，无乱码

#### Scenario: URL-safe 字符解码
- **WHEN** 输入仅含 URL-safe 字母表与缺失 padding 的合法 Base64（如 `-_8`）
- **THEN** 解码不抛错；无法映射为合法 UTF-8 的字节序列 SHALL 输出为 U+FFFD 替换字符

#### Scenario: 非法输入报错
- **WHEN** 输入含 Base64 字母表之外的字符（如 `!!`）
- **THEN** 命令提示解码失败且不产出结果

#### Scenario: 预填合法 Base64 自动切解码
- **WHEN** 复制合法 Base64 串（如 `aGVsbG8gd29ybGQ=`）后打开命令
- **THEN** 输入框预填该文本且模式切到解码，结果区立即显示解码内容

#### Scenario: 预填普通文本保持编码
- **WHEN** 复制普通文本（如 `hello world`）后打开命令
- **THEN** 输入框预填该文本且保持默认编码模式，结果区立即显示 Base64 编码结果

### Requirement: 模式与重算
命令 SHALL 提供编码 / 解码两种模式；用户切换模式时 SHALL 立即基于当前输入重新计算结果。

#### Scenario: 切换模式即时重算
- **WHEN** 输入框已有 Base64 文本且用户从解码切换到编码
- **THEN** 结果区立即显示对该文本重新编码的内容

### Requirement: 结果区只读
结果文本区 SHALL 为只读：用户不能直接编辑计算结果。结果仅由「当前输入 + 当前模式」经计算或显式后处理动作（如「结果转 URL-safe」）得出。

#### Scenario: 尝试编辑结果
- **WHEN** 用户尝试修改结果区内容
- **THEN** 结果区不接受输入，内容保持为由输入与模式计算得出

### Requirement: 交换输入输出动作
命令 SHALL 提供「交换输入输出」动作（快捷键 ⌃X）：将当前结果置为输入，并切换到当前模式的逆模式（编码 ⇄ 解码）后重新计算。

#### Scenario: 解码后交换
- **WHEN** 当前模式为解码、结果为明文，用户触发交换
- **THEN** 明文成为输入，模式切换为编码，结果区显示重新编码的 Base64

### Requirement: 清空动作
命令 SHALL 提供「清空」动作（快捷键 ⌃K）：同时清空输入与结果，模式保持不变。

#### Scenario: 清空
- **WHEN** 用户触发清空
- **THEN** 输入与结果均为空，当前模式保持不变

### Requirement: 结果转 URL-safe 动作
命令 SHALL 提供「结果转 URL-safe」动作：将结果中的 `+`/`/` 替换为 `-`/`_` 并去除 padding。

#### Scenario: 标准输出转 URL-safe
- **WHEN** 结果为 `aGVsbG8+/_=` 且用户触发该动作
- **THEN** 结果变为对应 URL-safe 形式（`-`、`_`、无 `=`）
