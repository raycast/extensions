## MODIFIED Requirements

### Requirement: 四种编解码模式立即生效
命令 SHALL 提供 encodeURIComponent、encodeURI、decodeURIComponent（单次解码）、智能解码（循环解码）四种模式；用户切换模式时 SHALL 立即基于当前输入重新计算结果，无需额外确认步骤；命令挂载时若选中文本或剪贴板文本匹配 input-prefill 规范的 url-codec detector，SHALL 自动预填输入框并立即计算（不匹配则输入框为空，行为同现状）。

#### Scenario: 切换模式即时重算
- **WHEN** 输入框已有文本且用户从 encodeURIComponent 切换到智能解码
- **THEN** 结果区立即显示对当前输入循环解码后的内容

#### Scenario: 输入为空
- **WHEN** 输入框为空
- **THEN** 结果区为空，不显示错误

#### Scenario: 单次解码失败
- **WHEN** 模式为 decodeURIComponent（单次解码）且输入含非法 percent 序列（如 `%zz`）
- **THEN** 结果区被清空并提示解码失败，不保留上一次结果

#### Scenario: 预填且解码有效则默认解码
- **WHEN** 复制 `a%20b` 后打开命令
- **THEN** 预填该文本且模式自动切到单次解码，结果显示 `a b`

#### Scenario: 预填但解码无效果则保持编码
- **WHEN** 复制纯 URL（如 `https://x.com/a`，无 %XX）或普通文本（如 `a b`）后打开命令
- **THEN** 预填该文本且保持默认编码模式，结果显示编码后的内容
