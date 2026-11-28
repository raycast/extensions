# Tasks

## 1. 纯逻辑与测试

- [x] 1.1 `src/lib/pure.ts` 新增 `hashText(text: string, algo: "md5" | "sha1" | "sha256"): string`（包装 `crypto.createHash`，hex 小写输出）与 `hmacSha256(key: string, text: string): string`（包装 `crypto.createHmac`）。验证：`npm run typecheck` 通过
- [x] 1.2 `scripts/smoke.ts` 新增 7 断言：`md5/sha1/sha256("")`（`d41d8cd98f00b204e9800998ecf8427e` / `da39a3ee5e6b4b0d3255bfef95601890afd80709` / `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`）、`md5/sha1/sha256("hello")`（`5d41402abc4b2a76b9719d911017c592` / `aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d` / `2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824`）、RFC 4231 TC2 `hmacSha256("Jefe", "what do ya want for nothing?")`（`5bdcc146…ec3843`）。验证：`npm run smoke` 输出 42 passed, 0 failed

## 2. hash 命令组件

- [x] 2.1 新建 `src/hash.tsx`（参照 base64.tsx 骨架：受控 state + 只读结果区 + ActionPanel；无模式切换、不用 RadioGroup）：输入 `Form.TextArea` + 密钥 `Form.TextField`（占位「仅 HMAC-SHA256 使用，留空跳过」）+ 8 个只读 `Form.TextField`（4 算法 × 大小写成对分组；空输入全空；空密钥时 HMAC 两行显示 `—`；不 trim 输入）。验证：`npm run typecheck` 通过
- [x] 2.2 `src/hash.tsx` ActionPanel：`复制 MD5`（首选/回车）→ `复制 SHA-1` → `复制 SHA-256` → `复制 HMAC-SHA256`（均小写 hex）→ 粘贴到前台应用（粘贴 MD5 小写 hex）→ `清空`（⌃K，清空输入与密钥，结果随之清空）。空输入触发复制/粘贴、或 HMAC 占位 `—` 时触发复制 HMAC：不写入剪贴板，Toast「无结果可复制」。验证：Raycast 热加载（`npm run dev`）后各动作与空态行为可用
- [x] 2.3 `package.json` commands 数组追加：`{ "title": "Hash", "name": "hash", "description": "哈希/摘要：MD5 / SHA-1 / SHA-256 / HMAC-SHA256，大小写并排，HMAC 支持密钥", "mode": "view" }`。验证：`npm run lint` 无新 error

## 3. 文档与归档

- [x] 3.1 README 更新：功能清单加「# Hash」小节（算法清单、大小写成对展示、HMAC 密钥语义、MD5/SHA-1 非安全用途注记）；架构图 `src/` 下补 `hash.tsx`；两处「35 断言」改「42 断言」。验证：人工核对与代码一致
- [x] 3.2 本地全套验证：`npm run lint` + `npm run typecheck` + `npm run smoke`（42 passed）+ `npm run build` 四条命令退出码均为 0。验证：逐条执行确认
- [x] 3.3 提交代码（含 `openspec/changes/add-hash/`），按 OpenSpec 流程归档 change 并同步 `openspec/specs/hash/spec.md`。验证：`git status` 干净，specs 目录出现 hash 规格
