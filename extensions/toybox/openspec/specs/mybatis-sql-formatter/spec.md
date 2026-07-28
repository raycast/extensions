# mybatis-sql-formatter 规格说明

## Purpose

MyBatis SQL 格式化器命令：解析 MyBatis 日志中的 `Preparing:` / `Parameters:` 行，把绑定值替换进 SQL 模板中的 `?` 占位符，输出可执行的 SQL 语句。
## Requirements
### Requirement: MyBatis command is registered

扩展 MUST 在 `package.json` 中以 `mode: "view"` 注册一个 `mybatis` 命令，以便该工具可以直接从 Raycast 命令面板调用。

#### Scenario: MyBatis command is discoverable

- **WHEN** 开发者打开 Raycast 并输入 "格式化 MyBatis SQL"（或 "Format MyBatis SQL"）
- **THEN** `mybatis` 命令出现在结果列表中

### Requirement: Clipboard auto-detection on mount

命令在挂载时 MUST 调用 `Clipboard.readText()`。如果返回的文本中至少存在一行以 `Preparing:` 开头，命令 MUST 解析该行并推送到结果视图。

#### Scenario: Clipboard contains a MyBatis log snippet

- **WHEN** 命令打开时剪贴板内含一行以 `Preparing:` 开头的文本
- **THEN** 命令解析该片段，并直接进入 `Detail` 视图渲染可执行的 SQL

#### Scenario: Clipboard is empty or has no Preparing line

- **WHEN** 剪贴板为空或不包含 `Preparing:` 行
- **THEN** 命令渲染一个 `Form`，让用户可以手动粘贴日志

### Requirement: MyBatis log parsing

解析器 MUST 定位第一行匹配 `Preparing:\s*` 的内容，以及第一行匹配 `Parameters:\s*` 的内容；MUST 按顺序把 SQL 模板中每个**处于 SQL 语法上下文**的 `?` 占位符替换为对应的参数值，并把替换后的结果作为**完整可执行 SQL** 返回——SQL 模板里位于 SQL 语法上下文的其它字符（关键字、表名 / 列名、操作符、空白等）MUST 原样保留。位于单引号字符串（`'…'`）、双引号字符串（`"…"`）、行注释（`-- …`）或块注释（`/* … */`）内的 `?` MUST NOT 被替换。`Parameters:` 行中的参数以 `, ` 分隔；MyBatis 对 `null` 绑定值只打印字面量 `null`（不带 `(Type)` 后缀），解析器 MUST 将其识别为独立参数，不得与相邻带类型参数合并。

#### Scenario: Every placeholder is replaced

- **WHEN** SQL 模板中有 `N` 个 SQL 上下文的 `?`，`Parameters:` 行有 `N` 个值
- **THEN** 格式化后的 SQL 包含 `N` 个替换值，且不包含任何位于 SQL 上下文的 `?` 字符

#### Scenario: SQL template characters are preserved around substituted values

- **WHEN** SQL 模板含完整 SELECT 关键字与多个占位符（如 `SELECT ... WHERE a = ? AND b like concat('%', ?, '%')`），`Parameters:` 行的数量与之匹配
- **THEN** 格式化后的 SQL 包含完整的 `SELECT / FROM / WHERE / LIKE / concat` 等模板字符，`?` 仅在 SQL 语法上下文处被参数值替换；输出可被复制到 SQL 客户端直接执行（防 `substitutePlaceholders` 丢失 SQL 模板的回归）

#### Scenario: Placeholder inside string literal is preserved

- **WHEN** SQL 模板为 `SELECT * FROM docs WHERE title LIKE '%?%' AND id = ?`，参数为 `7(Integer)`
- **THEN** 格式化后的 SQL 包含 `title LIKE '%?%' AND id = 7`，字符串字面量内的 `?` 保持原样

#### Scenario: Placeholder inside line comment is preserved

- **WHEN** SQL 模板为 `SELECT 1 -- pending ?\nFROM dual`，参数为空
- **THEN** 格式化后的 SQL 中 `-- pending ?` 整段保留，`?` 不被替换

#### Scenario: Extra Total line is ignored

