# fix-mybatis-null-parameter-parsing 提案

## Why

[tmp/fix.md](../../tmp/fix.md) 报告：MyBatis SQL 格式化器对真实业务日志输出错位--`null` 参数被并入下一个带类型的参数，导致参数总数从 35 错缩为 16，后续占位符整体串行偏移，末尾留下大量未被替换的 `?`，生成的 SQL 不可用。

根因在 `src/mybatis.tsx` 的 `splitParameters`：它先用 `, ` 切分 `Parameters:` 行，再用「以 `(Type)` 结尾」判断一个 token 是否为完整参数、否则并入 buffer 等待与下一个带类型 token 合并。但 MyBatis 对 `null` 绑定值只打印字面量 `null`、**不带 `(Type)` 后缀**（非空值才会附加类型，如 `1(Integer)`），于是独立的 `null` token 永远不满足「以 `(Type)` 结尾」，被错误地并入下一个带类型参数。

## What Changes

- 修复 `src/mybatis.tsx` 的 `splitParameters`：在判定 token 是否为完整参数时，除了「以 `(Type)` 结尾」外，把独立的 `null` token 也视为完整参数立即提交，不再并入 buffer。
- 在 `mybatis-sql-formatter` 规格的 `MyBatis log parsing` 能力下补充一条 scenario，明确「无类型后缀的 `null` 参数须作为独立参数解析」的契约。

## Impact

- 影响的现有能力：`mybatis-sql-formatter`。
- 公共 API 行为变化：`splitParameters` 对含 `null` 参数的 `Parameters:` 行切分更准确；`parseMybatisLog` 输出的 SQL 中 `null` 参数对应位置变为 `NULL`、后续参数不再串行偏移。
- 现有契约（`specs/mybatis-sql-formatter/spec.md`）的 `Parameter value formatting > Null parameter becomes NULL` 已要求 `null` 输出 `NULL`，本次修复让该契约在「`null` 无类型后缀」的真实日志上真正生效。

## Out of Scope

- 改写 `splitParameters` 为更复杂的字符级扫描器（现有「`, ` 切分 + 按后缀 re-merge」策略在补上 `null` 判定后足以覆盖真实日志，无需重构）。
- 区分「字符串值 `"null"`」与「真 `null` 绑定值」的输出差异（`null(String)` 与 `null` 当前都按既有契约输出 `NULL`，不在本次范围）。
- 新增工具 / 修改其它命令。
