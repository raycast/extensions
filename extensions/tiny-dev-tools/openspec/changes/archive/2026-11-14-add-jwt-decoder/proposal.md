# Proposal

## Why

JWT 是现代服务端鉴权的通用载体，开发者调试 auth 问题时高频需要查看 token 内容（claims、过期时间、签发者）与验证签名。现状是粘贴到 jwt.io 等第三方网站——**生产 token 离开本机**，安全顾虑真实存在。本命令提供全离线解码：Base64URL 解码为纯字符串运算，HS256 验签直接复用 hash 命令已实现的 `hmacSha256`（RFC 4231 断言背书），时间 claims 人性化复用 timestamp 的 `fmtLocal`/`fmtRelative`。零新增依赖，几乎全是存量资产拼装。Store 竞品多为纯解码展示，「离线 + HS256 验签 + 时间 claims 人性化」组合存在空档。

## What Changes

- **新命令 `jwt-decoder`**（List 模式，沿用项目范式）：
  - 搜索栏粘贴 JWT（三段 `xxx.yyy.zzz`）；密钥语法沿用 `token || 密钥`（HS256 验签用，与 hash 命令一致的心智）
  - **Header 行**：算法（alg）、类型（typ）
  - **状态行**：基于 `exp`/`nbf` 与本地时间对照——有效（含剩余时间）/ 已过期（含过期多久）/ 缺少时间 claim / 非 JWT 格式；有密钥时显示验签结果（✅ 签名有效 / ❌ 签名不符）
  - **Claims 行**：payload 逐条一行（↑↓ 导航、回车复制）；时间类 claim（`exp`/`iat`/`nbf` 等）subtitle 双格式——原始秒级时间戳 + 本地可读时间 + 相对时间
  - 空搜索栏 → EmptyView 提示「粘贴 JWT，可选 `|| 密钥` 验签」
- **`src/lib/pure.ts` 新增纯函数**：
  - `decodeJwt(token: string): { header; payload; signature } | null`（三段拆分 + Base64URL 解码 + JSON.parse；结构非法/解码失败/JSON 非法均返回 null）
  - `verifyHs256(token: string, secret: string): boolean`（对 header.payload 段做 HMAC-SHA256，与 signature 段 Base64URL 解码后字节比对）
  - 时间 claim 名单常量（`exp`/`iat`/`nbf`）与状态判定函数 `jwtStatus(payload, now): { level; label }`（有效/过期/无时间信息）
- **smoke 断言**：公开测试向量（jwt.io 官方示例 token + 手工构造 token）做解码/验签已知值断言 + 状态判定边界断言 + 解码失败路径断言。不采用 RFC 7515 附录 A.1 向量（其密钥为 base64url JWK，与「密钥按 UTF-8 文本处理」语义不符）
- **README / package.json**：注册命令、功能清单、架构图同步

明确不做：

- RS256/ES256/PS256 非对称验签（PEM/JWK 公钥解析复杂度上一档，v2 另立 change）
- JWE 加密 token 解密、token 编辑/重签、`kid`/JWKS 远程拉取
- 刷新 token 流程、与任何服务的网络交互（纯离线）
- 自动读取剪贴板/选中文本（延续既定推迟决策，待基建 change）

## Capabilities

### New Capabilities

- `jwt-decoder`: JWT 解码命令的交互契约——三段解码、claims 逐行展示、时间 claims 人性化、exp/nbf 状态判定、HS256 可选验签（`||` 密钥语法）、纯离线

### Modified Capabilities

（无——纯新增命令；hash 的 `||` 语法是交互惯例复用而非 spec 修改）

## Impact

- 代码：`src/lib/pure.ts`（+3 纯函数 + 1 常量，约 60 行）、新增 `src/jwt-decoder.tsx`（List 模式，约 110 行）
- 构建/清单：`package.json` commands 追加 `jwt-decoder`
- 测试：`scripts/smoke.ts`（+14 断言，63 → 77）
- 文档：`README.md`
- 安全：解码与验签全程本地，token 不出本机、不落任何持久存储
- 无对外 API 变化；纯增量，回滚 = 删除新增文件 + revert package.json
