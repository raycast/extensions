# Design

## Context

第九个命令，核心新逻辑是「类型树推断 + 多语言渲染」。存量复用：List 范式、语言/预设选择行（password-generator 的回车选用模式）、json detector 预填、formatJson 错误信息。架构关键决策源自需求讨论：四语言（TS/Java/Go/Python）而非单语言，推断与渲染分离为后续语言扩展留零成本接口。

## Goals / Non-Goals

**Goals:**

- 类型树中间态：推断一次，渲染多次，语言无关
- 四语言渲染输出为可直接粘贴编译/运行的代码（正确性由确定性断言背书）
- 推断边界清晰定案：null 合并、混合数组、空数组、深嵌套、非法键名
- 语言切换交互与 password-generator 预设同心智（↑↓ 导航、回车选用）

**Non-Goals:**

- 更多语言、多样本合并、JSON Schema 输入、校验代码（见 proposal）

## Decisions

### 1. 类型树中间态

```ts
type TypeNode =
  | { kind: "object"; fields: Array<{ name: string; type: TypeNode; optional: boolean }> }
  | { kind: "array"; element: TypeNode | null }        // null = 空数组，无法推断
  | { kind: "union"; members: TypeNode[] }              // 去重后 >1；含 null 时渲染 T | null
  | { kind: "string" } | { kind: "boolean" } | { kind: "null" }
  | { kind: "number"; sub: "int" | "long" | "double" }; // 档位在树层面携带（构建时按值判定）
```

- number 档位判定（精确区间，非绝对值）：整数且 `[-2^31, 2^31-1]` → `int`；整数超该区间且 `[-2^63, 2^63-1]` → `long`；含小数 → `double`（档位以 JSON.parse 后的数值判定，非原文文本——`1.0` 解析为 1 记 int 档）；超 long → `sub` 仍记 `long`（树层不设 overflow 档），**渲染层**判 `Math.abs(v) > 2^63-1` 降级 `string`（规则表有行；tasks 的超 Long 断言属渲染断言）
- 渲染层「语言内等价合并」：TS 将 int/long/double 全映射 `number`（union 中数字档位去重合并）；Java/Go/Python 各自保留档位差异

- `buildTypeTree` 输入 JSON 字符串（JSON.parse 失败返回 null，错误信息由命令层复用 formatJson 的解析）
- **根为 object**：全类型拆分（首类型名 `Root`）
- **根为 array（三种子形态，quicktype 实测定案——其对纯数组根直接放弃输出，我们补齐）**：
  - 元素为原始类型同构（`[1,2,3]`）→ 类型别名：TS `type Root = int[] 渲染`、Go `type Root = []int`、Python `Root = List[int]`、Java 渲染 `List<Long>` 字面类型行（无 class 声明，标题注明"根数组类型别名"）
  - 元素为 object 同构（`[{"a":1},{"a":2}]`）→ 元素类型提升为 `Root`（quicktype 同款：`interface Root { a: number }`，顶层即元素类型）
  - 元素为 object 异构（`[{"a":1},{"b":2}]`）→ **字段并集 + optional**（quicktype 同款）：所有元素的字段并入单一类型，仅部分元素出现的字段标 `optional: true`（TS `a?: number`、Go 指针（档位对应基类型，如 `*int`）+ `omitempty`、Java 包装类型天然可空、Python `Optional[int]`）
- **null 处理（两分支，"有参照才推断"哲学）**：
  - 单字段 null 无参照（`{"email":null}`）→ `unknown`（**不跟 quicktype 的 `email: null` 字面输出**——不可用代码）
  - 数组内同字段 null 混合（`[{"a":1},{"a":null}]`）→ union 合并渲染 `T | null`（quicktype 同款，有非 null 样本参照）；`[null]` 纯 null 数组 → `unknown`
- **union 规则（M4 定案）**：成员按**首次出现顺序**排列；去重粒度 = TypeNode 档位粒度（树层面 int/double 是两个成员）；目标语言内等价成员合并（TS：int+double → 单一 number）；渲染格式统一 `(string | number)`（竖杠两侧空格）
- **深嵌套命名**：类型名从根路径派生（`Root` → 字段 `user` → `User` → 字段 `profile` → `UserProfile`）；冲突时**按类型在树中首次出现顺序占名，后到者追加递增序号**（`User2`、`User3`）

### 2. 推断规则表（唯一权威，spec 引用）

