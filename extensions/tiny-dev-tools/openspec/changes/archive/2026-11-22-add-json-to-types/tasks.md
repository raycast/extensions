# Tasks

## 1. 类型树与推断

- [x] 1.1 `src/lib/pure.ts` 新增 `TypeNode` 类型定义与 `buildTypeTree(json: string): TypeNode | null`：JSON.parse（失败 → null）、object 字段推断（null 字段 → nullable+unknown、嵌套 object 递归、数组元素合并 union）、根 array 元素同构/异构判定。验证：`npm run typecheck` 通过
- [x] 1.2 `src/lib/pure.ts` 新增类型命名派生：根 `Root`、嵌套按路径 PascalCase 派生（`user`→`User`、`user.profile`→`UserProfile`）、冲突追加序号（`User2`）。验证：`npm run typecheck` 通过
- [x] 1.3 `scripts/smoke.ts` 新增类型树结构断言 12 条（断 TypeNode 结构，不依赖渲染器；超 Long 在树层仍记 long 档、降级属渲染层）：数字三档档位（int/long/double 节点 sub 字段）、`1.0` 按解析值记 int 档、单字段 null → unknown、数组内 null 混合 → union 含 null、`[null]` → unknown、混合数组 union 成员、`[1,2.5]` 树层两档位成员、空数组 element null、嵌套命名派生（user→User、user.profile→UserProfile）、名字冲突序号、根数组三态结构（原始同构/对象同构提升/对象异构并集 optional 标记）、union 首现序。验证：`npm run smoke`（含新增结构断言）通过

## 2. 四语言渲染器

- [x] 2.1 `src/lib/pure.ts` 新增 `renderTypescript(tree)` 与 `renderJava(tree)`：TS interface 契约（分号、嵌套后置、`unknown[]`/`unknown`）；Java `public class` + 嵌套 static class + 包装类型三档 + `List<T>` + 字段 camelCase。验证：锚点预验证（同一 JSON 四语言输出对照 design 规则表跑通）后写入断言
- [x] 2.2 `src/lib/pure.ts` 新增 `renderGo(tree)` 与 `renderPython(tree)`：Go struct + 字段 PascalCase + `json:"原名"` tag；Python `@dataclass` + typing 注解 + import 头。验证：同上锚点预验证
- [x] 2.3 `scripts/smoke.ts` 新增渲染断言 15 条（多检查点合并）：标准样本四语言各 1（=4）+ 根数组三态 TS 3 + Go 异构 1 + Java 例外 1 + 数字三档 Java/Go 2 + 非法键名 Go 1 + null 两分支 TS 2 + Python Optional 1。验证：`npm run smoke` 143 passed, 0 failed

## 3. 命令组件

- [x] 3.1 新建 `src/json-to-types.tsx`（List 模式）：四语言行（↑↓+回车选用切换，当前档高亮，类型树缓存不重解析）；「完整代码」首行（合并块，回车复制首选）+ 每类型一行（回车复制该块）；`usePrefill(detectJson)` setState 注入；非法 JSON 错误行（复用 formatJson 错误提示）；空态 EmptyView。验证：`npm run typecheck` 通过
- [x] 3.2 `package.json` commands 追加：`{ "title": "JSON to Types", "name": "json-to-types", "description": "JSON 转类型代码：TypeScript / Java / Go / Python 四语言切换，复制即用", "mode": "view" }`。验证：`npm run lint` 无新 error

## 4. 文档与验证

- [x] 4.1 README 更新：功能清单加「JSON to Types（JSON 转类型代码）」小节（四语言、推断规则要点、渲染契约一句话）；架构图补 `json-to-types.tsx`；断言数 116 → 143。验证：grep 无过期断言数字
- [x] 4.2 本地全套验证：`npm run lint` + `npm run typecheck` + `npm run smoke`（143 passed）+ `npm run build` 退出码均为 0；手工回归：粘贴 JSON 四语言切换、复制整块/单类型、非法 JSON 错误、复制预填。验证：逐条执行确认
- [x] 4.3 提交代码与 spec delta；用户验收后 `openspec archive` 归档（Purpose 补写），`openspec validate --all --strict` 通过后推送。验证：git 干净、9 spec 全绿（8 存量 + json-to-types）
