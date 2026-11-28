# Tasks

## 1. 纯逻辑与词表

- [x] 1.1 `src/lib/pure.ts` 新增 `randInt(max)`（`crypto.randomBytes` 拒绝采样，无 modulo bias）、`PASSWORD_SETS` 常量（小写/大写/数字/符号四类；符号为 design 决策 2 的 29 字符清单，总集 91；歧义字符集 `Il1O0o`）、`estimateBits(count, poolSize)`。验证：`npm run typecheck` 通过
- [x] 1.2 `src/lib/pure.ts` 新增 `parseLengthInput(query): number | null`：仅整数十进制串（允许前导零）返回数值，其余（含 `24abc`、`2 4`、空）返回 null。验证：typecheck 通过
- [x] 1.3 新增 `src/lib/wordlist.ts`：`WORDLIST: string[]` 1024 个 4~7 字母常见英文词（全小写、无符号、不含 `ill`/`oil` 类全歧义词）。验证：`node -e` 断言长度 1024、无重复、词均匹配 /^[a-z]{4,7}$/
- [x] 1.4 `src/lib/pure.ts` 新增 `generatePassword(opts: { length: number; preset: "say" | "read" | "all" })`（预设映射字符类与排除；必含每启用类 ≥1：注入 + Fisher-Yates 洗牌）、`generatePassphrase(wordCount: number, words: string[])`（randInt 选词，`-` 连接）。验证：typecheck 通过
- [x] 1.5 `scripts/smoke.ts` 新增 14 断言：`parseLengthInput` 五例（`"24"`→24、`"007"`→7、`"24abc"`→null、`"2 4"`→null、`""`→null）；`estimateBits` 两例（`16×log2(91)≈104`、`4×log2(1024)=40`）；三档结构断言各一（say 档仅字母、read 档无歧义字符、all 档 8 位必含四类各 ≥1）；长度断言（all 档随机长度 8~64 边界采样）；passphrase 两例（词数与连字符、词均来自词表）；源码扫描一例（读 pure.ts 文本断言不含 `Math.random`）。验证：`npm run smoke` 61 passed, 0 failed

## 2. 命令组件

- [x] 2.1 新建 `src/password-generator.tsx`（List 模式，参照 hash.tsx 结构）：搜索栏数字经 `parseLengthInput` 解析（null 沿用默认 16/6，数值各自钳制 8~64/3~8）；三预设行（icon 标识当前档，回车选用后重生成密码行，passphrase 行不变）；密码行 + passphrase 行（subtitle 含位数/词数、bits 与档位，弱档附「增加长度/词数」提示；默认参数 16 位 / 6 词）。验证：`npm run typecheck` 通过
- [x] 2.2 行级动作（先做快捷键原型验证，见 design 决策 7）：密码/passphrase 行 = 复制（回车）+ 粘贴 + 共用「重新生成」动作（⌘R 优先，冲突则 ⌘↩，再不可则无快捷键）；预设行 = 选用该预设（回车）。验证：Raycast 热加载后数字调参、回车选预设、重生成快捷键、回车复制均可用，快捷键实际取值记录于本任务备注（实际采用 ⌘R，组件内 Action shortcut 直接生效）
- [x] 2.3 `package.json` commands 追加：`{ "title": "Password Generator", "name": "password-generator", "description": "密码生成：随机密码 / passphrase，三档预设，熵强度指示", "mode": "view" }`。验证：`npm run lint` 无新 error

## 3. 文档与验证

- [x] 3.1 README 更新：功能清单加「Password Generator（密码生成）」小节（三档预设回车选用、双模式、bits 强度、crypto 随机源）；架构图补 `password-generator.tsx` 与 `lib/wordlist.ts`；断言数改 61（顺带修正现残留的过期数字 42）。验证：grep 确认 README 无 `42 断言`/`47 断言` 残留
- [x] 3.2 本地全套验证：`npm run lint` + `npm run typecheck` + `npm run smoke`（61 passed）+ `npm run build` 退出码均为 0。验证：逐条执行确认
- [x] 3.3 提交代码与 spec delta；用户验收后 `openspec archive` 归档（Purpose 段一并写入），`openspec validate --all --strict` 通过后推送。验证：git 状态干净、5 spec 全绿
