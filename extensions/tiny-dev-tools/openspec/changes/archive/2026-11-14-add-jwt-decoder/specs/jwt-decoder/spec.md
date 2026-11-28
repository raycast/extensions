## ADDED Requirements

### Requirement: 三段式解码与空态
命令 SHALL 接受搜索栏粘贴的三段式 JWT（`header.payload.signature`）并实时解码；输入为空时 SHALL 显示 EmptyView 提示「粘贴 JWT；可选 `|| 密钥` 进行 HS256 验签」；输入无法解析为 JWT（段数不为三、Base64URL 非法、解码后非 JSON）时 SHALL 显示单行错误提示，不展示部分解码结果。

#### Scenario: 粘贴即解码
- **WHEN** 用户粘贴合法 JWT
- **THEN** Header 行、状态行、claims 逐行立即展示，无需确认动作

#### Scenario: 非 JWT 输入
- **WHEN** 输入两段式（`a.b`）或四段式串
- **THEN** 显示「无法解析为 JWT（需要三段式 xxx.yyy.zzz）」错误行

#### Scenario: 打开命令
- **WHEN** 搜索栏为空
- **THEN** EmptyView 展示粘贴提示与 `||` 验签语法说明

### Requirement: Header 与 claims 逐行展示
Header SHALL 以单行展示算法（alg）与类型（typ，缺失时仅展示 alg）；alg 为 `none` 时 SHALL 显示「未签名」；payload 的每个 claim SHALL 独立成行（↑↓ 导航），回车 SHALL 复制该 claim 的**值本身**（非整行展示串），并 SHALL 提供粘贴到前台应用动作（项目既有惯例快捷键）；值为对象或数组的 claim SHALL 以单行压缩 JSON 展示且复制完整值。

#### Scenario: 回车复制 claim 值
- **WHEN** 用户在 `sub` 行（值 `1234567890`）按回车
- **THEN** 剪贴板内容为 `1234567890`

#### Scenario: 嵌套对象 claim
- **WHEN** payload 含 `"addr": {"city": "SZ", "zip": "518000"}`
- **THEN** 该行 title 显示 `{"city":"SZ","zip":"518000"}`，回车复制该完整 JSON 串

### Requirement: 时间 claims 双格式展示
白名单时间 claim（`exp`、`iat`、`nbf`）的行 SHALL 在 subtitle 同时展示：原始秒级时间戳、本地时间（YYYY-MM-DD HH:mm:ss）与相对时间；白名单外的 claim SHALL NOT 做时间转换（即使值为数字）。

#### Scenario: exp 行展示
- **WHEN** payload 含 `"exp": 1700000000`（东八区本地时间 2023-11-15 06:13:20）
- **THEN** exp 行 subtitle 形如 `1700000000 · <本地时间，随本机时区，如东八区 2023-11-15 06:13:20> · N 年前`

#### Scenario: 非白名单数字不转换
- **WHEN** payload 含 `"count": 1700000000`
- **THEN** count 行按普通值展示，subtitle 不含时间格式

### Requirement: 过期状态判定
命令 SHALL 基于**本机时间**对照 `exp`/`nbf` 持续展示状态行，判定按顺序优先：① `exp` 早于当前时间 →「已过期 · N 前」；② `nbf` 晚于当前时间 →「尚未生效 · N 后」；③ 其余且 payload 有 `exp` →「有效 · 剩余 N」；④ payload 无 `exp` →「无过期时间 claim」。状态行的时间态与验签结果（存在时）SHALL 以「 · 」拼接展示。

#### Scenario: 已过期
- **WHEN** 解码的 token `exp` 早于本机当前时间
- **THEN** 状态行显示「已过期 · N 前」

#### Scenario: 无 exp
- **WHEN** payload 不含 `exp` claim
- **THEN** 状态行显示「无过期时间 claim」

#### Scenario: 尚未生效
- **WHEN** payload 的 `nbf` 晚于当前时间（且 `exp` 未过期或不存在）
- **THEN** 状态行显示「尚未生效 · N 后」

#### Scenario: 有效
- **WHEN** payload 的 `exp` 晚于当前时间且 `nbf` 不晚于当前时间
- **THEN** 状态行显示「有效 · 剩余 N」

#### Scenario: 过期优先于未生效
- **WHEN** payload 的 `exp` 早于当前时间且 `nbf` 晚于当前时间（矛盾 claim）
- **THEN** 状态行显示「已过期」（判定顺序①优先）

### Requirement: HS256 可选验签
密钥 SHALL 通过 `token || 密钥` 语法提供（首个 `||` 分隔，两侧不 trim，与 hash 命令一致）；提供密钥且 header.alg 为 HS256 时 SHALL 对未解码的 `header.payload` 原文段做 HMAC-SHA256 并与签名段字节比对，状态行展示「✅ 签名有效」或「❌ 签名不符」；未提供密钥时 SHALL 不展示验签结果（避免「未验」被误读为「无效」）；alg 非 HS256 时 SHALL 显示「仅支持 HS256 验签（当前 alg: X）」且不验签；alg 为 none 时 SHALL 显示「未签名 · 跳过验签」。验签全程 SHALL 在本地完成，token 与密钥不离开本机、不写入任何持久存储。

#### Scenario: 验签通过
- **WHEN** 输入 `jwt.io 示例 token || your-256-bit-secret`
- **THEN** 状态行显示「✅ 签名有效」

#### Scenario: 密钥错误
- **WHEN** 同一 token 但密钥输入错误值
- **THEN** 状态行显示「❌ 签名不符」

#### Scenario: 篡改检测
- **WHEN** token 的 signature 段尾字符被改动后用正确密钥验签
- **THEN** 状态行显示「❌ 签名不符」

#### Scenario: RS256 token 提供密钥
- **WHEN** token 的 alg 为 RS256 且输入了 `|| 密钥`
- **THEN** 状态行显示「仅支持 HS256 验签（当前 alg: RS256）」，解码展示不受影响
