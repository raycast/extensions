## 1. 准备

- [x] 1.1 新建 OpenSpec change `fix-mybatis-null-parameter-parsing` 并撰写 proposal / design / spec delta / tasks
- [x] 1.2 `openspec validate fix-mybatis-null-parameter-parsing --strict` 通过

## 2. 修复 splitParameters 对 null 参数的切分

- [x] 2.1 在 `splitParameters` 的「参数完整」判定中，新增 `token === "null"` 短路，使独立 `null` token 立即提交、不并入 buffer
- [x] 2.2 更新 `splitParameters` 文档注释，说明 MyBatis `null` 参数无类型后缀、须独立解析

## 3. 自动化测试

- [x] 3.1 引入 `node:test` + esbuild 打包的测试运行器（`scripts/test.mjs` + `scripts/raycast-stub.cjs`），并在 `package.json` 注册 `npm test`
- [x] 3.2 新增 `src/__tests__/mybatis.test.ts`，覆盖：独立 `null` 切分、连续 `null`、`null` 居中替换为 `NULL`、值含 `, ` 合并、`null + 数值 + 时间戳 + 含 `?` 字符串` 综合不偏移、用户报告真实日志回归
- [x] 3.3 回归：字符串字面量内 `?` 保留、行注释内 `?` 保留、数值原样输出、字符串单引号双写、`substitutePlaceholders` 不丢失模板字符
- [x] 3.4 `npm test` 10 项全部通过

## 4. 忠实验证

- [x] 4.1 用 esbuild 打包真实 `src/mybatis.tsx`（桩掉 `@raycast/api` / `react`）跑 `tmp/fix.md` 输入1：参数数 35 = 占位符 35，`null` 输出 `NULL`，无 SQL 上下文残留 `?`

## 5. 质量门禁

- [x] 5.1 `npx tsc --noEmit` 通过
- [x] 5.2 `npm run lint` 通过
- [x] 5.3 `npx prettier --check src/` 通过
- [x] 5.4 `openspec validate --specs` 通过
- [x] 5.5 `openspec validate fix-mybatis-null-parameter-parsing --strict` 通过

## 6. CHANGELOG

- [x] 6.1 在 `## [Unreleased]` 段新增本次修复的 `Fixed` 条目

## 7. 归档

- [x] 7.1 全部任务勾选后 `openspec archive fix-mybatis-null-parameter-parsing --yes`
- [ ] 7.2 推送分支并请求审阅
