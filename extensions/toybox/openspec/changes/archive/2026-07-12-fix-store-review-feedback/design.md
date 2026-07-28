# fix-store-review-feedback 设计

## 1. JSON 顶层 Primitive 直接进入详情页

**当前行为**：`src/json.tsx` 在 `parseJson` 成功后无条件 `navigation.push(<JsonNodePage>)`。当根值是 `string` / `number` / `boolean` / `null` 时，`JsonNodePage` 渲染的子节点数组为空（primitive 节点没有 children），用户看到一个空列表，无法查看或复制该值。

**修复方案**：在 `parseJson` 成功后判断根节点类型；若是 `object` / `array` 走原路径；若是 primitive 则构造一个 `key="root"`、`path="$"` 的 `JsonNode` 并 `navigation.push(<JsonValuePage ...>)`。`JsonValuePage` 已支持任意 primitive 的展示与复制，零改动复用。

**契约增量**（写入 `specs/json-viewer/spec.md`）：

- 在「Tree-based browsing」之上新增场景：**Top-level primitive root routes to JsonValuePage**——剪贴板或表单输入解析为顶层 string / number / boolean / null 时，命令直接进入 `JsonValuePage`，主区域展示字面量值，Action 暴露「复制值 / JSONPath / JSON」。

## 2. MyBatis 占位符替换跳过 SQL 字符串与注释

**当前行为**：`substitutePlaceholders` 用 `template.replace(/\?/g, ...)` 全局替换。日志 `Preparing: SELECT * FROM docs WHERE title LIKE '%?%' AND id = ?` 配合 `Parameters: 7(Integer)` 会先把 `%?%` 中的 `?` 当成第一个占位符用掉，导致真正绑定的 `id = ?` 变成 `id = ?`（无参数可用），拷贝出的 SQL 不再匹配 MyBatis 真实执行语句。

**修复方案**：把 `substitutePlaceholders` 改为字符级状态扫描器：

- 状态：`NORMAL` / `IN_SINGLE_QUOTE` / `IN_DOUBLE_QUOTE` / `IN_LINE_COMMENT` / `IN_BLOCK_COMMENT`。
- 转移规则（按 SQL 语法约定）：
  - `NORMAL` 遇到 `'` → 进入 `IN_SINGLE_QUOTE`；遇到 `''` 视为字面量单引号，仍停留。
  - `NORMAL` 遇到 `"` → 进入 `IN_DOUBLE_QUOTE`；`""` 视为字面量双引号。
  - `NORMAL` 遇到 `--` 且后随空白或行尾 → 进入 `IN_LINE_COMMENT` 直到行尾。
  - `NORMAL` 遇到 `/*` → 进入 `IN_BLOCK_COMMENT` 直到 `*/`。
  - 仅在 `NORMAL` 状态遇到 `?` 时才消耗下一个参数；参数耗尽时保留 `?`。
- 新增导出函数 `countPlaceholdersForSubstitution(template)`，沿用同一扫描器计数「可替换的 `?`」，便于单测与将来的参数预校验。

**契约增量**（写入 `specs/mybatis-sql-formatter/spec.md`）：

- 在「MyBatis log parsing」下新增场景：**Placeholder inside string literal is preserved**——SQL 模板中位于单引号字符串内的 `?` 不被替换，仅替换 SQL 语法上下文中的 `?`；位于 `--` 行注释或 `/* */` 块注释内的 `?` 同理。

## 3. SELECT 投影列切分改用括号配对感知

**当前行为**：`toInsertStatement` 直接 `match[1].split(",")`。对 `SELECT CONCAT(first_name, ', ', last_name) AS name, age FROM users`，会把函数参数里的逗号也切成列，导致生成错误的 INSERT 模板。

**修复方案**：抽取独立函数 `splitSelectColumns(projection: string): string[]`：

- 字符级扫描：维护一个深度计数器 `parens`，遇 `(` +1、遇 `)` -1，遇 `'` 切到字符串态直到匹配的下一个 `'`。
- 仅当 `parens === 0` 且不在字符串内时把 `,` 视为列分隔。
- 切完后每列 `trim()`；保留现有的 `AS alias` 剥离逻辑；空字符串过滤。

**契约增量**：

- 在「Result view provides copy actions」下新增场景：**INSERT template handles comma-bearing expressions**——对 `SELECT CONCAT(a, ', ', b) AS name FROM t`，生成的 INSERT 模板含 1 个列（`name`）与 1 个占位符；对 `SELECT a, b FROM t` 含 2 列 2 占位符。

## 4. Hub 搜索过滤恢复

**当前行为**：`src/toybox.tsx` 设置 `filtering={false}` 关闭了 Raycast `List` 内置过滤，同时 `useTools` 只是 `useMemo(() => tools, [])` 不读取搜索文本，导致输入框文字完全不生效。

**修复方案**：

- 移除 `filtering={false}`，让 Raycast `List` 按 `title / subtitle / keywords` 自动过滤。
- 删除多余的 `useTools` Hook（已无逻辑可封装）。
- 若以后需要自定义排序 / 分组，再以 `useTools(searchText: string)` 形式回归。

**契约确认**：`specs/toybox-hub/spec.md` 中「Search filters the list」场景已经要求 Raycast 按 `title / subtitle / keywords` 过滤；当前实现违反该契约，本变更修复该违例，无需新增条款。

## 5. 移除未使用的 `@raycast/utils`

**当前行为**：`package.json` 在 `dependencies` 中列出 `@raycast/utils`，但全仓库 `src/` 没有任何文件导入它。Raycast 扩展审稿规则禁止把未使用的包作为运行时依赖。

**修复方案**：从 `dependencies` 中删除 `@raycast/utils`。`devDependencies` 与 `@raycast/api` 不动。

## 6. 准备商店 `metadata/` 截图

**规范要求**：view-type 命令的扩展必须在仓库根目录下提供 `metadata/` 文件夹，内含 2000×1250 PNG（16:10）截图；推荐至少 3 张。

**修复方案**：

- 新建 `metadata/` 目录，按命令名 + 序号命名：
  - `metadata/toybox-1.png`：ToyBox 主入口列表（默认视图）。
  - `metadata/json-viewer-1.png`：JSON 树形浏览页（带 JSONPath 复制 Action 展示）。
  - `metadata/mybatis-1.png`：MyBatis 日志格式化结果页（展示复制 SQL / 复制为 INSERT）。
- 截图采集流程：本地 `npm run dev` → Raycast v2 设置 `Capture Window` 快捷键 → 在各命令视图按快捷键并勾选 `Save to Metadata`。
- 若暂无本地截图，本地 `git` 仅追踪空 `metadata/.gitkeep` 占位，真实 PNG 在后续采集后由开发者本地放入（不在 PR 中提交二进制假图，避免误导审稿）。

## 7. CHANGELOG 首发格式

**规范要求**：Raycast 审稿要求首发版本使用 `## [Title] - {PR_MERGE_DATE}` 占位符，PR 合并时由 Raycast 自动替换为实际日期。

**修复方案**：

- `CHANGELOG.md`：把当前 `## [Unreleased]` 段替换为 `## [Initial Version] - {PR_MERGE_DATE}`；条目按 `Added / Changed / Fixed / Refactor` 归类，本次修复的 5 项 bug 列入 `### Fixed`，新增的元数据文件夹与依赖清理在 `### Changed` / `### Refactor` 中说明。
- `AGENTS.md`：把「首次正式发布」段落改为「使用 `## [Initial Version] - {PR_MERGE_DATE}`，占位符会在 PR 合并时由 Raycast 自动替换为实际日期」，与审稿规则保持一致。
