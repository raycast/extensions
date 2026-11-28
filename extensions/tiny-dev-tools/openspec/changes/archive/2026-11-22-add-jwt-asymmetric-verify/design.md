# Design

## Context

JWT Decoder 的验签遗留项（v1 明确只做 HS256）。根因是密钥输入形态：PEM 多行/JWK 长 JSON 超出 `||` 语法的设计前提（短密钥）。方案 E（讨论定案）：List 主体验不动，验签走次级 Form——用户"多栏"直觉与 List 行级复制的交集解。

## Goals / Non-Goals

**Goals:**

- RS256/ES256 真实验签（生产主流算法）
- 密钥三格式零教育成本（粘贴即识别：PEM/JWK/文件路径）
- List claims 逐行复制体验零损失
- `||` 内联 HS256 完全向后兼容

**Non-Goals:**

- JWKS 拉取、PS256/EdDSA、密钥持久化、kid 匹配（见 proposal）

## Decisions

### 1. 分层：密钥解析（IO 边缘）与验签（纯）分离

```
resolveKeyMaterial(raw, readFile?): { key; kind } | { error: "unparseable" } | null   ← readFile 注入（默认组件侧 fs），pure.ts 零 IO
  ├─ raw 以 -----BEGIN 开头 → PEM（X509Certificate 支持 CERTIFICATE 提取公钥）
  ├─ raw 以 { 开头          → JSON.parse → createPublicKey({ format: "jwk" })；解析失败 → unparseable
  ├─ raw 以 ~ 或 / 开头     → readFile 得内容 → 递归判定（PEM/JWK）；读失败 → unparseable
  └─ 其余                   → null（非三格式文本——内联场景回退 HS256 HMAC；Form 场景报「公钥无法解析」）

verifyWithKey(token, key): boolean   ← 纯函数：RS256 = verify("RSA-SHA256")；ES256 = verify(null, { dsaEncoding: "ieee-p1363" })
verifyAsymmetric(token, raw): { ok?; error? }  ← 组合层，**alg 分流在先（M3 定案）**：
  HS256 → 密钥原文直接 HMAC（一律不经 resolveKeyMaterial——Base64 secret 以 / 开头等特殊形态不受识别逻辑干扰；误贴 JWK/公钥则 HMAC 必然 false，❌ 即答案）
  RS256/ES256 → 密钥过 resolveKeyMaterial：成功后 keyType 匹配校验（RSA↔RS256 / EC↔ES256，key.asymmetricKeyType）→ 不匹配 error「密钥类型不匹配」；unparseable 或 null（非三格式文本）→ error「公钥无法解析」（内联与 Form 同语义——RS256 + `|| mysecret` 报解析错误而非误导性的签名不符）
```

- **模块边界（M5 定案·方案①）**：文件读取经 `readFile` 参数注入，pure.ts 保持零 IO 模块契约；smoke 用注入 mock 测路径分支，零真实文件 fixture
- 错误三分语义：签名不符（ok=false）/ 密钥类型不匹配 / 公钥无法解析——各自结构化 error，不静默合并

### 2. ES256：`dsaEncoding: "ieee-p1363"` 零转换（实测定案）

JWS ES256 签名为 raw 拼接（r||s 各 32 字节），Node `crypto.verify` 原生支持 P1363 编码直验：`crypto.verify(null, data, { key, dsaEncoding: "ieee-p1363" }, rawSig)`。**已实测**（2026-11-22）：raw 64B 验签 true / DER 喂入正确 false / 篡改检测正确 / JWK 导入的 EC 公钥同样可用。初稿的手写 ASN.1 DER 转换方案（高 bug 风险：DER 长度变体、前导零）整个砍掉——审查 M1 的正确纠正。

### 3. 验签 Form（次级视图，方案 E）

```
List（主视图）
  └─ ⌘V「验证签名…」→ push <VerifyForm token={...} />
       ├─ 栏 1: Form.Description —— token 摘要（前 20 字… + alg + 当前状态）
       ├─ 栏 2: Form.TextArea 「公钥」——placeholder 提示三格式（PEM / JWK / 文件路径）
       │        初始值 = 剪贴板文本（若以 -----BEGIN / { / ~/ 开头才预填，防止误预填 token 本身）
       └─ 回车「验签」→ verifyAsymmetric → pop 回 List，状态行更新 ✅ 签名有效 / ❌ 签名不符 / ⚠ {结构化错误}
```

