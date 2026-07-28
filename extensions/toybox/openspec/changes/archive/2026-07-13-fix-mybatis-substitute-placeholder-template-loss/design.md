# fix-mybatis-substitute-placeholder-template-loss 设计

## 1. 根因

`fix-store-review-feedback` 把 `substitutePlaceholders` 从「字符串正则替换」改为「`SqlScanner` 驱动 + 回调」后，重构仅关注「跳过字符串 / 注释内的 `?`」，但回调本身只往 `out` 累加参数值：

```ts
forEachSubstitutablePlaceholder(template, () => {
  if (index >= parameters.length) {
    index += 1;
    out += "?";
    return;
  }
  out += formatParameter(parameters[index]);
  index += 1;
});
```

`forEachSubstitutablePlaceholder` 在两次回调之间通过 `SqlScanner.skipOne()` 推进游标，但 `skipOne()` 不会把跳过的字符返回给 caller。于是 `out` 里只有参数值，SQL 模板完全丢失。

对于 `tmp/fix.md` 中的样例，模板里有 2 个 `?`、参数也有 2 个，回调被执行 2 次，`out = "'101' + '公众交付团队'" = "'101''公众交付团队'"`，正好与用户报告的输出字符串一字不差。

## 2. 修复策略

让回调能拿到「上一个 `?` 之后到当前 `?` 之前」的 SQL 片段，并在 callback 中原样拼回 `out`：

- **回调签名**：把 `onPlaceholder: () => void` 改为 `onPlaceholder: (placeholderStart: number) => void`，callback 接收占位符起始下标。
- **扫描器 API**：`SqlScanner` 暴露 `getIndex(): number`；`consumePlaceholder()` 后游标已指向 `?` 之后，caller 用 `scanner.getIndex() - 1` 反推占位符起始下标。
- **切片拼装**：

  ```ts
  let cursor = 0;
  forEachSubstitutablePlaceholder(template, (placeholderStart) => {
    out += template.slice(cursor, placeholderStart);
    if (index >= parameters.length) out += "?";
    else out += formatParameter(parameters[index]);
    index += 1;
    cursor = placeholderStart + 1;
  });
  out += template.slice(cursor);
  ```

  这样无论占位符位于 SQL 上下文、字符串字面量还是注释里，`skipOne()` 推进的游标都不会丢失字符——因为我们靠 `placeholderStart` 而不是「两次回调之间的字符」来定位。

## 3. 契约保持

`specs/mybatis-sql-formatter/spec.md` 中已有的契约在修复后全部满足（用 esbuild 编译 + node 跑临时脚本验证）：

- 「Every placeholder is replaced」：3 个样例 SQL 中所有可替换 `?` 都被替换为参数值。
- 「Placeholder inside string literal is preserved」：`SELECT * FROM docs WHERE title LIKE '%?%' AND id = ?` 配合 `Parameters: 7(Integer)` 输出 `SELECT * FROM docs WHERE title LIKE '%?%' AND id = 7`。
- 「Placeholder inside line comment is preserved」：`SELECT 1 -- pending ?\nFROM dual` 的 `-- pending ?` 整段保留。
- 「Escaped newlines in SQL are normalised」：`Preparing: SELECT * FROM t\nWHERE id = ?` 中的字面量 `\n` 仍被 `unescapeSqlText` 替换为真换行。

不修改 `spec.md` 中的 Requirement / Scenario 条目——现有契约已正确描述期望行为，本变更只是让实现重新满足契约。

## 4. 影响面

仅 `src/mybatis.tsx` 中的 `substitutePlaceholders` / `forEachSubstitutablePlaceholder` / `SqlScanner` 三个内部成员变化：

- `substitutePlaceholders`：行为从「仅返回参数值串联」恢复为「返回完整可执行 SQL」，正是 `parseMybatisLog` 调用者依赖的契约。
- `forEachSubstitutablePlaceholder`：回调签名扩展（参数新增），但仓库内唯一调用方 `substitutePlaceholders` 与 `countSubstitutablePlaceholders` 同步更新；前者用新签名，后者不读参数，向后兼容。
- `SqlScanner`：新增 `getIndex()` 公共方法；其余方法不变。

无公共导出符号新增 / 删除。
