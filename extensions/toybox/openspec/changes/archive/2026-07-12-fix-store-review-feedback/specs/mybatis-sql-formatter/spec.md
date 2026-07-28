## MODIFIED Requirements

### Requirement: MyBatis log parsing

解析器 MUST 定位第一行匹配 `Preparing:\s*` 的内容，以及第一行匹配 `Parameters:\s*` 的内容；MUST 按顺序把 SQL 模板中每个**处于 SQL 语法上下文**的 `?` 占位符替换为对应的参数值。位于单引号字符串（`'…'`）、双引号字符串（`"…"`）、行注释（`-- …`）或块注释（`/* … */`）内的 `?` MUST NOT 被替换。

#### Scenario: Every placeholder is replaced

- **WHEN** SQL 模板中有 `N` 个 SQL 上下文的 `?`，`Parameters:` 行有 `N` 个值
- **THEN** 格式化后的 SQL 包含 `N` 个替换值，且不包含任何位于 SQL 上下文的 `?` 字符

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
