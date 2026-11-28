# Design

## Context

hash 命令（add-hash change 产物）以 Form 实现：TextArea 输入 + 密钥 TextField + 8 个只读 TextField。用户反馈：表单不紧凑、大写结果两步取用繁琐。timestamp 命令的 List 模式（搜索栏输入 + List.Item 逐行回车复制）已在线上验证交互效率。本 change 将 hash 迁移到 List 模式。经 `@raycast/api` 1.94.0 类型定义核实：Form/List 为互斥根组件，List 搜索栏不可隐藏不可只读、children 仅接受 Section/Item、searchBarAccessory 仅接受 Dropdown——混合布局不存在，纯 List 是唯一路径。

## Goals / Non-Goals

**Goals:**

- 紧凑展示：8 行结果一屏平铺，去掉表单分隔与密钥框占行
- 逐行复制：↑↓ 导航 + 回车复制任意行（大写不再两步）
- 密钥输入有明确语法、纯逻辑可测（parseHashInput）
- 交互契约同步更新 spec（MODIFIED delta），smoke 覆盖新纯函数

**Non-Goals:**

- 多行/大段文本输入（搜索栏单行，接受限制并文档注明）
- 选中文本/剪贴板自动读取（延续两次推迟决策）
- url-codec / base64 / json-format 的 UI（输入为多行常态，维持 Form）

## Decisions

### 1. List 根组件 + filtering={false}

同 timestamp：`searchText` 受控 + `onSearchTextChange` + `filtering={false}`，扩展自行由输入计算 8 行结果，Raycast 原生过滤关闭（否则哈希串会被当过滤词）。

- 备选：默认 filtering——hex 结果会被搜索词过滤掉，行为不可预期，不选。

### 2. 密钥语法：`文本 || 密钥`

首个 `||` 为分隔符，其后全部为密钥；两侧各取原文不 trim（与「所见即所哈希」一致：哈希对象差一字符全变，密钥同理）。

- 分隔符选 `||`：日常文本几乎不出现（对比 `|` 单竖线在 markdown 表格常见）；timestamp 相对表达式已建立「搜索栏 DSL」心智
- 备选 A：独立「设置密钥」Action 推 Form——两阶段交互 + 密钥状态隐性残留，不选
- 备选 B：HMAC 拆独立命令——破坏「一次输入全量对照」初衷，不选
- 多个 `||`：首个分隔，其余归密钥侧（`a || b || c` → 文本 `a`、密钥 `b || c`），规则简单可预期

### 3. 行布局：8 行（一行一值）

每行 title=哈希值、subtitle=算法名（MD5 / MD5 大写 / …）、accessories 可省。回车 = `Action.CopyToClipboard` 复制该行值；次动作 `Action.Paste` 粘贴到前台应用（同 timestamp 行内动作配置）。

- 备选：4 行 × 每行两动作（回车小写、⌘⇧↩ 大写）——大写要记快捷键，不选；8 行平铺所见即所复制

### 4. 空态与无密钥态

- 无文本：`List.EmptyView`，title/description 说明 `||` 语法（顺带完成语法教育）。**空态条件按文本侧判断**：`parseHashInput(query).text` 为空即 EmptyView——含仅密钥侧有内容的 `|| 密钥` 状态（无可哈希对象，不展示结果行，也不计算 HMAC("", key)）
- 有文本无密钥：HMAC 两行保留显示 `—`，subtitle「HMAC-SHA256（加 ` || 密钥` 启用）」，保持 8 行结构可预期
- 旧 spec 的「空输入触发复制 → Toast 无结果可复制」场景自然消失：空态下没有可聚焦的行，回车无目标——EmptyView 即守卫

### 5. parseHashInput 纯函数

```ts
function parseHashInput(query: string): { text: string; key: string }
```

首个 `||` 拆分，两侧不 trim；无 `||` 时 key 为空串。放 pure.ts，smoke 断言 5 个（无分隔 / 有分隔 / 多分隔 / 空文本侧 / 单个 `|` 不分隔）。

### 6. spec 修改范围（5 个 Requirement 走 MODIFIED）

3 个实质重写 + 2 个语义扩展：

- 「全量并排展示四种摘要」：Form 结果区 → List.Item 行，其余（四算法、大小写成对、无模式切换）不变
- 「HMAC-SHA256 密钥语义」：独立密钥框 → `||` 搜索语法，UTF-8 不 hex 解码不变
- 「结果区只读与复制动作」：整块重写为「逐行键盘复制」——行级 ActionPanel（复制 + 粘贴），原「ActionPanel 4 复制动作 / 空态 Toast / 大写两步取用」场景全部替换
- 「空输入与空密钥行为」：空态载体 EmptyView（条件按文本侧判断，含仅密钥态）
- 「所见即所哈希」：不 trim 语义扩展到密钥侧

## Risks / Trade-offs

- [多行文本无法输入] → 接受并 README 注明；哈希对象以小段文本/token 为主；后续若真实需求出现，配合「选中文本自动读取」（可含换行）另立 change 补齐
- [`||` 学习成本] → placeholder + EmptyView 双处说明；密钥场景低频，语法一旦学会零成本
- [首次键入 `|` 未成对时的中间态] → 少于 2 个连续 `|` 不视为分隔符，按普通文本处理，无闪烁
- [spec MODIFIED 首次使用] → delta 中完整保留每个被改 Requirement 的修改后全文，归档时整块替换，避免上下文丢失

## Migration Plan

无数据迁移。hash.tsx 重写 + pure.ts 增函数 + smoke 增断言，单 PR 提交；回滚 = git revert。spec 归档时以 delta 整块替换 `openspec/specs/hash/spec.md` 对应 Requirement。
