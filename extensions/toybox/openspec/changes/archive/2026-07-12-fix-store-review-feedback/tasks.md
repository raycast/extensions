## 1. 准备

- [x] 1.1 新建 OpenSpec change `fix-store-review-feedback` 并撰写 proposal / design / spec deltas
- [x] 1.2 `openspec validate fix-store-review-feedback` 通过

## 2. JSON 顶层 Primitive 直达详情页（修复 #1）

- [x] 2.1 在 `src/json.tsx` 中识别根节点类型，primitive 时构造 `JsonNode` 并 push `JsonValuePage`
- [x] 2.2 通过临时脚本验证 `"hello"` / `123` / `true` / `null` 四种输入都直达详情页

## 3. MyBatis 占位符替换跳过字符串与注释（修复 #2）

- [x] 3.1 把 `src/mybatis.tsx` 的 `substitutePlaceholders` 重写为字符级状态扫描器（`SqlScanner`）
- [x] 3.2 抽出 `countSubstitutablePlaceholders` 辅助函数并导出
- [x] 3.3 临时脚本验证 `%?%`、`-- ?`、`/* ? */`、`''` 转义 四种情况不被替换

## 4. SELECT 投影列切分改用括号配对感知（修复 #3）

- [x] 4.1 在 `src/mybatis.tsx` 新增 `splitSelectColumns(projection)` 函数并导出
- [x] 4.2 把 `toInsertStatement` 改为调用 `splitSelectColumns`
- [x] 4.3 临时脚本验证 `CONCAT(a, ', ', b) AS name` / `CAST(x AS INT), y` / 普通 `a, b, c` / `COALESCE(y, 0), z` 四种情况

## 5. Hub 搜索过滤恢复（修复 #4）

- [x] 5.1 删除 `src/toybox.tsx` 中的 `filtering={false}` 与空操作的 `useTools` Hook
- [x] 5.2 在 `src/tools.ts` 的 `keywords` 数组中补充中文常用检索词（格式化 / 树形 / JSONPath / 日志 / 占位符 等）
- [x] 5.3 验证搜索 `json` / `mybatis` / `格式化` / `JSONPath` 命中对应工具

## 6. 移除未使用的运行时依赖（修复 #5）

- [x] 6.1 从 `package.json` 的 `dependencies` 删除 `@raycast/utils`
- [x] 6.2 运行 `npm uninstall @raycast/utils` 同步 `package-lock.json`，并清理本地误装的 `tsx`

## 7. 准备商店 metadata 截图（修复 #6）

- [x] 7.1 新建 `metadata/` 目录与 `.gitkeep`、采集说明 `metadata/README.md`
- [ ] 7.2 本地通过 `npm run dev` + Raycast v2 `Capture Window` + `Save to Metadata` 采集 toybox / json / mybatis 三张 2000×1250 PNG（占位流程文档化于 `metadata/README.md`，真实截图由开发者本地 Raycast 采集后提交）
- [ ] 7.3 把 PNG 放入 `metadata/` 并提交

## 8. CHANGELOG 首发格式（修复 #7）

- [x] 8.1 重写 `CHANGELOG.md`：`## [Initial Version] - {PR_MERGE_DATE}`，按 `Added / Changed / Fixed / Refactor` 归类
- [x] 8.2 更新 `AGENTS.md` 中「首次正式发布」段落，注明 `{PR_MERGE_DATE}` 占位符规则

## 9. 质量门禁

- [x] 9.1 `npm run lint`：0 errors（11 warnings 全部位于未改动的预存文件）
- [x] 9.2 `npx tsc --noEmit` 通过
- [x] 9.3 `npx prettier --check src/` 通过
- [x] 9.4 `openspec validate --specs` 通过
- [x] 9.5 `openspec validate fix-store-review-feedback --strict` 通过
- [x] 9.6 `npm run build` 成功，dist 在本地 Raycast 中需要手动验证三条命令的行为
- [ ] 9.7 本地手动在 Raycast 中运行 `npm run dev`，验证：JSON 顶层 primitive 直达详情页；MyBatis 字符串 / 注释内的 `?` 不被替换；Hub 搜索能按关键词过滤

## 10. 归档

- [ ] 10.1 全部任务勾选后 `openspec archive fix-store-review-feedback --yes`
- [ ] 10.2 推送分支并请求 Greptile / Raycast 复检
