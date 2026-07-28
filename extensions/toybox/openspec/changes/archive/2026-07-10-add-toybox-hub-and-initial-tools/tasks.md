## 1. 项目脚手架

- [x] 1.1 在 `package.json` 中添加 `json`、`mybatis` 命令（并更新 `toybox` 的 description）
- [x] 1.2 更新 `raycast-env.d.ts` 以声明新的 `Preferences.Mybatis` / `Arguments.Mybatis` 命名空间
- [x] 1.3 初始化 git 并以有意义的初始 commit message 提交项目状态

## 2. 工具注册表

- [x] 2.1 创建 `src/tools.ts`，定义 `Tool` 类型以及包含 `json` 与 `mybatis` 的静态 `tools` 数组
- [x] 2.2 为每个工具挑选差异化的 Raycast `Icon` 与 `keywords`，使中央入口的搜索响应迅速

## 3. ToyBox 中央入口

- [x] 3.1 将 `src/toybox.tsx` 实现为由 `tools` 注册表驱动的 Raycast `List`
- [x] 3.2 把每个 `List.Item` 接到 `launchCommand({ name, type: LaunchType.UserInitiated })`
- [x] 3.3 验证 TypeScript / ESLint / Prettier 仍然通过

## 4. JSON 查看器

- [x] 4.1 通过 `Clipboard.readText()` 在 `src/json.tsx` 中实现剪贴板自动识别
- [x] 4.2 实现美化逻辑（`JSON.stringify(value, null, 2)`）与结果 `Detail` 视图
- [x] 4.3 当剪贴板为空或内容非法时，提供手动输入 `Form` 兜底
- [x] 4.4 添加复制操作（美化后的 JSON + 原始输入）与元数据侧栏
- [x] 4.5 验证 TypeScript / ESLint / Prettier 仍然通过

## 5. MyBatis SQL 格式化器

- [x] 5.1 通过 `Clipboard.readText()` 在 `src/mybatis.tsx` 中实现剪贴板自动识别
- [x] 5.2 实现 MyBatis 日志解析器（`findLine`、`splitParameters`、`parseParameter`、`substitutePlaceholders`）
- [x] 5.3 实现参数值格式化（数值 / 布尔 / null / 字符串转义规则）
- [x] 5.4 实现结果 `Detail` 视图，附带复制操作（格式化 SQL、原始日志、INSERT 模板）
- [x] 5.5 当剪贴板缺少 `Preparing:` 行时，提供手动输入 `Form` 兜底
- [x] 5.6 验证 TypeScript / ESLint / Prettier 仍然通过
- [x] 5.7 对解析器进行 10 个代表性输入的冒烟测试（数值、字符串、布尔、null、无参数、值内含逗号、多行、BigDecimal、Date、`<== Total:` 行、缺少 Preparing）

## 6. OpenSpec 脚手架

- [x] 6.1 运行 `openspec init --tools codex,claude` 并把 `.codex/` / `.claude/` 加入 `.gitignore`
- [x] 6.2 创建变更提案 `add-toybox-hub-and-initial-tools`，编写 proposal / design / tasks 与每个能力的 delta spec
- [x] 6.3 归档该变更，把 delta spec 合并进 `openspec/specs/`
- [x] 6.4 运行 `openspec validate` 并重新跑项目的 TypeScript / ESLint / Prettier 校验
- [x] 6.5 把 OpenSpec 产物提交到 initial commit 之上
