# fix-mybatis-null-parameter-parsing 设计

## 1. 根因

`splitParameters` 现实现：

```ts
const tokens = text.split(/,\s+/);
const result: string[] = [];
let buffer: string[] = [];
for (const token of tokens) {
  buffer.push(token);
  if (/\([^()]*\)\s*$/.test(token)) {
    result.push(buffer.join(", "));
    buffer = [];
  }
}
if (buffer.length > 0) {
  result.push(buffer.join(", "));
}
return result;
```

它依赖「以 `(Type)` 结尾」作为「参数完整」的信号：不完整的 token（被 `, ` 错切的不完整值）会留在 buffer 里，直到遇到带 `(Type)` 后缀的 token 才合并提交。这一策略本意是还原「值内含 `, `」的参数（如 `hello, world(String)` 被切分成 `hello` + `world(String)`，需合并回 `hello, world(String)`）。

但 MyBatis 对 `null` 绑定值只打印字面量 `null`、不带 `(Type)` 后缀。于是 `null` token 永不满足 `/\([^()]*\)\s*$/`，被推进 buffer，与下一个带类型 token 合并。以 `tmp/fix.md` 输入1 为例，`null, 20260720220054316(String)` 被当成单个参数 `null, 20260720220054316(String)`，参数总数从 35 错缩为 16，后续占位符串行偏移，末尾 23 个 `?` 未被替换。

## 2. 修复策略

在「参数完整」判定中，把独立的 `null` token 也视为完整参数立即提交：

```ts
for (const token of tokens) {
  buffer.push(token);
  if (token === "null" || /\([^()]*\)\s*$/.test(token)) {
    result.push(buffer.join(", "));
    buffer = [];
  }
}
```

判定顺序为 `token === "null"` 优先：只有当 token 恰好是字面量 `null` 时才命中，不会误伤 `null(String)`（字符串值 `"null"`，带类型后缀，走正则分支）或 `foo, null bar(String)`（值内含 `null` 子串但 token 非精确 `null`，走正则分支）这类 token。

## 3. 边界与回归

- `null, b(String)` → `["null", "b(String)"]`：`null` 独立提交，✓。
- `a, b(String)`（值含 `, `） → `["a, b(String)"]`：`a` 不完整留 buffer，`b(String)` 命中正则合并提交，✓（re-merge 仍工作）。
- `null(String)`（字符串值 `"null"`） → `["null(String)"]`：命中正则分支，`parseParameter` 得 `value="null"`、`formatParameter` 输出 `NULL`，与既有契约一致，✓。
- 连续 `null, null, null` → 三个独立参数，均输出 `NULL`，✓。

用 esbuild 打包真实 `src/mybatis.tsx`（桩掉 `@raycast/api` / `react` 运行时）后跑 `tmp/fix.md` 输入1：参数数 35 = 占位符 35，`null` 全部输出 `NULL`，XML 值内的 `<?xml … ?>` 字面量 `?` 保留在字符串字面量中，无 SQL 上下文残留 `?`。

## 4. 契约变更

在 `MyBatis log parsing` 能力下新增 scenario「Untyped null parameter is parsed as a standalone parameter」，并在 requirement 描述中补一句参数切分规则。不修改 `Parameter value formatting` 的 `Null parameter becomes NULL`（其语义不变，本次只是让它在真实日志上生效）。

## 5. 影响面

仅 `src/mybatis.tsx` 中 `splitParameters` 一个内部函数的条件判定变化（新增 `token === "null"` 短路）。无公共导出符号新增 / 删除，无其它调用方需要同步。
