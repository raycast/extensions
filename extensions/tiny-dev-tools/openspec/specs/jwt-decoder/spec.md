# jwt-decoder Specification

## Purpose

定义 JWT 解码命令的交互契约：三段式离线解码、claims 逐行复制、时间 claims 双格式展示、基于本机时间的 exp/nbf 四态判定（顺序优先）、本地签名验签——HS256 内联（`||` 密钥语法）与 RS256/ES256 验签面板（公钥三格式识别：PEM/JWK/文件路径，剪贴板预填），错误三分语义（签名不符/密钥类型不匹配/公钥无法解析），alg=none 跳过验签；全程离线、token 与密钥不写任何持久存储。

## Requirements

### Requirement: 三段式解码与空态
命令 SHALL 接受搜索栏粘贴的三段式 JWT（`header.payload.signature`）并实时解码；输入为空时 SHALL 显示 EmptyView 提示「粘贴 JWT 解码；⌘V 或动作面板打开验签（支持 HS256 / RS256 / ES256）」；token 侧非空但无法解析为 JWT（段数不为三、Base64URL 非法、解码后非 JSON）时 SHALL 显示单行错误提示，不展示部分解码结果；命令挂载时若选中文本或剪贴板文本匹配 input-prefill 规范的 jwt-decoder detector，SHALL 自动预填搜索栏并立即解码（预填遵循 selection-prefill 的来源优先级、edited 锁存与密钥不预填原则改为 input-prefill 的对应契约）。

#### Scenario: 粘贴即解码
- **WHEN** 用户粘贴合法 JWT
- **THEN** Header 行、状态行、claims 逐行立即展示，无需确认动作

#### Scenario: 非 JWT 输入
- **WHEN** 输入两段式（`a.b`）或四段式串
- **THEN** 显示「无法解析为 JWT（需要三段式 xxx.yyy.zzz）」错误行

#### Scenario: 打开命令
- **WHEN** 搜索栏为空
- **THEN** EmptyView 展示解码提示与验签入口说明（⌘V 或动作面板，支持 HS256/RS256/ES256）

#### Scenario: 选中 JWT 自动预填
- **WHEN** 用户选中合法 JWT 后打开命令
- **THEN** 搜索栏预填该 token，解码结果立即展示；用户输入后预填失效（含清空后不复活）

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

### Requirement: 签名验签
内联 `token || 密钥`（首个 `||` 分隔、两侧不 trim，与 hash 命令一致；HS256 文本密钥或单行 JWK/文件路径）或「验证签名」动作（快捷键实测锚定，不锁死）弹出的 Form（token 摘要只读栏 + 公钥 TextArea 三格式识别）提供密钥；公钥栏 SHALL 预填剪贴板（仅密钥形态前缀），esc 放弃 SHALL 保留旧结果。验签按 alg 先分流：HS256 对未解码 `header.payload` 原文段 HMAC-SHA256 字节比对；RS256/ES256 密钥经解析（非三格式 SHALL「⚠ 公钥无法解析」）、类型不匹配 SHALL 结构化错误；ES256 以 ieee-p1363 直验 raw 签名；alg=none SHALL「未签名 · 跳过验签」（无论是否提供密钥）；无密钥不展示结果。全程本地。

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
- **WHEN** RS256 token 打开验签 Form，公钥栏粘贴匹配的 PEM 公钥并确认
- **THEN** 返回 List 状态行显示「✅ 签名有效」（原降级提示删除——RS256 已支持真实验签）

#### Scenario: RS256 篡改检测（Form）
- **WHEN** RS256 token 的 signature 段被篡改，Form 用正确公钥验签
- **THEN** 状态行显示「❌ 签名不符」

#### Scenario: ES256 验签
- **WHEN** ES256 token 在 Form 粘贴 EC 公钥（PEM 或 JWK）
- **THEN** 有效 token 显示「✅ 签名有效」

#### Scenario: ES256 篡改检测
- **WHEN** ES256 token 的 signature 段被篡改，Form 用正确 EC 公钥验签
- **THEN** 状态行显示「❌ 签名不符」

#### Scenario: 剪贴板预填
- **WHEN** 用户复制 PEM 公钥后打开验签 Form
- **THEN** 公钥栏已预填该 PEM

#### Scenario: 密钥类型不匹配
- **WHEN** RS256 token 的验签 Form 粘贴 EC 公钥
- **THEN** 状态行显示「⚠ 密钥类型不匹配」类结构化错误（非签名不符）

#### Scenario: JWK 内联
- **WHEN** RS256 token 以 `|| {"kty":"RSA",...}` 内联同公钥的 JWK
- **THEN** 状态行显示「✅ 签名有效」

#### Scenario: 公钥无法解析
- **WHEN** Form 公钥栏内容非 PEM/JWK/可读路径
- **THEN** 状态行显示「⚠ 公钥无法解析」类结构化错误

#### Scenario: 剪贴板非密钥不预填
- **WHEN** 剪贴板内容为 JWT 或普通文本（非密钥形态前缀）时打开验签 Form
- **THEN** 公钥栏为空，不预填

#### Scenario: alg 为 none
- **WHEN** token 的 alg 为 `none`（无论是否提供密钥）
- **THEN** 状态行显示「未签名 · 跳过验签」，解码展示不受影响
