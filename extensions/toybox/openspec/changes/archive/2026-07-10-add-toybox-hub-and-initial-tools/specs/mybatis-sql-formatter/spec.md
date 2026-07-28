# MyBatis SQL 格式化器

## 新增需求（ADDED Requirements）

### 需求：MyBatis 命令已注册

扩展 MUST 在 `package.json` 中以 `mode: "view"` 注册一个 `mybatis` 命令，以便该工具可以直接从 Raycast 命令面板调用。

#### 场景：MyBatis 命令可被检索

- **WHEN** 开发者打开 Raycast 并输入 "格式化 MyBatis SQL"（或 "Format MyBatis SQL"）
- **THEN** `mybatis` 命令出现在结果列表中

### 需求：挂载时自动识别剪贴板

命令在挂载时 MUST 调用 `Clipboard.readText()`。如果返回的文本中至少存在一行以 `Preparing:` 开头，命令 MUST 解析该行并推送到结果视图。

#### 场景：剪贴板内含 MyBatis 日志片段

- **WHEN** 命令打开时剪贴板内含一行以 `Preparing:` 开头的文本
- **THEN** 命令解析该片段，并直接进入 `Detail` 视图渲染可执行的 SQL

#### 场景：剪贴板为空或不包含 Preparing 行

- **WHEN** 剪贴板为空或不包含 `Preparing:` 行
- **THEN** 命令渲染一个 `Form`，让用户可以手动粘贴日志

### 需求：MyBatis 日志解析

解析器 MUST 定位第一行匹配 `Preparing:\s*` 的内容，以及第一行匹配 `Parameters:\s*` 的内容；MUST 按顺序把 SQL 模板中每个 `?` 占位符替换为对应的参数值。

#### 场景：所有占位符都被替换

- **WHEN** SQL 模板中有 `N` 个占位符，`Parameters:` 行有 `N` 个值
- **THEN** 格式化后的 SQL 包含 `N` 个替换值，且不包含任何 `?` 字符

#### 场景：额外的 Total 行被忽略

- **WHEN** 输入中除了 `Preparing` / `Parameters` 之外，还包含一行 `<==      Total: X`
- **THEN** 解析器忽略该行，产出的 SQL 与没有该行时一致

#### 场景：SQL 中转义换行被规范化

- **WHEN** SQL 模板中包含字面量 `\n` / `\t` / `\r` 转义序列
- **THEN** 格式化后的 SQL 把它们替换为对应的空白字符

### 需求：参数值格式化

格式化器 MUST 按 MyBatis 类型渲染每个参数：

- `null` 值输出为字面量 `NULL`
- 数值类型（`Integer`、`Long`、`Short`、`Byte`、`Float`、`Double`、`BigDecimal`、`BigInteger`、`Number` 及其原始类型变体）原样输出
- `Boolean`（及其原始类型变体）输出为 `TRUE` / `FALSE`
- 其他类型（包括 `String`、`Date`、`Timestamp`）用单引号包裹，值内部的单引号双写

#### 场景：数值参数原样输出

- **WHEN** 参数类型为 `Integer`、值为 `42`
- **THEN** 格式化后的 SQL 包含 `42`（不带引号）

#### 场景：字符串参数加引号并转义

- **WHEN** 参数类型为 `String`、值为 `O'Brien`
- **THEN** 格式化后的 SQL 包含 `'O''Brien'`

#### 场景：null 参数输出为 NULL

- **WHEN** 参数类型为 `null` 或值为 `null`
- **THEN** 格式化后的 SQL 包含字面量 `NULL`

### 需求：结果视图提供复制操作

结果视图 MUST 提供：

- 主操作：把格式化后的 SQL 复制到剪贴板
- 次操作：把原始日志片段复制到剪贴板
- 可选的"复制为 INSERT"操作：对于 `SELECT … FROM <table>` 语句，生成一个尽力而为的 `INSERT INTO <table> (cols) VALUES (?, ?, …)` 模板

#### 场景：可复制格式化后的 SQL

- **WHEN** 用户在结果视图上触发主操作
- **THEN** 剪贴板中包含与显示完全一致的可执行 SQL

#### 场景：可复制原始日志

- **WHEN** 用户触发"复制原始日志"操作
- **THEN** 剪贴板中包含用户最初提交的原始日志片段

### 需求：结果视图展示参数元数据

结果视图 MUST 在元数据侧栏列出每个解析得到的参数（类型 + 原始值预览），方便用户核对替换结果。

#### 场景：元数据列出每个参数

- **WHEN** 渲染格式化后的 SQL
- **THEN** 元数据侧栏为每个参数各包含一行，展示其类型与原始值
