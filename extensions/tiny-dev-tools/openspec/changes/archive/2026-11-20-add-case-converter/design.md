# Design

## Context

第七个转换类命令，全部存量范式复用：List + 多行结果 + 回车复制（hash）、预填（input-prefill 框架 + setState 注入）。核心新逻辑只有拆词与拼装，均为确定性纯函数——测试性全项目最佳（无随机、无时间依赖、无边界态歧义）。

## Goals / Non-Goals

**Goals:**

- 任意 case 输入 → 6 格式全并排，无需选源格式
- 全格式互转的正确性由统一拆词中间态保证
- 预填零新框架（复用 input-prefill 全套契约）
- smoke 断言全确定性值

**Non-Goals:**

- 自然语言格式、缩写词表、Unicode 标识符、批量转换（见 proposal）

## Decisions

### 1. 拆词算法：分隔符 + 大小写边界两阶段

```
splitWords("user_created_at")
  阶段一 按分隔符切：["user","created","at"]
splitWords("userCreatedAt")
  阶段二 大写边界切：["user","Created","At"] → 统一 lowercase
splitWords("XMLHttpRequest")
  阶段二 连续大写归前词：["XML","Http","Request"]
```

**语义基准：change-case v4（Raycast Store 同源库）实测行为**（30 用例实测：大写边界与 lodash.words 交叉一致 7/7（XMLHttpRequest/HTMLElement/parseJSONData/userID 等）；数字边界 lodash 为少数派切单独词（base|64|encode），change-case 自洽 8/8（base64|encode），取后者；已知边角 `OAuthToken`→`o|auth|token` 两库一致，跟随）：
- 阶段一：按 `_` `-` `.` 切，连续分隔符空段丢弃（`user__name` → `user|name`）
- 阶段二：段内大小写边界切分，**连续大写段归前词**（`XMLHttp` → `XML|Http`；小写→大写 `pR` → `p|R`）；数字与字母连续不切（`v2User` → `v2|User`，`user2Name` → `user2|Name`）
- 空输入/拆不出词元（如 `---`）→ 全格式输出空串，UI 仍显示六行（title 为空）——不引入 EmptyView 分支，保持无状态简单性

### 2. 六种拼装（词元数组 → 各格式）

| 格式 | 规则 | 例（["user","created","at"]） |
|---|---|---|
| camel | 首词全小写 + 后续词首字母大写 | userCreatedAt |
| pascal | 全部词首字母大写 | UserCreatedAt |
| snake | 全小写 `_` 连 | user_created_at |
| kebab | 全小写 `-` 连 | user-created-at |
| constant | 全大写 `_` 连 | USER_CREATED_AT |
| dot | 全小写 `.` 连 | user.created.at |

`convertCase` 一次拆词返回六元组对象（避免六次重复拆词）；各拼装为纯字符串操作无状态。

### 3. 交互（hash 同构，最简形态）

```
搜索栏: user_created_at
🏷 userCreatedAt      camelCase
🏷 UserCreatedAt      PascalCase
🏷 user_created_at    snake_case          ← 原样行（输入即该格式）
🏷 user-created-at    kebab-case
🏷 USER_CREATED_AT    CONSTANT_CASE
🏷 user.created.at    dot.case
```

- 行级动作：回车复制（title 即完整结果，所见即所复制）+ 粘贴到前台应用（Keyboard.Shortcut.Common.Edit）
- 空搜索栏 → EmptyView「输入或复制一个标识符，六种命名格式并排展示」
- 无模式、无方向、无状态——项目里交互最简单的命令

### 4. 预填：detectCaseLike

```
/^[A-Za-z][A-Za-z0-9_.-]*$/ 且至少含 1 个字母
```

- 采纳：六种格式的任意形态（`user_created_at`、`userCreatedAt`、`USER-CREATED.AT` 混合亦然——形态合法即预填，拆词容错由算法兜底）、单词（`count`，全格式交集）
- 拒绝：含空格（自然语言）、纯数字、首字符非字母（`_foo` 拒绝——罕见表述，宁漏勿误）、超 4096、含 `||`（input-prefill 共同前置）
- 遵循 input-prefill 全套契约：选中优先剪贴板回退、setState 注入、edited 锁存、静默失败

### 5. spec 变更：新 capability + input-prefill 补充

- 新 spec `case-converter`（ADDED）：全格式并排、行级复制、预填采纳
- input-prefill spec 的「detector 采纳规则」Requirement 走 MODIFIED：detector 清单补 `case-converter` 条目（原清单为封闭枚举，新命令接入需扩；携带原全部场景）；顺带把「判定选中文本」澄清为「判定选中文本或剪贴板文本」（与「来源优先级」Requirement 的既有语义对齐，非行为变更）
- 数值口径：+13 断言（转换全表 6 含 dot.case 输入 + 拆词边界 3 + detector 4）→ 111

## Risks / Trade-offs

- [缩写词无智能识别] → 与 change-case v4/lodash 一致（`XMLHttpRequest → xml_http_request` 是主流行为而非妥协）；更聪明的拆分（`xmlHttp|Request`）需缩写词表，v2 增强
- [数字边界] → 实测对齐 change-case v4（数字贴前词）；lodash 为少数派，不跟
- [混合分隔符输入] → 拆词容错处理（阶段一切完空段丢弃），不会崩溃只会拆得略偏，可接受

## Migration Plan

无数据迁移。纯增量：pure.ts 追加 + 新增 case-converter.tsx + manifest 注册。回滚 = git revert。
