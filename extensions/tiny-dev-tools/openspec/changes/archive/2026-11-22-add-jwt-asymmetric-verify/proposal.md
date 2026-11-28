# Proposal

## Why

JWT Decoder 当前仅支持 HS256 验签，alg 为 RS256/ES256 等非对称算法时降级显示「仅支持 HS256」——而生产环境 token 多为 RS256，调试签名验证是真实高频需求（当初 v1 明确延后的遗留项）。密钥输入是延后的根因：PEM 公钥多行、JWK 是长 JSON，单行搜索栏的 `||` 语法超出其设计舒适区（hash 的 `||` 成立前提是"密钥短"）。本 change 用「方案 E」解决：List 主体验不动（claims 逐行复制是命令 80% 的价值），验签动作弹出双栏 Form（密钥专属输入区），兼顾两者。

## What Changes

- **验签算法扩展**：新增 RS256 / ES256 验签（Node 原生 `crypto.verify`，零依赖；**ES256 用 `dsaEncoding: "ieee-p1363"` 直接接受 JWS raw 签名——零格式转换**，已实测：raw 64 字节验签 ✅ / 篡改检测 ✅ / JWK 导入 ✅，手写 ASN.1 转换整个砍掉）
- **密钥三格式自动识别**（按内容判定，用户无需选格式）：
  - PEM：`-----BEGIN` 开头（PUBLIC KEY / CERTIFICATE 提取公钥）
  - JWK：`{` 开头的 JSON（`createPublicKey({ key: jwk, format: 'jwk' })` 导入，kty=RSA/EC）
  - 文件路径：以 `~` 或 `/` 开头 → 读文件，读失败归「公钥无法解析」；内容回到 PEM/JWK 判定
- **交互（方案 E）**：
  - List 主体验不变：搜索栏粘贴 token 解码、claims 逐行回车复制、`||` 内联密钥（短密钥 HS256 场景保留，向后兼容）
  - 新增「验证签名…」动作（快捷键 ⌘V）：弹出 Form 视图——栏 1 只读显示 token 摘要（前 20 字符 + 算法），栏 2 密钥 TextArea（粘贴 PEM/JWK/文件路径任一）；**密钥栏自动预填剪贴板内容**（复制公钥后打开即就绪，降低教育成本）；回车确认 → 回到 List，状态行显示验签结果
  - 状态行降级提示收敛：仅 alg=none 一种（其余算法在提供密钥后真实验签）
- **`src/lib/pure.ts` 新增**（零 IO：文件读取经 `readFile` 参数注入，默认实现在组件侧）：`resolveKeyMaterial(raw, readFile?): { key: KeyObject; kind: "pem" | "jwk" | "file" } | { error: "unparseable" } | null`（null=非三格式文本）、`verifyWithKey(token, key): boolean`（纯函数：RS256 `RSA-SHA256`；ES256 `null` 算法 + `dsaEncoding: "ieee-p1363"`）、`verifyAsymmetric(token, raw, readFile?): { ok?; error? }` 组合层（算法-密钥类型匹配校验 + 分发；HS256 文本密钥回退 HMAC 路径不变）
- **smoke 断言**：固定 RSA/EC 测试密钥对（公钥 PEM 与预签 token 固化进断言；私钥不入库）+ 真实验签向量（RS256 通过/篡改、ES256 通过/篡改（ieee-p1363 直验）、JWK 等价 PEM、格式识别分支、错误密钥类型、文件路径 fixture（readFile 注入 mock，零真实 IO））
- **spec**：jwt-decoder 的「HS256 可选验签」Requirement 走 MODIFIED（更名「签名验签」：算法 RS256/ES256/HS256、密钥三格式、Form 交互、降级收敛为仅 alg=none）

明确不做：

- JWKS 远程拉取（`/.well-known/jwks.json` 网络——违背离线哲学；用户从认证平台控制台复制 JWK 即可）
- PS256/EdDSA 等更多算法（按需再加，`verifyAsymmetric` 的分发结构已预留）
- 密钥持久化/历史（密钥不落任何存储，Form 关闭即弃）
- kid 自动匹配（多密钥轮换场景：用户自行选对密钥）

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `jwt-decoder`: 「HS256 可选验签」→「签名验签」：算法扩展（+RS256/ES256）、密钥三格式（PEM/JWK/文件路径）、验签 Form 交互（⌘V 动作 + 剪贴板预填）、降级提示收敛（仅 alg=none）；携带原 Requirement 全部场景 + 新增场景

## Impact

- 代码：`src/lib/pure.ts`（+resolveKeyMaterial/verifyWithKey/verifyAsymmetric，约 110 行）、`src/jwt-decoder.tsx`（+验签 Form 次级视图与 ⌘V 动作，约 80 行）
- 测试：`scripts/smoke.ts`（+12 断言，143 → 155：RS256 有效/篡改/类型不匹配 + ES256 有效/篡改（ieee-p1363）+ JWK 等价 PEM + ES256 公钥 JWK 形态 + PEM/JWK 识别 + 路径（readFile mock）+ unparseable + alg=none 跳过）（公钥 PEM 与预签 token 内嵌断言常量；私钥不入库）
- 文档：`README.md`（JWT 小节补非对称验签）
- spec：jwt-decoder MODIFIED 一个 Requirement
- 无新增依赖；密钥仅在内存态参与验签，不写剪贴板历史以外的任何持久存储
