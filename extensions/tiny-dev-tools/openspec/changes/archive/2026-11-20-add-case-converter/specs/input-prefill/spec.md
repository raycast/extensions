## MODIFIED Requirements

### Requirement: detector 采纳规则
每个命令 SHALL 通过专属 detector 判定选中文本或剪贴板文本是否采纳：url-codec（含 `%XX` hex 对，或含 `://` 且无空格）、json-format（trim 后以 `{` 或 `[` 开头）、base64（≥8 字符、仅 Base64 字符集、无空白、解码为合法 UTF-8 文本）、timestamp（trim 后匹配可选负号的纯数字 `/^-?\d+$/` 且 ≤30 位）、jwt-decoder（三段式且每段 ≥4 个 Base64URL 字符）、hash（任意通过采纳前提的文本，无形态规则——验收确认 hash 用户要预填）、case-converter（匹配 `/^[A-Za-z][A-Za-z0-9_.-]*$/` 且至少含一个字母）；采纳前提 SHALL 包含：trim 后非空、长度 ≤ 4096 字符、且不含 `||`（防密钥侧被自动填充）；不匹配时 SHALL 静默回落（不预填）。本 spec 为 detector 规则的唯一权威，命令 spec 引用而不复述。

#### Scenario: 匹配则预填
- **WHEN** 用户在编辑器选中 `a%20b` 后打开 url-codec
- **THEN** 输入区预填 `a%20b` 并立即显示编码结果

#### Scenario: 不匹配则空态
- **WHEN** 用户选中普通句子 `hello world` 后打开 base64
- **THEN** 命令以空态打开（句子含空格，detector 拒绝）

#### Scenario: 超长拒绝
- **WHEN** 选中文本匹配 detector 规则但长度 > 4096 字符
- **THEN** 不预填，命令以空态打开

#### Scenario: 含密钥分隔符拒绝
- **WHEN** 选中文本含 `||`（如文档片段 `token || secret`）
- **THEN** 整体拒绝预填，命令以空态打开（密钥永不来自选中文本）

#### Scenario: 负时间戳采纳
- **WHEN** 选中文本为 `-1000` 且打开 timestamp
- **THEN** 预填生效（负号属于合法时间戳，与既有行为一致）

#### Scenario: hash 任意文本采纳
- **WHEN** 剪贴板为任意非空文本（不含 `||`、≤4096）且打开 hash
- **THEN** 预填生效并显示全部摘要（密钥侧仍为空）

#### Scenario: case 形态采纳
- **WHEN** 剪贴板为 `user_created_at` 且打开 case-converter
- **THEN** 预填生效并展示六种格式结果
