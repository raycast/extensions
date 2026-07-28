# fix-mybatis-substitute-placeholder-template-loss 提案

## Why

[tmp/fix.md](../../tmp/fix.md) 报告：MyBatis SQL 格式化器对真实业务日志（`tmp/fix.md` 的 3 个用例）输出了 `'101''公众交付团队'`——即只保留参数值，丢掉了 SQL 模板的全部字符，命令不可用。这是 `fix-store-review-feedback` 引入的回归：把 `substitutePlaceholders` 从 `template.replace(/\?/g, ...)` 重构为字符级扫描器驱动后，回调只往 `out` 累加参数值，未把 SQL 模板字符原样拼回 `out`，导致整段 SQL 模板被丢弃。

## What Changes

- 修复 `src/mybatis.tsx` 的 `substitutePlaceholders`：在每次遇到可替换 `?` 时，把 `[上一个占位符之后, 当前占位符之前]` 的 SQL 模板片段切片拼入 `out`，再用参数值替换 `?`；参数耗尽时保留原 `?`；循环结束后再把尾部剩余字符拼上。
- 调整 `forEachSubstitutablePlaceholder` 的回调签名，把占位符起始下标传给 caller，使替换逻辑能精确切片。
- 给 `SqlScanner` 暴露 `getIndex()`，便于 caller 在 `consumePlaceholder()` 后反推占位符起始位置。

## Impact

- 影响的现有能力：`mybatis-sql-formatter`。
- 公共 API 行为变化：`substitutePlaceholders` 的返回值从「仅包含参数值的串联」恢复为「完整的可执行 SQL」。
- 现有契约（`specs/mybatis-sql-formatter/spec.md`）保持不变：替换语义、字符串 / 注释内 `?` 不被替换、参数类型渲染规则等都已正确实现，仅是本次修复让契约重新生效。

## Out of Scope

- 改进 `splitParameters` 对 `null, true(Boolean), O'Brien(String)` 这类边界 token 切分的准确性（未在 `tmp/fix.md` 中报告，本次先不动）。
- 替换底层字符扫描器实现（`SqlScanner` 已具备单引号 / 双引号 / 行注释 / 块注释状态，正确性已回归验证）。
- 新增工具 / 修改其它命令。