- token 经路由参数传入 Form（不重复输入）；验签结果存 List 的 state（Form pop 后展示）
- ⌘V 与 Raycast 内置"粘贴"冲突确认：`Action` 自定义 shortcut `{ modifiers: ["cmd"], key: "v" }` 在 List 行内可用（Raycast 文档允许覆盖；实测如冲突 fallback ⌘K）
- 密钥栏 textarea `enableMarkdown={false}`，敏感内容不渲染；预填白名单四前缀：`-----BEGIN` / `{` / `~` / `/`（m4 统一，与 spec 正文一致）
- **esc 取消行为**：Form 放弃时 List 保留旧验签结果（不清除——旧结果仍是有效信息）
- **与 input-prefill 的边界（M3）**：Form 预填发生于用户显式按 ⌘V 打开验签 Form 之后，属用户主动触发的剪贴板读取（白名单限密钥形态前缀 BEGIN/`{`/`~`/`/`），不属 input-prefill 治理的"命令挂载时 detector 预填"，密钥不预填原则不受影响——两机制独立，无 spec 冲突

### 4. `||` 内联与 Form 的分工

| 场景 | 路径 |
|---|---|
| HS256 短密钥（现状用户） | `token \|\| secret` 内联，不变 |
| RS256/ES256 公钥（本 change 主场景） | ⌘V → Form 粘贴 |
| RS256 公钥以 JWK 单行存在（很短） | 也可 `token \|\| {"kty":...}`——内联密钥侧走同一 `resolveKeyMaterial`（三格式识别对内联同样生效；`||` 后的 PEM 文件路径同样可用） |

内联密钥侧升级为 resolveKeyMaterial 全格式：代码同源、零额外交互，短 JWK/路径场景少一步跳转。

### 5. 状态行语义（降级收敛）

| 情形 | 显示 |
|---|---|
| HS256 + 密钥 | ✅/❌（现状） |
| RS/ES256 + 密钥（内联或 Form） | ✅ 签名有效 / ❌ 签名不符 / ⚠ 密钥类型不匹配 / ⚠ 公钥无法解析 |
| 提供密钥但 alg=none | 未签名 · 跳过验签（现状） |
| RS/ES256 无密钥 | 无验签提示（原"仅支持 HS256"提示删除——已支持，不再是降级；主 spec Purpose 在归档时手工同步（M2）：删除"非对称算法的诚实降级"表述） |

### 6. 测试向量（确定性）

- 不设 testdata 目录：公钥 PEM 与预签 token 全部内嵌断言（m6 澄清——零 IO 定案后无文件 fixture 需求；gen 脚本产物直接以常量形式粘贴进 smoke）
- 向量集：RS256 有效/篡改/错误密钥类型、ES256 有效/篡改（ieee-p1363 直验）、JWK 等价 PEM、格式识别分支（PEM/JWK/路径 mock）、alg 分发（none 跳过）
- 生成逻辑一次性内联执行（node -e 生成密钥对 + 签发 token，产物粘贴固化进 smoke 常量；不留脚本文件——一次性操作不留维护面）

### 7. spec 撰写对照（历史教训前置）

- Requirement 正文 <500 字符（上归档踩过的 strict 红线）
- MODIFIED 携带原「HS256 可选验签」全部场景
- 错误语义三分（签名不符 / 密钥类型不匹配 / 公钥无法解析）各自 scenario 化
- proposal/tasks 断言计数一致（12 条）

## Risks / Trade-offs

- [⌘V 快捷键被 Raycast 保留] → 实测优先，冲突则 ⌘K（spec 不锁死键位，同 password-generator 重生成先例）
- [crypto.verify 异常（非法签名长度/损坏密钥材料）] → verifyWithKey 内 try/catch 兜底：异常归 ❌ 签名不符（不抛错不崩溃——对用户而言"这份密钥验不过这份签名"与"不符"同效）
- [Form 预填误判] → 剪贴板预填有白名单前缀（BEGIN/{/~/），普通文本不预填
- [密钥入剪贴板历史] → 与"复制公钥"的用户主动行为一致，非扩展写入；Form 内不回写剪贴板

## Migration Plan

纯增量 + jwt-decoder 一个 Requirement RENAMED+MODIFIED。`||` 行为向后兼容（HS256 文本密钥路径不变）。**归档时手工同步主 spec Purpose**（删除"诚实降级"表述，写入非对称验签——CLI 不自动合并 Purpose，tasks 3.4 含此步）。回滚 = git revert。

## 附：验签输入方案取舍（m6，讨论记录）

A 文件路径内联（`|| ~/pub.pem`，PEM/JWK 文件按内容识别）/ B 内联 JWK（`|| {"kty":...}` 单行合法）/ C Form 粘贴 / D Form 双栏改造主界面 / **E（定案）** List 不动 + ⌘V 次级 Form + 剪贴板预填——D 牺牲 claims 逐行复制（命令核心价值）；C 无预填教育成本高；A/B 长密钥在单行搜索栏体验差。E 为"多栏输入"直觉与 List 行级复制的交集解；A/B 作为内联轻量补充保留（密钥侧同一 resolveKeyMaterial）。
