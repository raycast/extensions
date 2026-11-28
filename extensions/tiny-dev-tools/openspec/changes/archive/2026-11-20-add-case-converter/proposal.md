# Proposal

## Why

命名风格转换是前端/接口联调高频刚需（JS camelCase ⇄ Python/SQL snake_case ⇄ CSS kebab-case ⇄ 常量 CONSTANT_CASE ⇄ 配置 dot.case），Store 竞品 Change Case 55K 装机验证了需求。此前推迟的本因——「复制→打开→手动粘贴」路径比编辑器插件更繁琐——已由 input-prefill 基建消除：现在「复制字段名→打开命令→全格式并排→回车复制」一步不落。命令形态复刻 hash（List + 多行结果 + 回车复制），实现全部为确定性纯函数，是全项目最好测试的命令。

## What Changes

- **新命令 `case-converter`**（List 模式）：
  - 搜索栏输入任意一种 case 格式 → 一屏并排显示全部 6 种格式（每行：title=转换结果、subtitle=格式名）
  - ↑↓ 移动、回车复制该行结果（含粘贴到前台应用动作，项目惯例）
  - 无源格式选择：内部统一「拆词 → 按格式拼装」，任意输入到任意格式互转
  - 6 种格式：camelCase / PascalCase / snake_case / kebab-case / CONSTANT_CASE / dot.case
- **`src/lib/pure.ts` 新增纯函数**：
  - `splitWords(input: string): string[]`——语义对齐 change-case v4（Store 同源库，实测参考）：按 `_`/`-`/`.` 切分（空段丢弃）、段内连续大写段归前词（`XMLHttp` → `XML|Http`）、数字与字母连续不切（`v2User` → `v2|user`）
  - `convertCase(input: string): { camel; pascal; snake; kebab; constant; dot }`——一次拆词六种拼装
  - `detectCaseLike`（detector）：匹配六种格式之一的形态（`/^[A-Za-z][A-Za-z0-9_.-]*$/` 且含至少一个字母），预填用
- **预填接入**：复用 input-prefill 框架（usePrefill + setState 注入，List 型同 hash 模式）；detector 采纳任意合法 case 形态（含单词如 `count`），拒绝含空格/中文等非 case 文本
- **smoke 断言**：确定性输入输出全表断言（snake/camel/kebab/Pascal 输入各一、单词输入、连续大写简化的已知行为、detector 采纳/拒绝分支）
- **README / package.json**：注册命令、功能清单、架构图同步

明确不做：

- Title Case / Sentence case 等自然语言格式（拆词规则不同，等真实需求）
- 缩写词智能识别（v1 不做缩写词表；`XMLHttpRequest` 按主流规则拆为 `XML|Http|Request`（与 change-case v4 / lodash 一致），camel 输出 `xmlHttpRequest`）
- 中文/Unicode 标识符（case 转换是 ASCII 标识符域的问题）
- 批量多行转换（单标识符场景为主，多行等需求）

## Capabilities

### New Capabilities

- `case-converter`: 命名格式转换命令的交互契约——任意格式输入全格式并排展示、行级复制、预填采纳规则

### Modified Capabilities

- `input-prefill`: 「detector 采纳规则」Requirement 为封闭枚举清单，本 change 补充 case-converter 条目（携带原全部场景 + 新增 case 场景）——这是新命令接入预填框架的既有路径

## Impact

- 代码：`src/lib/pure.ts`（+3 纯函数，约 40 行）、新增 `src/case-converter.tsx`（List 模式，约 70 行，hash 同构）
- 构建/清单：`package.json` commands 追加 `case-converter`
- 测试：`scripts/smoke.ts`（+18 断言，98 → 116：转换全表 6 例（含 dot.case 输入）+ 拆词边界 8 例（7 实测锚点 + OAuthToken 边角，语义基准 change-case v4，与 lodash 在大写边界交叉一致）+ detector 4 例）
- 文档：`README.md`
- spec：新 capability + input-prefill spec 的 detector 清单补充（MODIFIED 一个 Requirement）
- 无新增依赖；预填遵循 input-prefill 既有契约（选中优先剪贴板回退、setState 注入、edited 锁存）
