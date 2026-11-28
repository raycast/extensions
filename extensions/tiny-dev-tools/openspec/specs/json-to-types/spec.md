# json-to-types Specification

## Purpose

定义 JSON 转类型代码命令的交互契约：粘贴/预填 JSON 经语言无关类型树推断（数字按值三档、null 两分支——单字段 unknown 不猜测、数组内混合 T | null、混合数组 union 首现序+语言内等价合并、根数组三态——别名/同构提升/异构并集 optional、全路径命名派生+冲突序号、非法键按语言清洗），渲染为 TypeScript / Java / Go / Python 四语言可直接粘贴的类型声明（规则表为唯一权威）；语言行回车切换、完整代码与单类型双层复制、预填复用 json detector。

## Requirements

### Requirement: 四语言切换与类型展示
命令 SHALL 提供四种目标语言行（TypeScript / Java / Go / Python），↑↓ 仅导航、回车选用后 SHALL 立即以该语言重新渲染；展示 SHALL 包含「完整代码」首行（当前语言全部类型合并代码块，首选复制动作）与其后每类型一行（title=类型名、subtitle=字段数，回车复制该类型代码块）；空输入 SHALL 显示 EmptyView，非法 JSON SHALL 显示错误行（含行列信息）。

#### Scenario: 粘贴即出类型
- **WHEN** 用户粘贴 `{"id":123,"name":"John"}`
- **THEN** TypeScript（默认语言）渲染 `interface Root { id: number; name: string; }`，「完整代码」与 `Root` 类型行立即可复制

#### Scenario: 回车切换语言
- **WHEN** 用户 ↑↓ 聚焦 Go 行并按回车
- **THEN** 类型行立即变为 Go struct 渲染（`type Root struct { ... }` + json tag）

#### Scenario: 非法 JSON
- **WHEN** 输入 `{"a":}` 
- **THEN** 显示错误行（含解析错误行列信息），不展示类型

### Requirement: 类型推断规则
类型推断 SHALL 遵循 design 规则表（唯一权威）：number 按值分三档（整数在 `[-2^31, 2^31-1]` → int 档；整数超该区间且在 long 范围 → long 档；含小数 → double 档；超 Long 范围降级 string）；单字段 null 无参照 → unknown（不猜测类型）；数组内同字段 null 混合 → `T | null`（有非 null 样本参照）；union 成员按首次出现顺序排列、目标语言内等价成员合并（TS 的 int/double/long → number）；空数组元素 unknown；嵌套对象拆独立类型、类型名按路径 PascalCase 派生（根 `Root`，`user.profile` → `UserProfile`）、同名冲突按首次出现顺序占名后到者追加序号；JSON 键为非法标识符时按目标语言惯例清洗（TS/Java camelCase、Go PascalCase + tag 保原名、Python 下划线替换）。

#### Scenario: 数字三档
- **WHEN** 字段值分别为 `1`、`3000000000`（超 int）、`1.5`
- **THEN** TS 渲染均为 `number`；Java 分别为 `Integer`、`Long`、`Double`；Go 为 `int`、`int64`、`float64`；Python 为 `int`、`int`、`float`

#### Scenario: 根数组·原始同构
- **WHEN** 输入 `[1, 2, 3]`（TypeScript）
- **THEN** 渲染类型别名 `type Root = number[]`

#### Scenario: 根数组·对象同构提升
- **WHEN** 输入 `[{"a":1},{"a":2}]`（TypeScript）
- **THEN** 元素类型提升为根 `interface Root { a: number; }`

#### Scenario: 根数组·对象异构并集
- **WHEN** 输入 `[{"a":1},{"b":2}]`（TypeScript / Go）
- **THEN** TS 渲染 `interface Root { a?: number; b?: number; }`（字段并集 + optional）；Go 渲染指针字段 `*int` + `omitempty` tag

#### Scenario: 数组内 null 混合
- **WHEN** 输入 `[{"a":1},{"a":null}]`（TypeScript）
- **THEN** 渲染 `a: number | null`（有参照才推断）

#### Scenario: 非法键名清洗
- **WHEN** 输入 `{"user-id": 1}` 分别切换四语言
- **THEN** TS/Java 渲染 `userId` 字段、Go 渲染 `UserId` + ``json:"user-id"`` tag、Python 渲染 `user_id`

#### Scenario: 根数组·Java 例外形态
- **WHEN** 输入 `[1, 2, 3]` 切换到 Java
- **THEN** 渲染 `List<Integer>` 字面类型行（无 class 声明——Java 根数组显式例外，粘贴用作字段类型）

#### Scenario: 小数点整数按解析值判定
- **WHEN** 字段值为 `1.0`（原文含小数点，JSON.parse 后为整数 1）
- **THEN** 按 int 档判定（Java `Integer`、Go `int`）——档位以解析后的数值为准，非原文文本

#### Scenario: 纯 null 数组
- **WHEN** 输入 `[null]`
- **THEN** 元素推断为 unknown（TS `unknown[]`）

#### Scenario: null 字段
- **WHEN** 字段值为 `null`
- **THEN** TS 渲染 `unknown`、Java `Object`、Go `interface{}`、Python `Any`

#### Scenario: 混合数组
- **WHEN** 字段值为 `["a", 1]`
- **THEN** TS 渲染 `(string | number)[]`、Java `List<Object>`、Go `[]interface{}`、Python `List[Union[str, int]]`

#### Scenario: 空数组
- **WHEN** 字段值为 `[]`
- **THEN** TS `unknown[]`、Java `List<Object>`、Go `[]interface{}`、Python `List[Any]`

#### Scenario: 嵌套命名派生
- **WHEN** 输入 `{"user":{"profile":{"city":"SZ"}}}`
- **THEN** 生成三个类型：`Root`、`User`、`UserProfile`

### Requirement: 各语言渲染契约
四语言输出 SHALL 为可直接粘贴使用的类型声明代码：TypeScript（`interface` + 分号 + 嵌套类型后置）；Java（`public class` + 嵌套 `public static class` + 包装类型 + `List<T>` + 字段 `private` camelCase，不生成 getter/setter 与 package）；根数组为 Java 显式例外——渲染 `List<T>` 字面类型行（粘贴场景用作字段类型注解，非独立编译单元）；Go（`type X struct` + 字段 PascalCase + ``json:"原字段名"`` tag）；Python（`@dataclass` + typing 注解 + 裸注解无默认值 + import 头部）。

#### Scenario: Go tag 保留原名
- **WHEN** 输入 `{"user_name":"x"}` 切换到 Go
- **THEN** 渲染 `UserName string` 字段 + ``json:"user_name"`` tag

#### Scenario: Java 嵌套类
- **WHEN** 输入含嵌套对象并切换到 Java
- **THEN** 渲染 `public class Root` 内含 `public static class User` 嵌套声明

#### Scenario: Python dataclass
- **WHEN** 输入简单对象并切换到 Python
- **THEN** 渲染 `from typing import ...` 头 + `@dataclass` + `class Root:` + 裸类型注解字段

### Requirement: 预填
命令 SHALL 遵循 input-prefill 规范的 json-to-types detector 采纳规则（与 json-format 同款：trim 后以 `{` 或 `[` 开头）。

#### Scenario: 复制 JSON 预填
- **WHEN** 用户复制 API 响应 JSON 后打开命令
- **THEN** 预填并立即展示默认语言（TypeScript）的类型代码
