# Tasks

## 1. 纯逻辑与测试

- [x] 1.1 `src/lib/pure.ts` 新增 `parseHashInput(query: string): { text: string; key: string }`：首个 `||`（两个连续竖线）拆分文本与密钥，两侧不 trim；无 `||` 时 key 为空串。验证：`npm run typecheck` 通过
- [x] 1.2 `scripts/smoke.ts` 新增 5 断言：`parseHashInput("hello")` → `{text:"hello",key:""}`；`parseHashInput("hello || secret")` → `{text:"hello ",key:" secret"}`（两侧保留空格）；`parseHashInput("a || b || c")` → `{text:"a ",key:" b || c"}`（仅首个分隔）；`parseHashInput("|| key")` → `{text:"",key:" key"}`（空文本侧）；`parseHashInput("a | b")` → `{text:"a | b",key:""}`（单个 `|` 不分隔）。验证：`npm run smoke` 47 passed, 0 failed

## 2. hash 命令 List 化重写

- [x] 2.1 `src/hash.tsx` 重写为 List 根组件（参照 timestamp.tsx 结构，**不含其 getSelectedText 自动读取逻辑**）：`searchText` 受控 + `onSearchTextChange` + `filtering={false}`；placeholder「文本 || 密钥（HMAC 留空跳过）」；8 个 List.Item（title=哈希值/`—`、subtitle=算法名），HMAC 无密钥行 subtitle 提示「加 ` || 密钥` 启用」；EmptyView 条件按文本侧判断（`|| 密钥` 仅密钥态也显示 EmptyView）。验证：`npm run typecheck` 通过，`|| 密钥` 态不出现结果行
- [x] 2.2 行内 ActionPanel（同 timestamp）：`Action.CopyToClipboard`（回车复制该行值，含大写行）+ `Action.Paste`（粘贴到前台应用）。验证：Raycast 热加载后 ↑↓ 导航、回车复制、粘贴动作可用
- [x] 2.3 `List.EmptyView`：无输入时展示 `||` 语法说明（title + description + icon）。验证：打开命令空态即见语法提示

## 3. spec、文档与验证

- [x] 3.1 README Hash 小节更新：交互描述改 List 模式（↑↓ 选择回车复制、`||` 密钥语法），注明「输入为单行（搜索栏），多行大段文本暂不支持」。验证：人工核对与实现一致
- [x] 3.2 本地全套验证：`npm run lint` + `npm run typecheck` + `npm run smoke`（47 passed）+ `npm run build` 退出码均为 0。验证：逐条执行确认
- [x] 3.3 提交代码与 spec delta，经确认后归档 change：delta 转正替换 `openspec/specs/hash/spec.md` 对应 Requirement。验证：`openspec validate hash --strict` 通过
