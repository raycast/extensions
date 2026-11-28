# Tasks

## 1. 验签纯逻辑

- [x] 1.1 一次性生成测试材料（node -e：crypto 生成 RSA-2048 + EC P-256 密钥对、签发 RS256/ES256 有效 token 与篡改 token），公钥 PEM 与 token 打印后**固化进 smoke 断言常量**（私钥不入库、不留脚本文件）。验证：node 打印常量清单
- [x] 1.2 `src/lib/pure.ts` 新增 `verifyWithKey(token, key)`（纯函数：RS256=`verify("RSA-SHA256")`；ES256=`verify(null, { dsaEncoding: "ieee-p1363" })` 零转换直验——已实测锚定，手写 ASN.1 方案已砍）。验证：typecheck + 1.1 向量预验证
- [x] 1.3 `src/lib/pure.ts` 新增 `resolveKeyMaterial(raw, readFile?)`（三格式 + readFile 注入保 pure.ts 零 IO，见 design 决策 1 分发表）与 `verifyAsymmetric(token, raw, readFile?)` 组合层（类型不匹配/unparseable 结构化 error）；`||` 内联密钥侧切换（HS256 文本密钥回退路径不变）。验证：typecheck
- [x] 1.4 `scripts/smoke.ts` 新增 12 断言：RS256 有效/篡改/错误密钥类型、ES256 有效/篡改（ieee-p1363）、JWK 等价 PEM、ES256 公钥 JWK 形态、PEM/JWK 格式识别、文件路径（readFile mock）、unparseable（RS256+普通文本→结构化 error）、alg=none 跳过、异常兜底（损坏签名材料归签名不符）。验证：`npm run smoke` 155 passed, 0 failed

## 2. 验签 Form 与动作

- [x] 2.1 `src/jwt-decoder.tsx`：新增 `VerifyForm`（Form.Description token 摘要 + TextArea 公钥栏带三格式 placeholder + 剪贴板白名单预填 + 「验签」Action 回传结果并 pop）；List 行内新增「验证签名…」Action（⌘V 优先，冲突 fallback ⌘K，实测取值记录于任务备注；实现取 Action.Push + 自定义 shortcut，运行时验证留给用户验收）；状态行接入验签结果三分语义（✅/❌/⚠ 类型不匹配或无法解析）。验证：typecheck + 热加载（⌘V 打开 Form、粘贴 PEM 验签、回 List 见结果）
- [x] 2.2 内联密钥侧按 **alg 先分流**接入（design 决策 1 定案）：HS256 密钥原文直接 HMAC（不经 resolveKeyMaterial，特殊前缀密钥无干扰）；RS/ES256 密钥过 resolveKeyMaterial（普通文本 → ⚠ 公钥无法解析）。验证：热加载回归 `token || your-256-bit-secret` 仍 ✅；RS256 token `|| {"kty":"RSA",...}` 内联 JWK 可验；RS256 token `|| mysecret` 显示 ⚠ 而非 ❌

## 3. 文档与验证

- [x] 3.1 spec delta：jwt-decoder「HS256 可选验签」MODIFIED →「签名验签」（携带原全部场景 + 算法扩展/三格式/Form 交互/错误三分新场景；正文 <500 字符）。验证：`openspec validate add-jwt-asymmetric-verify --strict` 通过
- [x] 3.2 README 更新：JWT 小节补非对称验签（⌘V、三格式、ES256）；断言数 143 → 155。验证：grep 无过期数字
- [x] 3.3 本地全套验证：lint + typecheck + smoke（155）+ build 全 0 退出；手工回归：HS256 内联回归、RS256 Form 验签（真 token）、篡改 token、alg=none、⌘V/⌘K 快捷键实测。验证：逐条执行
- [x] 3.4 提交；用户验收后归档：**先手工同步主 spec Purpose**（删除「非对称算法的诚实降级」表述、写入 RS256/ES256 验签——CLI 不自动合并 Purpose）→ `openspec validate --all --strict`（**先 validate 再 commit**，归档流程教训）→ archive → push。验证：git 干净、9 spec 全绿
