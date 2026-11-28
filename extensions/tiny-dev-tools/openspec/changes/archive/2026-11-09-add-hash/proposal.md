# Proposal

## Why

工具箱现有四个命令（时间戳 / URL / JSON / Base64）均为「文本 ⇄ 文本」类变换，缺少开发者日常另一高频类别：**摘要/哈希**。下载文件校验（MD5/SHA-1 checksum）、JWT HS256 与 Webhook 回调签名验证（HMAC-SHA256）、缓存 key 生成（SHA-256）等场景，用户目前需要离开 Raycast 开浏览器。Node 内置 `node:crypto` 即可覆盖全部需求，**零新增外部依赖**（保持唯一运行时依赖 `@raycast/api` 的干净状态），实现成本约半天。

## What Changes

- **新命令 `hash`**：单输入 + 可选密钥，一次计算并**全量并排展示** 4 种摘要 × 大小写 = 8 行只读结果（按算法成对分组：`MD5` / `MD5 大写` / `SHA-1` / `SHA-1 大写` / `SHA-256` / `SHA-256 大写` / `HMAC-SHA256` / `HMAC-SHA256 大写`）
- **`src/lib/pure.ts`** 新增两个纯函数：`hashText(text, algo)`（md5 / sha1 / sha256）与 `hmacSha256(key, text)`，hex 小写输出；该文件首次引入 `node:crypto`（Node 标准库，Raycast 内嵌 Node 运行时天然支持，终端用户零额外安装）
- **空输入 → 空结果**：输入为空时 8 行全部为空（与 url-codec / base64 惯例一致），不显示空串哈希噪音
- **HMAC 密钥语义**：密钥框留空 → HMAC 两行显示 `—` 并跳过计算；密钥视为 UTF-8 文本，不做 hex 解码
- **动作面板**：按算法 4 个复制动作（`复制 MD5` 为首选/回车，`复制 SHA-1`、`复制 SHA-256`、`复制 HMAC-SHA256` 次之，均为小写 hex）+ 粘贴到前台应用 + 清空（⌃K）；大写结果通过点击只读框原生选中后 ⌘C 取用
- **smoke 断言** 35 → 42：空串向量（`md5("")=d41d8cd…`）、`hello` 三算法向量、RFC 4231 HMAC 已知向量
- **README / package.json**：注册命令、功能清单、架构图与断言数同步

明确不做（留给后续 change）：

- 文件哈希（`Form.FilePicker` + 大文件流式读取，复杂度另一档，单独立项）
- HMAC-MD5 / HMAC-SHA1（遗留场景占比极小）
- 密钥 hex 解码（AWS SigV4 等场景，v1 统一 UTF-8 文本密钥）
- 输出格式切换（base64 输出、去填充等，有需求再加）
- 打开时自动读取剪贴板/选中文本（延续 fix-lint-and-ux-polish 的既定决策：识别规则需单独设计，存在误识别风险）

## Capabilities

### New Capabilities

- `hash`: 哈希命令的核心交互契约——全量并排展示、密钥可选的 HMAC、只读结果、按算法复制动作

### Modified Capabilities

（无——`extension-packaging` 的清单/CI 契约不变，仅在 package.json commands 数组追加新命令，属于既有契约的实例化而非修改）

## Impact

- 代码：`src/lib/pure.ts`（+2 纯函数，首次引入 `node:crypto`）、新增 `src/hash.tsx`（约 80 行，参照 base64.tsx 骨架：受控 state + 只读结果区 + ActionPanel，无模式切换、不用 RadioGroup）
- 构建/清单：`package.json` commands 数组追加 `hash` 条目
- 测试：`scripts/smoke.ts`（+7 断言）
- 文档：`README.md`（功能清单 + 架构图 + 断言数）
- 无对外 API 变化；现有四个命令不受任何影响；纯增量变更，回滚 = 删除新增文件 + revert package.json
