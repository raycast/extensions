# Proposal

## Why

hash 命令当前用 Form 实现（8 个只读 TextField 结果区），两个体验问题：① 表单垂直堆叠冗长，密钥框、分隔线占行数，不紧凑；② ActionPanel 无法逐行挂复制动作，大写结果只能「点击只读框选中 → ⌘C」两步取用。timestamp 命令已验证 List 模式（↑↓ 键盘导航 + 回车即复制）的交互效率，hash 的「多值并排对照」场景与之天然契合。经 API 类型定义核实：Raycast 不支持 Form/List 混合布局（List 无 hideSearchBar、children 仅接受 Section/Item、searchBarAccessory 仅接受 Dropdown），List 化是拿到逐行复制的唯一路径。

## What Changes

- **UI 根组件 Form → List**：搜索栏即输入框（`filtering={false}` 自行计算，同 timestamp），8 行结果改为 List.Item——↑↓ 移动选择、回车复制任意行（含大写，原「大写两步取用」限制消失）
- **HMAC 密钥输入改为 `||` 搜索语法**：`文本 || 密钥`（`||` 后为密钥）；timestamp 已教育用户「搜索栏输表达式」，placeholder 与 EmptyView 说明语法
- **`src/lib/pure.ts` 新增 `parseHashInput(query)`**：拆分文本与密钥的纯函数（首个 `||` 分隔，两侧各取原文不 trim，与「所见即所哈希」一致），可 smoke 测试
- **空态 → `List.EmptyView`**：无输入时说明 `||` 语法；空态条件按**文本侧**判断——文本侧为空即显示 EmptyView（含仅密钥侧有内容的 `|| 密钥` 状态，无可哈希对象不展示结果行）
- **无密钥态**：HMAC 两行保留、显示 `—`，副标题提示「加 ` || 密钥` 启用」（保持 8 行结构可预期）
- **README 同步**：Hash 小节交互描述改为 List 模式

明确不做：

- 多行/大段文本输入（List 搜索栏单行；哈希对象以小段文本为主，接受此限制，README 注明）
- 选中文本自动读取（与既有推迟决策一致，不混入本 change）
- 其余四个命令的 UI（timestamp 已是 List；url-codec / base64 / json-format 的输入为多行常态，维持 Form）

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `hash`: 结果展示由 Form 只读区改为 List 行（逐行键盘导航与回车复制）；密钥输入由独立密钥框改为 `||` 搜索语法；空态提示与无密钥占位随之调整。MD5/SHA-1/SHA-256/HMAC-SHA256 全量并排（大小写成对）、所见即所哈希（不 trim）、UTF-8 密钥语义不变。

## Impact

- 代码：`src/hash.tsx` 重写（Form → List，约 100 行）；`src/lib/pure.ts` 新增 `parseHashInput`（约 10 行）
- 测试：`scripts/smoke.ts` 新增 5 断言（parseHashInput：无 `||`、有 `||`、多 `||`、空文本侧、单个 `|` 不分隔），42 → 47
- 文档：`README.md` Hash 小节
- 无对外 API 变化；纯 UI 层重构，`hashText`/`hmacSha256` 与既有 42 断言不动
- spec：`openspec/specs/hash/spec.md` **5 个 Requirement 走 MODIFIED delta**（3 个实质重写：「全量并排展示四种摘要」「HMAC-SHA256 密钥语义」「结果区只读与复制动作」+ 2 个语义扩展：「空输入与空密钥行为」「所见即所哈希」），归档时整块替换
