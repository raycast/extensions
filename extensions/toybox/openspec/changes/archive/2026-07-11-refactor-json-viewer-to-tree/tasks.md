## 1. 数据模型与纯函数工具

- [ ] 1.1 新建 `src/json-viewer/types.ts`，导出 `JsonNodeType`、`JsonNode`、`BuildNodeOptions` 等类型
- [ ] 1.2 新建 `src/json-viewer/jsonPath.ts`，实现 `rootPath()`、`childPath(parentPath, indexKey, parentType)`、`escapeKey(key)`
- [ ] 1.3 新建 `src/json-viewer/jsonParser.ts`，实现 `parseJson(input)`（返回 `{kind:"ok",value}` / `{kind:"error",message}`）、`buildNode(value, key, indexKey, parentPath)`、`expandChildren(node)`

## 2. 树形浏览组件

- [ ] 2.1 新建 `src/components/JsonTree.tsx`：接收 `JsonNode[]` 与回调，渲染 `List` + `List.Item`
- [ ] 2.2 新建 `src/components/JsonNodePage.tsx`：包装 `JsonTree`，接收当前节点 path/key/原始值，提供主操作（Object/Array 下钻、Primitive 跳详情）
- [ ] 2.3 新建 `src/components/JsonValuePage.tsx`：渲染 Primitive 详情，提供复制 Action

## 3. 命令入口与错误页

- [ ] 3.1 重写 `src/json.tsx`：默认渲染 `Form` 输入，提交时解析，成功 → `navigation.push(<JsonNodePage root>)`，失败 → `navigation.push(<JsonErrorPage>)`
- [ ] 3.2 `src/json.tsx` 内新增 `JsonErrorPage`：展示错误信息 + 原始输入 + "返回编辑" Action

## 4. 元数据与中央入口同步

- [ ] 4.1 更新 `package.json` 中 `json` 命令的 `title` / `description`
- [ ] 4.2 更新 `src/tools.ts` 中 `json` 工具的 `description` 与 `keywords`

## 5. 校验与收尾

- [ ] 5.1 运行 `npx tsc --noEmit`，确认无类型错误
- [ ] 5.2 运行 `npm run lint`，确认无 ESLint 错误
- [ ] 5.3 运行 `npx prettier --check src/`，确认格式合规
- [ ] 5.4 运行 `openspec validate refactor-json-viewer-to-tree`，确认 delta spec 合法
- [ ] 5.5 在 `CHANGELOG.md` `[Unreleased]` 段添加变更条目

## 6. 归档

- [ ] 6.1 运行 `openspec archive refactor-json-viewer-to-tree --yes`，把 delta spec 合并到 `openspec/specs/json-viewer/spec.md`
