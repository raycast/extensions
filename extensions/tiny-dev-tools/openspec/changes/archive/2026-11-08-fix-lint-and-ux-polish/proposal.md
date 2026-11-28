# Proposal

## Why

`ray lint`（在无 GUI 环境可运行）暴露了两个发布阻断：图标为 340×340（Raycast 要求 512×512，`npm run publish` 必挂）、manifest 缺少必填的 `dependencies` 属性。同时探索审查发现：smoke 测试存在恒真断言（`|| true`，测了等于没测）、base64 与 url-codec 的交互能力不一致（缺「清空」）、url-codec/base64 结果区可编辑但交换动作会自动重算覆盖编辑内容、CI 未跑 lint、仓库卫生问题（`.pi/` 未忽略、`openspec/` 骨架未提交、README 架构图漂移）。

## What Changes

- **L1 图标合规**：`scripts/gen-icon.mjs` 画布尺寸改为 512×512（圆角半径、笔画等比放大），重新生成 `assets/icon.png`
- **L2 manifest 合规**：`package.json` 补充 `dependencies`（空对象），满足 ray lint schema
- **A1 测试诚实化**：修正 `scripts/smoke.ts` 中恒真断言 `assert(b64Decode("-_8") !== undefined || true, ...)`，为 `-_8` 写真实期望值（URL-safe 字符解码为两个 U+FFFD 替换字符）
- **B1 交互对齐**：base64 命令补「清空」动作（⌃K），与 url-codec 一致
- **B3 结果区只读**：url-codec 与 base64 的结果文本区改为只读，消除「编辑结果 → 点交换 → 自动重算覆盖编辑内容」的坑，对齐 json-format 的只读模式
- **C1** `.gitignore` 增加 `.pi/`
- **C2** 提交 `openspec/` 骨架（config.yaml + .gitkeep）
- **C3** README 同步：架构图补 `src/lib/radio.tsx`、验证章节补 lint 说明
- **F1 CI 加 lint**：`ci.yml` 在 typecheck 与 smoke 之间增加 `npm run lint`

明确不做（留给后续 change）：
- url-codec / base64 自动读取选中文本（识别规则需单独设计，存在误识别风险）
- url-codec 交换映射改为激进还原（现状 `encodeComponent → decode` 是严格逆运算，保持可预期）

## Capabilities

### New Capabilities

- `url-codec`: URL 编解码命令的核心交互契约——四种模式、结果只读、交换与清空动作
- `base64`: Base64 编解码命令的核心交互契约——编解码往返、结果只读、交换与清空动作
- `extension-packaging`: 扩展发布合规与持续验证——图标规格、manifest schema、CI 验证流水线、冒烟断言有效性

### Modified Capabilities

（无——项目尚无任何 specs，全部为新建）

## Impact

- 代码：`src/url-codec.tsx`、`src/base64.tsx`（结果区只读 + 清空动作）
- 构建/资产：`scripts/gen-icon.mjs`、`assets/icon.png`、`package.json`
- 测试：`scripts/smoke.ts`
- CI：`.github/workflows/ci.yml`
- 仓库卫生：`.gitignore`、`README.md`、`openspec/` 骨架
- 无对外 API 变化；用户可感知变化仅两处：base64 多了「清空」动作、url-codec/base64 结果区不再可编辑
