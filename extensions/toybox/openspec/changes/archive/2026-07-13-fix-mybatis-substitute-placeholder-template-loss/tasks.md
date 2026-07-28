## 1. 准备

- [x] 1.1 新建 OpenSpec change `fix-mybatis-substitute-placeholder-template-loss` 并撰写 proposal / design / spec delta / tasks
- [x] 1.2 `openspec validate fix-mybatis-substitute-placeholder-template-loss --strict` 通过

## 2. 修复 substitutePlaceholders 丢失 SQL 模板的回归

- [x] 2.1 让 `forEachSubstitutablePlaceholder` 的回调签名接收占位符起始下标
- [x] 2.2 给 `SqlScanner` 暴露 `getIndex()` 公共方法
- [x] 2.3 重写 `substitutePlaceholders`：在 callback 中用 `template.slice(cursor, placeholderStart)` 拼回 SQL 模板字符，循环结束后再 `slice(cursor)` 拼上尾部
- [x] 2.4 `countSubstitutablePlaceholders` 继续兼容新回调签名

## 3. 冒烟验证（临时脚本）

- [x] 3.1 复现 `tmp/fix.md` 三个样例的修复输出，确认 SQL 模板完整、参数值正确插入
- [x] 3.2 回归：字符串字面量内的 `?`（如 `LIKE '%?%'`）仍保留
- [x] 3.3 回归：行注释内的 `?`（如 `-- pending ?`）仍保留
- [x] 3.4 回归：参数不足时剩余 `?` 保留
- [x] 3.5 回归：没有 `Parameters:` 行时所有 `?` 保留
- [x] 3.6 回归：数值参数（`Integer` / `Long` / `BigDecimal`）原样输出
- [x] 3.7 回归：MyBatis 字面量 `\n` / `\t` / `\r` 转义仍被 `unescapeSqlText` 还原

## 4. 质量门禁

- [x] 4.1 `npx tsc --noEmit` 通过
- [x] 4.2 `npx eslint src/mybatis.tsx` 通过（仅遗留 2 条与本次修复无关的 `@raycast/no-ambiguous-platform-shortcut` 警告）
- [x] 4.3 `npx prettier --check src/` 通过
- [x] 4.4 `openspec validate --specs` 通过
- [x] 4.5 `openspec validate fix-mybatis-substitute-placeholder-template-loss --strict` 通过
- [x] 4.6 在 Raycast 中本地手动验证 3 条命令仍然能正常打开 / 运行（用户确认 raycast 测试通过）

## 5. CHANGELOG

- [x] 5.1 在 `## [Unreleased]` 段新增本次修复的 `Fixed` 条目

## 6. 归档

- [ ] 6.1 全部任务勾选后 `openspec archive fix-mybatis-substitute-placeholder-template-loss --yes`
- [ ] 6.2 推送分支并请求审阅