| JSON 形态 | 类型树 | TS | Java | Go | Python |
|---|---|---|---|---|---|
| `1`（int 档） | number:int | `number` | `Integer` | `int` | `int` |
| `3000000000`（long 档） | number:long | `number` | `Long` | `int64` | `int` |
| `1.5`（double 档） | number:double | `number` | `Double` | `float64` | `float` |
| `"x"` | string | `string` | `String` | `string` | `str` |
| `true` | boolean | `boolean` | `Boolean` | `bool` | `bool` |
| `null`（字段，无参照） | `kind: "null"` 节点 | `unknown` | `Object` | `interface{}` | `Any` |
| `[1,2]` | array\<number\> | `number[]` | `List<Integer>` | `[]int` | `List[int]` |
| `["a",1]` | union 元素数组 | `(string\|number)[]` | `List<Object>` | `[]interface{}` | `List[Union[str,int]]` |
| `[]` | array\<null\> | `unknown[]` | `List<Object>` | `[]interface{}` | `List[Any]` |
| `{...}` | object | 拆 interface | 拆 class | 拆 struct | 拆 dataclass |
| 根数组（原始同构） | array\<sub\> | `type Root = T[]` | `List<T>` 字面 | `type Root = []T` | `Root = List[T]` |
| 非法标识符键（`user-id`） | 键清洗 | `userId`（camel） | `userId`（camel） | `UserId`（Pascal）+ tag 保原名 | `user_id`（下划线替换非法字符；合法键如 `userId` 保原名不转 snake） |
| 超大数（超 Long.MAX） | 降级 | `string` | `String` | `string` | `str` |

- Java 数组统一 `List<T>`（非原生数组——DTO 惯例）；数字三档（Integer/Long/Double）按值判定：整数且 |v|≤Integer.MAX → Integer，整数超 → Long，含小数 → Double
- **同一数组内数字混合（`[1, 2.5]`）**：union→Java 取公共父 `Number`？**不**——保持与 TS 一致性：union 渲染各语言等价物（Java `List<Object>` 简化，Go `[]interface{}`）——规则表即契约，渲染器不各自加戏

### 3. 四语言渲染契约（spec 各场景锚定）

- **TypeScript**：`interface Name { ... }` 逐字段分号结尾；嵌套类型后置声明；根名 `Root`
- **Java**：`public class Root { ... }`，嵌套为 `public static class Name`；字段 `private`（契约一部分）+ 无 getter/setter（**纯 DTO 载体，不生成样板**——用户自行让 IDE 生成）；文件级 package/import 不生成（粘贴场景无法知道包名）
- **Go**：`type Root struct { ... }`；字段名 PascalCase 化（`user_name` → `UserName`）+ tag ``json:"user_name"``（原名保留）
- **Python**：`@dataclass` + `class Root:`；字段 `name: str = ""` **不给默认值**（`field_x: str` 裸注解，dataclass 允许）；`from typing import ...` 头部生成（可复制整块）
- 类型行展示：每类型一行，title=类型名、subtitle=字段数；**首行「完整代码」**为合并块（首选复制动作）

### 4. 交互（List，复用两个已验证范式）

```
搜索栏: {"id":123,"profile":{"city":"SZ"}}     ← json 预填现成
🔶 TypeScript   ← 语言行（↑↓+回车选用，同 password-generator）
🔶 Java
🔶 Go
🔶 Python
📋 完整代码      interface Root {...} interface Profile {...}   ← 回车复制整块（首选）
🏷 Root         2 字段
🏷 Profile      1 字段
```

- 语言行回车切换 → 立即重渲染（类型树缓存，不重新解析）
- 类型行回车复制该类型代码块
- 非法 JSON → 错误行（formatJson 同款错误提示：第 N 行第 M 列）

### 5. 预填

直接复用 `detectJson`（`{`/`[` 开头）——语义与 json-format 一致；按「新命令接入预填必改清单」纪律，input-prefill spec 的 detector 清单走 MODIFIED 补充 json-to-types 条目。setState 注入（List 型同 case-converter）。

### 6. spec 撰写对照（历史审查教训前置）

- 推断规则表为唯一权威，四语言渲染场景引用规则表不复述（M2 教训）
- 类型树/命名派生/冲突处理全部 scenario 化（数字三档、null、union、空数组、深嵌套命名各一）
- 数值断言先跑锚点再写 smoke（case-converter 惯例）：同一 JSON 四语言输出、边界各断言
- proposal/design/tasks 断言计数一致（B 类教训）

## Risks / Trade-offs

- [四语言契约的维护面] → 规则表单一权威 + 渲染器零私有逻辑（纯映射）；新语言只加渲染器
- [Java 字段类型推断的值依赖（Integer vs Long）] → 规则表明确三档判定；极端大数（超 Long）渲染 String 并注释——罕见，接受简化
- [嵌套类型名冲突] → 序号后缀方案（`User2`），确定性可断言
- [非法 TS/Java/Go/Python 标识符的 JSON 键（如 `"user-id"`）] → 各语言按自身惯例清洗（TS/Java camelCase 化 + Go PascalCase 化 + Python 保原名——连字符替换下划线），规则表补充该行；spec 场景覆盖一例
- [超大 JSON 性能] → 类型树一次构建 O(n)，渲染按需；4096 预填上限已有

## Migration Plan

无数据迁移。纯增量：pure.ts 追加（类型树+渲染器）+ 新增 json-to-types.tsx + manifest 注册。回滚 = git revert。
