# JSON Tool

[English](./README.md)

JSON Tool 是一个集中式 Raycast JSON 工具台，用来快速格式化、压缩、修复、查询和处理剪贴板里的 JSON。

## 功能

- 支持 2、4、8 空格缩进格式化。
- 支持压缩为单行 JSON。
- 支持修复类 JSON 文本，例如注释、尾逗号、未加引号的 key、单引号字符串。
- 支持递归 key 排序。
- 支持 JSON 字符串转义和反转义。
- 支持 Unicode 编码和解码。
- 支持从当前 JSON 生成基础 JSON Schema。
- 支持 JSONPath 风格查询，例如 `nav_menu.home.href` 或 `items[0].name`。
- 支持直接读取 Raycast 剪贴板历史里的 JSON。
- 支持带行号预览。
- 优先读取选中文本，没有选中文本时读取当前剪贴板。

## 使用方式

在 Raycast 中打开 `JSON Tool`。

主界面只有一个共享编辑区。粘贴或输入 JSON，选择工具后执行，转换结果会直接更新到这个编辑区里。

常用快捷键：

- `⌘` `↵`：执行当前选择的工具
- `⌘` `F`：格式化 JSON
- `⌘` `M`：压缩 JSON
- `⌘` `J`：修复 JSON
- `⌘` `C`：复制当前内容
- `⌘` `L`：打开带行号预览
- `⌘` `R`：重新读取选中文本或剪贴板
- `⌘` `⇧` `V`：打开 JSON 剪贴板历史

## JSONPath 查询

从工具列表或 Action Panel 打开 `Path 查询`。

JSONPath 页面使用 Raycast 原生动态搜索列表：

- 在顶部搜索栏输入路径。
- 下方会立刻显示匹配路径。
- 选中路径后，右侧会显示查询结果和完整 JSON 参考。
- 按 `⌘` `↵` 可以把查询结果应用回主编辑器。

路径输入不需要 `$` 前缀。

## 剪贴板历史

在主界面使用 `JSON 剪贴板历史`，或按 `⌘` `⇧` `V`。

Raycast API 目前可以通过 offset 读取最近 6 条剪贴板历史，也就是 `0` 到 `5`。JSON Tool 会自动过滤，只展示可解析的 JSON。

## 开发

```bash
npm install
npm run dev
```

发布前验证：

```bash
npm run build
npm run lint
```

## 发布前注意

发布前需要把 `package.json` 里的 `author` 字段改成你的 Raycast Store 用户名。
