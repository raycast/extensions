# Tasks

## 1. 预填框架与 detector

- [x] 1.1 新增 `src/lib/prefill.ts`：`usePrefill(detector)` Hook（挂载时选中优先读 getSelectedText，未采纳则剪贴板回退读 Clipboard.read().text，两路过同一 detector；≤4096 且非空才采纳，静默失败返回 null）+ 导出 5 个 detector 纯函数（`detectUrlEncoded` / `detectJson` / `detectBase64` / `detectTimestampLike` / `detectJwt`，规则见 design 决策 2；共同前置：trim 非空、≤4096、不含 `||`）。验证：`npm run typecheck` 通过
- [x] 1.2 `scripts/smoke.ts` 新增 12 断言（detector 全分支）：url（`a%20b` 采纳、`100%` 拒绝、`https://x.com/a` 采纳、`含 空格` 拒绝）；json（`{"a":1}` 采纳、`hello` 拒绝）；base64（`aGVsbG8gd29ybGQ=` 采纳、`--------` 拒绝、`abc` 拒绝（太短）、`!!!` 拒绝（非法字符））；timestamp（`1699999999` 采纳、`-1000` 采纳（负号）、`2026-11-03` 拒绝）；jwt（jwt.io 示例 token 采纳、`a.b` 拒绝、`a.b!.c` 拒绝）；前置（`a || b` 拒绝（含 ||）、4097 长串拒绝）。验证：`npm run smoke` 95 passed, 0 failed

## 2. 六命令接入/迁移

- [x] 2.1 Form 型接入：`src/url-codec.tsx`、`src/base64.tsx` 挂载 `usePrefill(detectUrlEncoded/detectBase64)`，输入框为空时初始化为预填文本并触发计算。验证：typecheck + Raycast 热加载（选中 URL 编码文本打开命令即预填）
- [x] 2.2 List 合并型接入：`src/jwt-decoder.tsx` 用 edited 锁存合并（`searchText={edited ? query : query || (prefill ?? "")}`，onSearchTextChange 首次触发即 setEdited(true)——清空后预填不复活）；密钥侧永不来自预填（含 `||` 选中文本已被 detector 拒绝）。验证：typecheck + 热加载（选中 JWT 打开命令即解码；输入后清空不回到预填态）
- [x] 2.3 迁移：`src/timestamp.tsx`、`src/json-format.tsx` 删内联 getSelectedText 逻辑，改用 usePrefill（等价规则，行为不变）。验证：typecheck + 热加载回归（选中时间戳/JSON 打开命令行为与迁移前一致）

## 3. spec、文档与验证

- [x] 3.1 spec delta：新建 `selection-prefill` spec（ADDED：时机/静默/前置/edited 锁存/密钥不预填）；**3 个命令 spec 各一个 MODIFIED delta 文件**（`specs/url-codec/spec.md`、`specs/base64/spec.md`、`specs/jwt-decoder/spec.md`——「打开命令/空态」场景增预填分支，携带原 Requirement 全部场景，规则不复述只引用 selection-prefill）。验证：`openspec validate add-selection-prefill --strict` 通过（覆盖全部 delta 文件）
- [x] 3.2 README 更新：功能清单各命令补「自动读取匹配的选中文本」；断言数 77 → 95；`getSelectedText` 需辅助功能权限的说明（无权限静默跳过）。验证：grep 断言数字无残留
- [x] 3.3 本地全套验证：`npm run lint` + `npm run typecheck` + `npm run smoke`（95 passed）+ `npm run build` 退出码均为 0；手工回归清单：五个命令（url-codec/json-format/base64/jwt-decoder/timestamp）各「选中匹配文本打开」+「无选中文本打开」+「选中不匹配文本打开」三种路径 + **「复制匹配文本后打开」（剪贴板回退，验收主路径）** + jwt「输入后清空不复活」+ hash 命令零改动抽查。验证：逐条执行确认
- [x] 3.4 提交代码与 spec delta；用户验收后 `openspec archive` 归档（Purpose 补写），`openspec validate --all --strict` 通过后推送。验证：git 干净、7 spec 全绿（6 存量 + selection-prefill 新增）
