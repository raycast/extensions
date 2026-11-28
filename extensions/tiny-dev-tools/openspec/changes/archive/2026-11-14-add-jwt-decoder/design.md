# Design

## Context

项目已有六命令与五 spec，List 范式（搜索栏输入 + 行级回车复制）与 `||` 密钥语法（hash 命令）均经线上验证。本命令是存量资产密集复用：`hmacSha256`（hash）、`fmtLocal`/`fmtRelative`（timestamp）、Base64URL 容错解码思路（base64 命令的 URL-safe 处理）。JWT 调试场景的安全性要求（token 不出本机）与项目离线基因一致。

## Goals / Non-Goals

**Goals:**

- 全离线：解码、状态判定、HS256 验签均为本地纯计算
- claims 逐行展示 + 时间 claims 双格式（原始值 + 可读时间 + 相对时间）
- 交互与 hash 命令同心智：粘贴 token 即解码、`|| 密钥` 验签、↑↓ 回车复制
- 全部逻辑下沉 pure.ts，公开测试向量断言

**Non-Goals:**

- 非对称验签、JWE、重签、JWKS、网络交互（见 proposal 不做清单）

## Decisions

### 1. 解码实现：三段拆分 + 逐段 Base64URL → JSON

`decodeJwt`：按 `.` 拆三段（非恰好三段 → null）；header/payload 段做 Base64URL 解码（`-_` → `+/`、按需补 `=` padding，思路同 base64 命令的容错）后 `JSON.parse`；signature 段解码为**字节**（用于验签比对）。任何一步失败整体返回 null（不做部分解码——残缺 token 对用户无意义，EmptyView/错误行更诚实）。**signature 解码须新写字节级 Base64URL 函数，不可复用现有 `b64Decode`**——后者是 UTF-8 文本导向，非法字节序列会被替换为 U+FFFD，破坏字节语义导致验签恒 false。

- 不校验 header.alg 与实际验签算法的一致性（alg confusion 攻击面属验签方职责；我们 header 行如实展示 alg，用户自判）

### 2. 状态判定：exp/nbf 与本地时钟对照

`jwtStatus(payload, now)` 按顺序判定（前者优先）返回四态 + 人类可读 label：

- `expired`：`exp` < now →「已过期 · N 分钟前」（红点提示语义）
- `not-yet-valid`：`nbf` > now →「尚未生效 · N 分钟后」
- `valid`：「有效 · 剩余 N」
- `unknown`：payload 无 `exp`（`nbf` 单独存在按 not-yet-valid 判）→「无过期时间 claim」

时间显示粒度复用 `fmtRelative` 的两段式（如「2 小时 13 分」）。状态行始终显示，是用户打开命令的第一眼信息。

### 3. HS256 验签：复用 hmacSha256 + 字节级比对

`verifyHs256(token, secret)`：取 `header.payload` 原文段（**未解码的原始串**，这是 JWT 签名的输入约定）做 `hmacSha256(secret, raw)`，hex 转字节后与 signature 段 Base64URL 解出的字节比对（**字节比对而非 hex 字符串比对**，避免大小写/编码干扰）。

- 密钥语法 `token || 密钥`：与 hash 命令同款拆分（首个 `||`，两侧不 trim）
- 密钥为空：不验签，状态行不显示验签结果（避免「没验」被误读为「无效」）
- header.alg ≠ HS256 但提供了密钥：状态行显示「仅支持 HS256 验签（当前 alg: RS256）」，不做验签——诚实降级而非错误结果

### 4. 时间 claims 白名单 + 双格式展示

时间类 claim 名单：`exp`/`iat`/`nbf`（JWT 标准注册 claim，均为秒级 Unix 时间戳）。这些行的 subtitle 显示：`1700000000 · 2023-11-14 22:13:20 · 3 年前`（原始值 + 本地时间 + 相对时间）。非白名单 claim 即使值是数字也不做时间转换（避免把 TTL 毫秒、计数器误判为时间戳——10 位数启发式不可靠，白名单最稳）。值为对象/数组的 claim：title 显示 JSON 序列化（单行压缩，复用 `formatJson` 的压缩模式），仍可复制。

### 5. 交互行布局（List）

```
搜索栏: eyJhbGciOiJIUzI1NiJ9.eyJ... || mysecret
🔐  HS256 · JWT                       ← Header 行（alg · typ）
⏱  有效 · 剩余 2 小时 13 分 · ✅ 签名有效   ← 状态行（时间态与验签结果以「 · 」拼接展示）
🔑 sub      1234567890                ← claims 逐行
   name     John
   iat      1699999999 · 2023-11-14 22:13:19 · 3 年前
   exp      1700003600 · 2023-11-14 23:13:20 · 3 年前
```

- 空搜索栏 → EmptyView「粘贴 JWT；可选 `|| 密钥` 进行 HS256 验签」
- 非 JWT 输入（decodeJwt 返回 null）→ 单行错误提示「无法解析为 JWT（需要三段式 xxx.yyy.zzz）」
- claims 行回车复制**值本身**（复制 `1234567890` 而非整行展示串）——与 timestamp 的 copyValue 模式一致

### 6. 测试向量（公开、可独立验证）

- jwt.io 官方示例 token（HS256，密钥为 UTF-8 文本 `your-256-bit-secret`）：解码断言（header.alg/payload.sub/name）+ 验签 true + 错误密钥 false + 篡改 signature 尾字符 false
- 状态判定：构造 exp 过去/未来/缺失、nbf 未来四类 token 的边界断言（payload 手工编码，不依赖外部值）
- decodeJwt 失败路径四断言：两段、四段、非 Base64、合法 Base64 但非 JSON → null
- 注：不采用 RFC 7515 附录 A.1 向量——其密钥为 base64url 编码的 JWK octet key，需先解码，与本项目「密钥按 UTF-8 文本处理」语义不符（UTF-8 文本密钥是 v1 承诺，二进制/hex 密钥支持属后续需求）

## Risks / Trade-offs

- [alg=none 的 token] → 不做验签（无签名可比对），状态行如实展示「alg: none · 未签名」；解码照常——none token 在调试场景也要看内容
- [系统时钟偏差影响状态判定] → 与所有本地时间工具同性质，接受；状态行基于本机时间的事实写进 spec
- [恶意超长 token 卡 UI] → 解码为一次性纯计算，10KB 级 token 毫秒完成；不设长度上限（设了反而挡住合法长 token），接受
- [claim 值含超长字符串] → title 截断由 List 原生处理，复制值为完整值

## Migration Plan

无数据迁移。纯增量：pure.ts 追加 + 新增 jwt-decoder.tsx + manifest 注册。回滚 = git revert。
