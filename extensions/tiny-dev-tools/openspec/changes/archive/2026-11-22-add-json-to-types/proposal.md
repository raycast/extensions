# Proposal

## Why

前端/全栈调 API 拿到 JSON 后手写类型声明（TS interface / Java DTO / Go struct / Python dataclass）是高频纯消耗，quicktype 类工具百万级用户验证需求。本项目形态完美契合：json detector 预填现成（复制响应 → 打开命令 → 类型代码全并排 → 回车复制）。架构采用「类型树中间态 + 每语言一个渲染器」：推断逻辑语言无关、一次实现，新增语言 = 新增一个渲染器函数 + 一组断言，为后续语言（Rust/Kotlin/C# 等）预留零成本扩展点。

## What Changes

- **新命令 `json-to-types`**（List 模式）：
  - 搜索栏粘贴/预填 JSON → 解析为**类型树**（语言无关中间态）→ 按当前目标语言渲染类型代码
  - **4 种目标语言行**（↑↓ 导航、回车切换，同 password-generator 预设范式）：TypeScript / Java / Go / Python
  - **类型行**：首行为**完整代码块**（全部类型合并，回车复制整块——首选动作）；其后每个类型一行（title=类型名、subtitle=字段数，回车复制该类型代码）
  - 空态 EmptyView；非法 JSON 错误行（复用 formatJson 的错误信息）
- **`src/lib/pure.ts` 新增**（类型树 + 渲染器，全部纯函数）：
  - `buildTypeTree(json: string): TypeNode | null`——JSON 解析 + 类型推断中间态（object/array/primitive/null/union 节点，嵌套对象内联为子节点）
  - `renderTypes(tree, lang): string`——渲染器注册表分发，四语言各一个渲染函数
  - 推断规则（完整规则表见 design，为唯一权威）：数字按值三档（int/long/double，树层面携带档位）、单字段 null → unknown（不猜测类型）、数组内同字段 null 混合 → `T | null`（有参照才推断）、混合数组 union、空数组 unknown、嵌套对象拆独立类型、根数组走类型别名形态、非法键名按目标语言清洗
- **四语言渲染契约**（spec 定死输出形态）：
  - TypeScript：`interface` + PascalCase 类型名（根 `Root`，嵌套按字段名派生）；`string | null`；`unknown[]`
  - Java：`public class` + 嵌套 static class、包装类型（`Integer`/`Long`/`Double`/`Boolean`/`String`）、字段 camelCase
  - Go：`type X struct`、字段名导出（首字母大写）+ ``json:"原字段名"`` tag
  - Python：`@dataclass` + 类型注解（`Optional[str]`、`List[int]`）、字段保持 snake 风格原名（非法标识符以下划线替换）
- **smoke 断言**：同一 JSON 样本四语言渲染的确定性输出断言 + 类型推断边界（null 合并/混合数组/空数组/深嵌套）断言
- **README / package.json**：注册命令、文档同步

明确不做：

- Rust / Kotlin / C# 等更多语言（v2 按真实使用触发；渲染器注册表架构使扩展=新增函数+断言）
- YAML / TOML 等其他输入格式（JSON 是 API 载体，其他格式等需求）
- 多样本合并推断（多个 JSON 合并出 optional 字段——单样本场景为主）
- JSON Schema 输入（方向相反：schema→代码 走工程化工具链）
- 运行时校验代码生成（zod/pydantic validator——可作 v2 方向）

## Capabilities

### New Capabilities

- `json-to-types`: JSON 转类型代码命令的交互契约——四语言切换、类型树推断规则、各语言渲染输出契约、行级复制

### Modified Capabilities

- `input-prefill`: 「detector 采纳规则」清单补充 json-to-types 条目（复用 json-format 同款规则：trim 后以 `{` 或 `[` 开头；新命令接入预填框架的既有路径，携带原全部场景）

## Impact

- 代码：`src/lib/pure.ts`（+类型树构建 + 4 渲染器，约 200 行）、新增 `src/json-to-types.tsx`（List，约 110 行）
- 构建/清单：`package.json` commands 追加 `json-to-types`
- 测试：`scripts/smoke.ts`（+27 断言，116 → 143：类型树结构 12 + 渲染 15（多检查点合并断言））
- 文档：`README.md`
- 无新增依赖；预填复用 input-prefill 框架（detectJson 语义不变：以 `{` 或 `[` 开头即采纳）
