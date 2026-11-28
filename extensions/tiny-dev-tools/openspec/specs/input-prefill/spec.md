# input-prefill Specification

## Purpose

定义输入自动预填的共享行为契约：选中优先、剪贴板回退的来源优先级（复制即可预填），命令专属 detector 采纳规则（本 spec 为唯一权威），共同前置（非空、≤4096、不含 `||`——密钥永不来自预填），setState 注入与 edited 锁存（用户输入后预填失效，含清空后不复活），以及编解码命令的智能模式（能解则解、不能则编）。全程静默失败、无权限引导。

## Requirements

### Requirement: 来源优先级与静默失败
命令挂载时 SHALL 按**选中优先、剪贴板回退**顺序尝试预填：先读取系统选中文本，若未采纳（无选中文本、读取失败含辅助功能权限缺失、或 detector 拒绝），SHALL 读取剪贴板文本再过同一 detector；两来源均无采纳时 SHALL 静默回落到无预填状态（等同用户直接打开命令），SHALL NOT 弹出错误或权限引导。

#### Scenario: 选中优先
- **WHEN** 选中文本与剪贴板内容均匹配 detector 且不相同
- **THEN** 预填选中文本（选区是当下意图的最精确信号）

#### Scenario: 剪贴板回退
- **WHEN** 用户复制了 `a%20b`（无选中文本或选区已丢失）后打开 url-codec
- **THEN** 预填剪贴板内容 `a%20b`

#### Scenario: 权限缺失但剪贴板可用
- **WHEN** 辅助功能权限未授予，但剪贴板有匹配内容
- **THEN** 选中读取静默失败，剪贴板回退生效（Clipboard.read 无需辅助功能权限）

#### Scenario: 两来源均无采纳
- **WHEN** 无选中文本且剪贴板内容不匹配 detector
- **THEN** 命令以原有空态打开，无任何提示

### Requirement: detector 采纳规则
每个命令 SHALL 通过专属 detector 判定选中文本或剪贴板文本是否采纳；各命令的 detector 规则以本 spec 场景清单为唯一权威（命令 spec 引用而不复述）；采纳前提 SHALL 包含：trim 后非空、长度 ≤ 4096 字符、且不含 `||`（防密钥侧被自动填充）；不匹配时 SHALL 静默回落（不预填）。当前接入命令与规则：url-codec（含 `%XX` 或含 `://` 无空格）、json-format 与 json-to-types（trim 后以 `{`/`[` 开头）、base64（≥8 字符 Base64 字符集无空白且解码合法 UTF-8）、timestamp（可选负号纯数字 ≤30 位）、jwt-decoder（三段式每段 ≥4 Base64URL 字符）、hash（任意通过采纳前提）、case-converter（`/^[A-Za-z][A-Za-z0-9_.-]*$/` 含字母）。

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

#### Scenario: JSON 预填转类型
- **WHEN** 剪贴板为 JSON 对象且打开 json-to-types
- **THEN** 预填生效并立即展示默认语言的类型代码

### Requirement: 预填不覆盖用户输入与密钥安全
预填 SHALL 仅作为初始值：用户开始输入后 SHALL 完全接管，预填 SHALL NOT 再次生效——包括用户输入后再清空的情形（edited 锁存）；jwt-decoder 的密钥侧（`||` 之后）SHALL NOT 来自选中文本（由「不含 `||`」采纳前提保证）。

#### Scenario: 用户输入优先
- **WHEN** 命令因预填显示结果，用户在搜索栏输入任意字符
- **THEN** 以用户输入为准重新计算，预填值不再参与

#### Scenario: 输入后清空不复活
- **WHEN** 命令因预填显示结果，用户输入了内容后又全部删除
- **THEN** 搜索栏/输入区保持为空，预填值不重新出现

#### Scenario: 密钥不预填
- **WHEN** 选中文本为形如 `token || secret` 的文档片段
- **THEN** 该文本在 detector 层被整体拒绝（见「含密钥分隔符拒绝」），不进入任何输入侧
