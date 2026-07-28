## MODIFIED Requirements

### Requirement: MyBatis log parsing

解析器 MUST 定位第一行匹配 `Preparing:\s*` 的内容，以及第一行匹配 `Parameters:\s*` 的内容；MUST 按顺序把 SQL 模板中每个**处于 SQL 语法上下文**的 `?` 占位符替换为对应的参数值，并把替换后的结果作为**完整可执行 SQL** 返回——SQL 模板里位于 SQL 语法上下文的其它字符（关键字、表名 / 列名、操作符、空白等）MUST 原样保留。位于单引号字符串（`'…'`）、双引号字符串（`"…"`）、行注释（`-- …`）或块注释（`/* … */`）内的 `?` MUST NOT 被替换。

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
