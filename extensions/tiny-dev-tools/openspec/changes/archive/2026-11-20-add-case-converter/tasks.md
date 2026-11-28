# Tasks

## 1. 纯逻辑与测试

- [x] 1.1 `src/lib/pure.ts` 新增 `splitWords(input)`：阶段一按 `_` `-` `.` 切（连续分隔符空段丢弃，数字贴前词）；阶段二 `/([a-z0-9])([A-Z])/` 大小写边界切；词元统一小写。验证：`npm run typecheck` 通过
- [x] 1.2 `src/lib/pure.ts` 新增 `convertCase(input)`：一次拆词返回 `{ camel, pascal, snake, kebab, constant, dot }` 六元组（拼装规则见 design 决策 2）；新增 `detectCaseLike`（`/^[A-Za-z][A-Za-z0-9_.-]*$/` 含字母 + input-prefill 共同前置）。验证：`npm run typecheck` 通过
- [x] 1.3 `scripts/smoke.ts` 新增 12 断言：转换全表 6 例（snake/camel/kebab/Pascal/dot.case/单词输入——各断言六格式完整输出值）；拆词边界 7 例（实测锚点，语义基准 change-case v4：`XMLHttpRequest`→xml_http_request、`HTMLElement`→html_element、`parseJSONData`→parse_json_data、`userID`→user_id、`base64Encode`→base64_encode、`apiKeyV2`→api_key_v2、`user__name`→user_name；另记录已知边角 `OAuthToken`→o_auth_token 两库一致跟随）；detector 4 例（`user_created_at` 采纳、`hello world` 拒绝、`_foo` 拒绝、`count` 采纳）。验证：`npm run smoke` 116 passed, 0 failed

## 2. 命令组件

- [x] 2.1 新建 `src/case-converter.tsx`（List 模式，hash 同构）：`usePrefill(detectCaseLike)` + setState 注入（List 型，同 hash 模式）；搜索栏输入 → 六行 List.Item（title=转换结果、subtitle=格式名，顺序 camel/pascal/snake/kebab/constant/dot）；空态 EmptyView。验证：`npm run typecheck` 通过
- [x] 2.2 行级动作：回车复制（Action.CopyToClipboard）+ 粘贴到前台应用（Keyboard.Shortcut.Common.Edit，项目惯例）。验证：Raycast 热加载后输入即算、↑↓ 回车复制、复制字段名打开命令预填出全表
- [x] 2.3 `package.json` commands 追加：`{ "title": "Case Converter", "name": "case-converter", "description": "命名格式转换：camelCase / snake_case / kebab-case / PascalCase / CONSTANT_CASE / dot.case 全并排", "mode": "view" }`。验证：`npm run lint` 无新 error

## 3. spec、文档与验证

- [x] 3.1 校验 spec delta 与实现一致：`case-converter` spec（ADDED：全格式并排、行级复制、拆词与转换边界、预填采纳引用式）；input-prefill spec MODIFIED（清单补 case-converter 条目 + 剪贴板措辞澄清）。验证：`openspec validate add-case-converter --strict` 通过
- [x] 3.2 README 更新：功能清单加「Case Converter（命名格式转换）」小节；架构图补 `case-converter.tsx`；断言数 98 → 116。验证：grep 确认无过期断言数字
- [x] 3.3 本地全套验证：`npm run lint` + `npm run typecheck` + `npm run smoke`（116 passed）+ `npm run build` 退出码均为 0；手工回归：输入/复制预填/回车复制/空态。验证：逐条执行确认
- [x] 3.4 提交代码与 spec delta；用户验收后 `openspec archive` 归档（Purpose 补写），`openspec validate --all --strict` 通过后推送。验证：git 干净、8 spec 全绿
