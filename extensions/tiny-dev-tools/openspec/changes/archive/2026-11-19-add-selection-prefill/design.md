# Design

## Context

timestamp 与 json-format 各自内联了 getSelectedText 读取逻辑（识别规则硬编码、try/catch 静默），url-codec/base64/jwt-decoder 没有读取能力。识别规则的误判风险是此前两次推迟的原因——本 change 用「命令专属 detector + 保守规则 + 长度/`||` 前置」三重防线把风险压到可接受：detector 决定「什么算匹配」，误判代价最坏是多填一次输入框（用户可清空），漏判代价是退回手动粘贴（现状），**漏判优于误判**（保守取向）。

## Goals / Non-Goals

**Goals:**

- 统一预填框架：一次实现、五个命令受益（url-codec / json-format / base64 / jwt-decoder / timestamp）
- detector 全部为纯函数，smoke 全覆盖
- 静默失败语义（无选中文本、权限失败、不匹配：一律等同「无预填」）
- 行为对现有命令零回归（timestamp/json-format 迁移后行为不变）

**Non-Goals:**

- hash 接入（无天然采纳规则，见 proposal 决策）、剪贴板回退、密钥预填、多行智能拆分、Case 转换命令、timestamp/json-format 的 spec 新建（见 proposal）

## Decisions

### 1. usePrefill Hook：挂载时读一次，非响应式

`usePrefill(detector)` 返回 `string | null`。实现：`useEffect(() => {...}, [])` 挂载时按**选中优先、剪贴板回退**读取——`getSelectedText()` 采纳则用之；未采纳（无选中文本/权限失败/规则拒绝）时读 `Clipboard.read().text` 再过同一 detector。来源优先级理由：选区是当下意图的最精确信号（用户正看着它），剪贴板是可靠性兜底（选区切应用易丢，剪贴板不会；且「复制→打开命令」是验收反馈确认的主工作流）。两路过同一 detector + preflight，误判防线不变。

**注入方式统一为 setState 注入**（验收实测修正：渲染层合并 `searchText={query || prefill}` 在 Raycast 真机不可靠，setState 注入是已验证路径）：

- **全部命令**：`useEffect` 监听 prefill 到达，一次性 `setInput/setQuery(prefill)` 并触发计算——预填值进入用户态 state，用户编辑天然接管，与 json-format/timestamp 既有行为完全同构
- **jwt-decoder 保留 edited 锁存**：`onSearchTextChange` 首次触发即 `setEdited(true)`，edited 后 useEffect 不再注入（清空不复活）
- **base64 注入时附带 `setMode("decode")`**：预填的是 Base64 串，解码才是用户意图

放 `src/lib/prefill.ts` 而非 pure.ts：依赖 `@raycast/api`，违反 pure.ts「与 UI 完全解耦」的模块契约；detector 纯函数与之同文件导出，smoke 从该文件导入（tsx 运行时无压力）。

### 2. detector 规则（保守取向：漏判优于误判）

| detector | 采纳条件 | 关键拒绝项（举例） |
|---|---|---|
| `detectUrlEncoded` | 含 ≥1 个 `%XX`（hex 对）**或** 含 `://` 且无空格 | 纯中文、含空格文本、`100%`（百分号后非 hex 对） |
| `detectJson` | trim 后以 `{` 或 `[` 开头 | 普通句子（现状规则原样保留） |
| `detectBase64` | ≥8 字符、仅 `[A-Za-z0-9+/=_-]`、无空白，**且**解码为合法 UTF-8（无 U+FFFD 且至少含 1 个可打印 ASCII 或多字节 UTF-8 序列） | `--------`、解码出乱码的随机串、太短 token |
| `detectJwt` | 三段 `xxx.yyy.zzz`、每段 ≥4 字符、仅 Base64URL 字符集 | 两段串、含空格、段内有 `!` 等非法字符 |
| `detectTimestampLike` | trim 后匹配 `/^-?\d+$/`（**可选负号**，与现状一致）且 ≤30 位 | 日期字符串、含字母 |

- `detectBase64` 的 UTF-8 校验复用 pure.ts 的 `b64Decode`（抛错/含 U+FFFD 即拒绝）——文本语义解码，与 jwt-decoder 的字节语义不冲突
- **共同前置（所有 detector 先检查）**：trim 后非空、长度 ≤ 4096、**不含 `||`**——`||` 是 hash/jwt 的密钥分隔语法，选中文本含 `||` 时整体拒绝，从根上保证「密钥永不来自选中文本」（比预填后剥离干净且可测）

### 3. edited 锁存：用户输入后预填永久失效

List 合并型（jwt-decoder）的问题：`query || prefill` 在用户清空输入后 prefill 会复活。方案：`onSearchTextChange` 首次触发即 `setEdited(true)`，此后 `searchText` 恒等于 `query`——**一旦用户输入过（哪怕又删空），预填永久失效**。Form 型天然如此（预填只是初始值）；timestamp 注入型亦然（setQuery 后 query 就是用户态）。

- spec 以行为语言表述：「用户开始输入后 SHALL 完全接管，预填 SHALL NOT 再次生效（含清空后）」

### 4. timestamp / json-format 迁移：行为不变

timestamp 现规则（`sel.length <= 30 && /^-?\d+$/`）与 `detectTimestampLike` 等价（负号保留）；json-format 现规则（`startsWith("{")||startsWith("[")`）与 `detectJson` 等价。迁移 = 删组件内联逻辑 + 换 usePrefill：timestamp 注入 query、json-format 预填进 raw。**json-format 组件内保留 `originText` state 以维持「已自动载入选中文本（N 字符）」提示**（UI 表现不变的一部分）。两者无源 spec，不产生 spec 变更。

### 5. spec 变更范围与规则权威

- 新 spec `input-prefill`（ADDED）：统一契约（时机/静默/前置/edited 锁存/密钥不预填）——**detector 规则的唯一权威在这里**
- 3 个命令 spec 各 MODIFIED 一个 Requirement（「打开命令/空态」增预填分支）：场景只引用「匹配/不匹配 selection-prefill 规则」，**不复述具体规则**（消除双重维护；新命令接入 prefill 只改 selection-prefill spec）
- MODIFIED 条目携带原 Requirement 全部场景（strict 校验要求）

## Risks / Trade-offs

- [辅助功能权限缺失] → getSelectedText 抛错静默忽略，剪贴板回退仍可用（Clipboard.read 无需权限）；不弹权限引导
- [剪贴板陈旧内容误预填] → 内容可能来自很久之前的复制；detector 规则仍全部适用，最坏代价 = 预填一次可清空的输入，用户接受（验收反馈确认「复制→打开」为主工作流，该路径价值大于陈旧风险）
- [detector 误判] → 最坏代价 = 多填一次可清空的输入；三重防线压概率
- [hash 不接入] → 明确的范围取舍：无规则可编优于编一条坏规则；hash 用户维持手动粘贴（现状成本）
- [`||` 前置误伤极少数合法文本] → 含 `||` 的普通文本本就极少；4 个接入命令中仅 jwt 使用 `||` 语法，拒绝是正确取舍
- [迁移引入 timestamp/json-format 回归] → 等价规则 + smoke 断言 + tasks 3.3 手工回归清单

## Migration Plan

无数据迁移。新增一个文件 + 五个命令小改（三个接入、两个迁移），hash 零改动。回滚 = git revert（单提交）。
