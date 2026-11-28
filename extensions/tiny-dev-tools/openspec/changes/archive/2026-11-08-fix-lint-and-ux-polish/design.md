# Design

## Context

四个命令均为 Raycast Form/List 组件构成，`src/lib/pure.ts` 承载全部纯逻辑并由 `scripts/smoke.ts` 覆盖。`ray lint` 可在无 GUI 环境运行并已暴露图标尺寸与 manifest schema 两个 error。json-format 的结果区已采用「只读」模式，url-codec/base64 尚未。动机见 proposal.md - Why。

## Goals / Non-Goals

**Goals:**

- 消除两个发布阻断（icon 512×512、manifest `dependencies`）
- 让 CI 成为发布合规的第一道门（加 lint 步骤）
- 冒烟断言全部真实有效
- url-codec / base64 交互对齐（清空 ⌃K、结果区只读）

**Non-Goals:**

- 不引入 ESLint / Prettier 依赖（lint 的格式检查 warn 不阻断，留待后续）
- 不实现 url-codec / base64 自动读取选中文本（识别规则需单独设计）
- 不改变 url-codec 交换映射（保持严格逆运算）
- 不把 `@raycast/api` 移入 `dependencies`（除非空对象方案验证失败，见决策 4）

## Decisions

### 1. 结果区只读：受控 value + 空 onChange

Raycast `Form.TextArea` 没有 `disabled` / `readOnly` prop。json-format 已用「受控 `value` + `onChange` 空实现」实现只读，本 change 将 url-codec / base64 的结果区 `onChange={setResult}` 改为同样的空实现。

- 备选：用 `Form.Description` 展示结果——不利于全选复制，不选。
- 备选：保留可编辑但在交换时使用原始计算值——需要额外 state 追踪「计算值 vs 编辑值」，复杂度不成比例。

### 2. 图标 340 → 512：全部几何参数按因子等比缩放

`gen-icon.mjs` 中尺寸硬编码，统一乘以 `512 / 340 ≈ 1.5059` 并取整，覆盖脚本内全部硬编码几何常量：画布 S=512、圆角 r=96、笔画 stroke=30、原点 ox/oy（84→127、90→136）、">" 步进 60→90、">" 纵向跨度 140→211、下划线 x 偏移 10→15、下划线 y 偏移 170→256、下划线宽 110→166。

- 备选：只改 S 不动其余参数——图形会偏向左上角，视觉失衡，不选。
- 验证：生成后本地 `npm run lint` 确认尺寸 error 消失，并人工查看图标。

### 3. `-_8` 断言的真实期望值：`"\uFFFD\uFFFD"`

推导：`-_8` 归一化为 `+/8`；查表得字节 `(62<<2)|(63>>4)=0xFB`、`((63&15)<<4)|(60>>2)=0xFF`。两者均为非法 UTF-8 起始字节（5/6 字节序列前缀，UTF-8 上限 4 字节）；`TextDecoder` 默认非 fatal 模式（WHATWG 标准行为）将每个非法字节输出为 U+FFFD。故断言改为 `b64Decode("-_8") === "\uFFFD\uFFFD"`。

现有 try/catch 断言写法（`b64Decode("!!")` 应抛错）逻辑正确，保持不动。

### 4. manifest 修复：补空 `dependencies`

假设：ray lint 的 schema 校验只要求属性存在，`"dependencies": {}` 即可通过。

- 若 apply 时验证不成立：将 `@raycast/api` 移入 `dependencies`（Raycast 官方模板做法），影响 lockfile，需重新 `npm install`。
- 选择空对象优先：最小变更，不动依赖树。

### 5. CI 步骤顺序：lint 最先

`ci.yml` 在 Install 后依序执行 lint → typecheck → smoke → build。lint 放最前：它不做编译、失败最快，且是发布合规的第一道门。ESLint/Prettier 未安装仅产生 warn，不阻断 CI。

## Risks / Trade-offs

- [512 图标等比缩放后视觉比例偏差] → 生成后人工查看 + lint 尺寸校验双保险
- [`dependencies: {}` 假设不成立] → 本地 lint 验证，失败则回退到移动 `@raycast/api` 的方案
- [结果区失去手动微调能力] → 用户已确认；输入区仍可编辑，「编辑输入 → 重算」覆盖绝大多数微调场景
- [`-_8` 期望值依赖 TextDecoder 容错行为] → WHATWG 标准规定行为，跨运行时稳定；断言失败即暴露

## Migration Plan

无数据迁移。图标重新生成直接覆盖 `assets/icon.png`；全部改动单 PR / 单分支提交，回滚 = `git revert`。
