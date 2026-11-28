# Tasks

## 1. 发布合规修复（消除 ray lint error）

- [x] 1.1 修改 `scripts/gen-icon.mjs`：所有硬编码几何常量按 512/340 因子等比取整（S=512、r=96、stroke=30、ox=127、oy=136、">"步进 90、">"纵向跨度 211、下划线 x 偏移 15、y 偏移 256、宽 166），运行脚本重新生成 `assets/icon.png`。验证：`npm run lint` 不再报 "Wrong image size"，图标目视无失衡
- [x] 1.2 `package.json` 增加 `"dependencies": {}`。验证：`npm run lint` 不再报 "must have required property 'dependencies'"；若仍报错，按 design.md 决策 4 回退为将 `@raycast/api` 移入 dependencies 并重新 `npm install`（实际执行：空对象被 schema 要求 `@raycast/api`，已按回退方案移动并重装）

## 2. UI 交互对齐（base64 清空 + 结果区只读）

- [x] 2.1 `src/base64.tsx` 增加「清空」Action（⌃K，对齐 url-codec：清空输入与结果、模式不变）。验证：`npm run typecheck` 通过，Raycast 热加载后动作可用
- [x] 2.2 `src/url-codec.tsx` 结果区 `onChange={setResult}` 改为空实现（只读，对齐 json-format 模式）。验证：`npm run typecheck` 通过，结果区无法键入内容，切换模式/输入仍正常重算
- [x] 2.3 `src/base64.tsx` 结果区同样改为只读。验证：同上；「结果转 URL-safe」动作仍可更新结果（程序写入不受只读影响）

## 3. 冒烟断言诚实化

- [x] 3.1 `scripts/smoke.ts` 将恒真断言替换为 `assert(b64Decode("-_8") === "\uFFFD\uFFFD", "b64: URL-safe 字符容忍（非法 UTF-8 输出替换字符）")`。验证：`npm run smoke` 通过且断言计数与实际一致（35 passed）

## 4. CI 与仓库卫生

- [x] 4.1 `.github/workflows/ci.yml` 在 Type check 之前增加 "Lint" 步骤（`npm run lint`）。验证：YAML 语法正确（`python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/ci.yml'))"` 或等价方式）
- [x] 4.2 `.gitignore` 增加 `.pi/`。验证：`git status --short` 不再显示 `.pi/`
- [x] 4.3 README 更新：架构图补 `src/lib/radio.tsx`；架构树 CI 注释改为 "CI：lint + typecheck + smoke + build"；Base64 功能清单补「清空（⌃K）」；「验证」章节补 `npm run lint`；断言数描述与 smoke 实际一致。验证：人工核对 README 与代码一致
- [x] 4.4 将 `openspec/` 纳入版本控制：`openspec/config.yaml`、`openspec/specs/.gitkeep`、`openspec/changes/archive/.gitkeep` 及本 change 目录 `openspec/changes/fix-lint-and-ux-polish/`。验证：上述路径不再出现在 `git status` 未跟踪列表中

## 5. 整体验证

- [x] 5.1 本地跑全套验证：`npm run lint`（仅剩 ESLint/Prettier 未安装的 warn，无 error）+ `npm run typecheck` + `npm run smoke` + `npm run build` 全部通过。验证：四条命令退出码均为 0
