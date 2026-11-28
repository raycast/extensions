## MODIFIED Requirements

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
