# Tasks

## 1. 纯逻辑与测试

- [x] 1.1 `src/lib/pure.ts` 新增 `decodeJwt(token)`：三段拆分（非恰好三段 → null）、header/payload 段 Base64URL 解码（`-_`→`+/`、补 padding）+ JSON.parse（失败 → null）、signature 段解码为字节串；新增时间 claim 白名单常量 `JWT_TIME_CLAIMS = ["exp", "iat", "nbf"]`。验证：`npm run typecheck` 通过
- [x] 1.2 `src/lib/pure.ts` 新增 `verifyHs256(token, secret)`：对未解码的 `header.payload` 原文段做 `hmacSha256`，hex 转字节与 signature 段解码字节比对；新增 `jwtStatus(payload, now)` 返回 `expired`/`not-yet-valid`/`valid`/`unknown` 四态与人类可读 label（复用 fmtRelative 粒度）。验证：`npm run typecheck` 通过
- [x] 1.3 `scripts/smoke.ts` 新增 9 断言：jwt.io 官方示例 token（密钥 `your-256-bit-secret`）的解码三断言（alg=HS256、sub、name）+ 验签 true + 错误密钥 false + 篡改签名尾字符 false；状态判定四断言（exp 过去→expired、exp 未来→valid、无 exp→unknown、nbf 未来→not-yet-valid）；decodeJwt 失败路径四断言（两段 → null、四段 → null、非 Base64 段 → null、合法 Base64 但非 JSON → null）。不采用 RFC 7515 A.1 向量（其密钥为 base64url JWK，与 UTF-8 文本密钥语义不符，见 design 决策 6）。验证：`npm run smoke` 77 passed, 0 failed

## 2. 命令组件

- [x] 2.1 新建 `src/jwt-decoder.tsx`（List 模式，参照 hash.tsx）：搜索栏粘贴 token，`|| 密钥` 拆分（复用 parseHashInput）；Header 行（alg · typ，alg=none 显示「未签名」）；状态行（四态 + 有密钥且 alg=HS256 时附验签结果，alg 非 HS256 显示「仅支持 HS256（当前 alg: X）」）；claims 逐行（时间 claim 白名单行 subtitle 双格式：原始值 · 本地时间 · 相对时间；对象/数组值 formatJson 压缩单行）；空态 EmptyView 提示语法；非法输入单行错误提示。验证：`npm run typecheck` 通过
- [x] 2.2 行级动作：claims 行复制值本身（回车，Action.CopyToClipboard）+ 粘贴到前台应用（Keyboard.Shortcut.Common.Edit，同项目惯例）；Header/状态行不提供复制（信息行）或复制原始段（按实现简洁取舍，spec 不约束）。验证：Raycast 热加载后回车复制、时间 claim 双格式展示可用
- [x] 2.3 `package.json` commands 追加：`{ "title": "JWT Decoder", "name": "jwt-decoder", "description": "JWT 解码：claims 逐行展示、时间人性化、HS256 本地验签（token || 密钥）", "mode": "view" }`。验证：`npm run lint` 无新 error

## 3. 文档与验证

- [x] 3.1 README 更新：功能清单加「JWT Decoder（JWT 解码）」小节（离线解码、时间 claims 双格式、状态判定、HS256 验签语法、alg=none/非对称的降级说明）；架构图补 `jwt-decoder.tsx`；断言数 63 → 77。验证：grep 确认 README 无过期断言数字
- [x] 3.2 本地全套验证：`npm run lint` + `npm run typecheck` + `npm run smoke`（77 passed）+ `npm run build` 退出码均为 0。验证：逐条执行确认
- [x] 3.3 提交代码与 spec delta；用户验收后 `openspec archive` 归档（Purpose 段一并补写），`openspec validate --all --strict` 通过后推送。验证：git 状态干净、6 spec 全绿
