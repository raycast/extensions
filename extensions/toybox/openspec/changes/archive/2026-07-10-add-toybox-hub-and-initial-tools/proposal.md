## 背景

开发者会积累大量小而重复的文本转换——从日志行中格式化 JSON、从 MyBatis 日志片段中抽取可执行 SQL——这些任务各自都不足以单独做一个扩展。ToyBox 把这些工具聚合在单一 Raycast 命令之后，既能让工具目录持续扩展而不污染用户的命令面板，也能让所有工具共用同一套"剪贴板优先 / 手动输入兜底"的体验。

## 变更内容

- 新增 `toybox` 命令：以可搜索列表展示 `src/tools.ts` 中已注册的每个工具；选中某项后通过 `launchCommand` 启动其子命令。
- 新增 `json` 命令：挂载时读取剪贴板，将合法 JSON 在 Raycast `Detail` 视图中以 2 空格缩进美化渲染，并提供一键复制操作；当剪贴板为空或内容非法时回退到手动输入 Form。
- 新增 `mybatis` 命令：读取剪贴板，解析 MyBatis `==> Preparing:` / `==> Parameters:` 行，把绑定值替换进 SQL 模板，在 `Detail` 视图中呈现可执行语句并提供复制操作；剪贴板自动识别失败时回退到手动输入 Form。
- 引入单一来源 `src/tools.ts` 作为工具目录，使新增工具只需改动一个文件。
- 引入 OpenSpec 脚手架（`openspec/config.yaml`、`openspec/specs/`、`openspec/changes/`），让后续能力以规格驱动。

## 能力清单

### 新增能力

- `toybox-hub`：中央入口命令，列出所有工具并启动对应的子命令。
- `json-viewer`：从剪贴板或手动输入中格式化 JSON。
- `mybatis-sql-formatter`：解析 MyBatis 日志片段并返回可执行 SQL。

### 修改能力

_（无——本次变更引入的是一个全新扩展。）_

## 影响

- 新增 Raycast 命令：`toybox`、`json`、`mybatis`。它们以独立条目出现在 Raycast 命令面板中，可被直接调用。
- 新增运行时文件：`src/toybox.tsx`、`src/json.tsx`、`src/mybatis.tsx`、`src/tools.ts`。
- 新增配置项：每个命令被加入 `package.json` 的 `commands` 数组。
- `raycast-env.d.ts` 更新以声明新的 `Preferences.Mybatis` / `Arguments.Mybatis` 命名空间。
- 不新增运行时依赖；只使用现有的 `@raycast/api` 与 `@raycast/utils`。
- 仓库中初始化 OpenSpec 以驱动后续变更；现有的 skills（`openspec-propose`、`openspec-apply-change` 等）由 `openspec init --tools codex,claude` 自动生成且被 `.gitignore` 排除。
