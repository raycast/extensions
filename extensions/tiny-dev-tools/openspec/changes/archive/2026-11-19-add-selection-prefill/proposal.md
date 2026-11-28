# Proposal

## Why

六个转换类命令的共同高频路径是「编辑器/浏览器选中文本 → 打开命令 → 处理」——目前仅 timestamp / json-format 有各自的 ad-hoc 读取（识别规则硬编码在组件里，无法复用），其余命令需手动粘贴。选中文本自动预填是此前两次 change 明确推迟的决策，理由是「识别规则需单独设计，存在误识别风险」；现在独立立项：统一预填框架一次投入多命令受益，也是后续 Case 转换命令的前置基建。

## What Changes

- **新增共享工具 `src/lib/prefill.ts`**（UI 层模块，非 pure.ts——依赖 Raycast API；detector 纯函数可测）：
  - `usePrefill(detector)` Hook：命令挂载时按**选中优先、剪贴板回退**顺序取文本——`getSelectedText()` 未采纳（无选中文本/权限失败/规则拒绝）时读剪贴板（`Clipboard.read().text`），两路过同一 detector；静默失败（两来源均无采纳则等同无预填）。剪贴板回退来自验收反馈：「复制 → 打开命令」是用户主工作流，且选区在切应用时易丢失、剪贴板不会
  - **detector 纯函数 5 个**（进 smoke 覆盖）：
    - `detectUrlEncoded`：含 ≥1 个 `%XX` hex 对，或含 `://` 且无空格
    - `detectJson`：trim 后以 `{` 或 `[` 开头（现状 json-format 规则，保持不变）
    - `detectBase64`：≥8 字符、仅 `[A-Za-z0-9+/=_-]`、无空白、解码为合法 UTF-8 文本（无 U+FFFD）
    - `detectJwt`：三段式且每段 ≥4 个 Base64URL 字符
    - `detectTimestampLike`：trim 后匹配 `/^-?\d+$/`（可选负号）且 ≤30 位（timestamp 现状规则，迁移所需；timestamp 无源 spec，行为不变故不产生 spec 变更）
  - **共同前置**：trim 后非空、长度 ≤ 4096 字符、**不含 `||`**（防止选中文本自动填充密钥侧——密钥永不来自选中文本）
- **接入三个未读命令**：url-codec、base64（Form 型，预填输入框）、jwt-decoder（List 型，edited 锁存合并）
- **迁移两个已读命令**：timestamp（注入式 setQuery，与现状一致）、json-format（预填进 raw，保留 originText 载入提示）——迁移到共享 Hook，行为不变
- **smoke 断言**：detector 全规则覆盖（采纳/拒绝各分支，含负时间戳采纳）
- **README + 3 个命令 spec**：url-codec / base64 / jwt-decoder 各走一个 MODIFIED delta（空态场景增「匹配选中文本时自动预填」分支）；README 各命令功能清单同步

明确不做：

- **hash 命令接入**：「任意文本皆可哈希」没有天然采纳规则——非空即采纳违背「漏判优于误判」的保守原则（误命中率最高），编造规则又无真实需求；hash 维持纯手动输入，等有明确场景再议
- 密钥预填（`||` 密钥永远手动；含 `||` 的选中文本整体拒绝，见共同前置）
- 多段/多行选中的智能拆分（选中即整体）
- Case 转换命令本身（后续 change，本 change 只做基建）
- timestamp / json-format 的 spec 新建（两者从无源 spec；迁移行为不变，不为补文档而补）

## Capabilities

### New Capabilities

- `input-prefill`: 选中文本自动预填的共享行为契约——读取时机、detector 采纳规则、静默失败、长度与 `||` 前置、edited 锁存（用户输入后预填失效）、密钥不预填原则

### Modified Capabilities

- `url-codec` / `base64` / `jwt-decoder`：各自「空态/打开命令」行为新增「匹配选中文本时自动预填」分支（各一个 Requirement 走 MODIFIED delta，携带原场景全部内容）

## Impact

- 代码：新增 `src/lib/prefill.ts`（Hook + 5 detector）；`src/url-codec.tsx`、`src/base64.tsx`、`src/jwt-decoder.tsx`（+usePrefill 接入）；`src/timestamp.tsx`、`src/json-format.tsx`（迁移，行为不变）
- 测试：`scripts/smoke.ts`（+15 断言，77 → 92：5 个 detector 采纳/拒绝分支）
- 文档：`README.md`（功能清单 + 辅助功能权限说明）
- spec：3 个命令 spec MODIFIED + 1 个新 spec（input-prefill）
- 无新增依赖；`getSelectedText` 为 Raycast 内置（无辅助功能权限时静默跳过）
- hash 命令零改动
