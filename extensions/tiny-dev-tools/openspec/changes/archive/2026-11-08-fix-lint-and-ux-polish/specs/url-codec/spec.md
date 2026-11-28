# Spec Delta

## Purpose

定义 URL Codec 命令的交互契约：四种编解码模式、只读结果区、交换与清空动作，保证行为可预期且与其他编解码命令一致。

## ADDED Requirements

### Requirement: 四种编解码模式立即生效
命令 SHALL 提供 encodeURIComponent、encodeURI、decodeURIComponent（单次解码）、智能解码（循环解码）四种模式；用户切换模式时 SHALL 立即基于当前输入重新计算结果，无需额外确认步骤。

#### Scenario: 切换模式即时重算
- **WHEN** 输入框已有文本且用户从 encodeURIComponent 切换到智能解码
- **THEN** 结果区立即显示对当前输入循环解码后的内容

#### Scenario: 输入为空
- **WHEN** 输入框为空
- **THEN** 结果区为空，不显示错误

#### Scenario: 单次解码失败
- **WHEN** 模式为 decodeURIComponent（单次解码）且输入含非法 percent 序列（如 `%zz`）
- **THEN** 结果区被清空并提示解码失败，不保留上一次结果

### Requirement: 智能解码的循环与容错
智能解码 SHALL 循环调用解码直到输出不再变化或遇到非法序列，轮数上限为 5；循环中某一轮解码失败时，SHALL 停留在上一轮的成功输出，不覆盖已计算内容（该容错仅限智能解码循环内部；单次解码模式失败时的行为见「四种编解码模式立即生效」）。

#### Scenario: 双重编码完全还原
- **WHEN** 输入为双重 percent 编码文本（如 `hello%2520world`）
- **THEN** 结果为完全还原的文本（`hello world`），并提示解码轮数为 2

#### Scenario: 非法序列保留
- **WHEN** 输入包含非法 percent 序列（如 `%zz`）
- **THEN** 结果保留该序列原样，不报错

### Requirement: 结果区只读
结果文本区 SHALL 为只读：用户不能直接编辑计算结果。结果仅由「当前输入 + 当前模式」决定，消除手动编辑被后续重算覆盖的问题。

#### Scenario: 尝试编辑结果
- **WHEN** 用户尝试修改结果区内容
- **THEN** 结果区不接受输入，内容保持为由输入与模式计算得出

### Requirement: 交换输入输出动作
命令 SHALL 提供「交换输入输出」动作（快捷键 ⌃X）：将当前结果置为输入，并自动切换到当前模式的逆模式后重新计算。逆模式映射 SHALL 为：`encodeURIComponent → decodeURIComponent`（严格逆运算，不做循环解码）、`encodeURI → 智能解码`、`decodeURIComponent → encodeURIComponent`、`智能解码 → encodeURIComponent`。

#### Scenario: 编码后交换
- **WHEN** 当前模式为 encodeURIComponent、输入为 `a b`，用户触发交换
- **THEN** 输入变为 `a%20b`，模式切换为 decodeURIComponent，结果区显示 `a b`

#### Scenario: 交换不带入手动编辑
- **WHEN** 用户触发交换
- **THEN** 新输入为最近一次计算结果，而非任何用户对结果区的修改

### Requirement: 清空动作
命令 SHALL 提供「清空」动作（快捷键 ⌃K）：同时清空输入与结果，模式保持不变。

#### Scenario: 清空
- **WHEN** 用户触发清空
- **THEN** 输入与结果均为空，当前模式保持不变