- **WHEN** 输入中除了 `Preparing` / `Parameters` 之外，还包含一行 `<==      Total: X`
- **THEN** 解析器忽略该行，产出的 SQL 与没有该行时一致

#### Scenario: Escaped newlines in SQL are normalised

- **WHEN** SQL 模板中包含字面量 `\n` / `\t` / `\r` 转义序列
- **THEN** 格式化后的 SQL 把它们替换为对应的空白字符

#### Scenario: Untyped null parameter is parsed as a standalone parameter

- **WHEN** `Parameters:` 行中存在 MyBatis 对 `null` 绑定值打印的独立 `null` token（无 `(Type)` 后缀），其前后还伴有带类型参数（如 `1(Integer), null, x(String)`）
- **THEN** 该 `null` 被解析为独立参数，对应的 `?` 替换为字面量 `NULL`，且不与相邻带类型参数合并、不导致后续占位符串行偏移

### Requirement: Parameter value formatting

格式化器 MUST 按 MyBatis 类型渲染每个参数：

- `null` 值输出为字面量 `NULL`
- 数值类型（`Integer`、`Long`、`Short`、`Byte`、`Float`、`Double`、`BigDecimal`、`BigInteger`、`Number` 及其原始类型变体）原样输出
- `Boolean`（及其原始类型变体）输出为 `TRUE` / `FALSE`
- 其他类型（包括 `String`、`Date`、`Timestamp`）用单引号包裹，值内部的单引号双写

#### Scenario: Numeric parameter is emitted raw

- **WHEN** 参数类型为 `Integer`、值为 `42`
- **THEN** 格式化后的 SQL 包含 `42`（不带引号）

#### Scenario: String parameter is quoted and escaped

- **WHEN** 参数类型为 `String`、值为 `O'Brien`
- **THEN** 格式化后的 SQL 包含 `'O''Brien'`

#### Scenario: Null parameter becomes NULL

- **WHEN** 参数类型为 `null` 或值为 `null`
- **THEN** 格式化后的 SQL 包含字面量 `NULL`

### Requirement: Result view provides copy actions

结果视图 MUST 提供：

- 主操作：把格式化后的 SQL 复制到剪贴板
- 次操作：把原始日志片段复制到剪贴板
- 可选的「复制为 INSERT」操作：对于 `SELECT … FROM <table>` 语句，生成一个尽力而为的 `INSERT INTO <table> (cols) VALUES (?, ?, …)` 模板。SELECT 投影列的切分 MUST 遵循括号配对规则：函数调用内的逗号（如 `CONCAT(a, ', ', b)`）不被视为列分隔。

#### Scenario: Formatted SQL can be copied

- **WHEN** 用户在结果视图上触发主操作
- **THEN** 剪贴板中包含与显示完全一致的可执行 SQL

#### Scenario: Original log can be copied

- **WHEN** 用户触发「复制原始日志」操作
- **THEN** 剪贴板中包含用户最初提交的原始日志片段

#### Scenario: INSERT template handles comma-bearing expressions

- **WHEN** SQL 为 `SELECT CONCAT(first_name, ', ', last_name) AS name FROM users`
- **THEN** 生成的 INSERT 模板为 `INSERT INTO users (name) VALUES (?);`（1 列 1 占位符），函数内的逗号不被切分为列

#### Scenario: INSERT template handles multi-column plain projection

- **WHEN** SQL 为 `SELECT a, b, c FROM t`
- **THEN** 生成的 INSERT 模板为 `INSERT INTO t (a, b, c) VALUES (?, ?, ?);`（3 列 3 占位符）

#### Scenario: INSERT template handles CAST and nested functions

- **WHEN** SQL 为 `SELECT CAST(x AS INT), COALESCE(y, 0) FROM t`
- **THEN** 生成的 INSERT 模板为 `INSERT INTO t (x, y) VALUES (?, ?);`（2 列 2 占位符）

### Requirement: Result view exposes parameter metadata

结果视图 MUST 在元数据侧栏列出每个解析得到的参数（类型 + 原始值预览），方便用户核对替换结果。

#### Scenario: Metadata lists each parameter

- **WHEN** 渲染格式化后的 SQL
- **THEN** 元数据侧栏为每个参数各包含一行，展示其类型与原始值

