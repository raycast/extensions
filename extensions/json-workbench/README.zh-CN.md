# JSON Workbench for Raycast

由 Raycast 启动本地 macOS JSON 编辑窗口，仿照 uTools JSON 编辑器的工作流。无过滤条件时显示单面板；输入过滤条件后，左侧保留输入、右侧实时预览，底部通过 `this` 表达式处理数据。

## 使用

使用需要 macOS 13+ 与 Raycast。安装后搜索 **Open JSON Editor**。默认优先读取选中文本，再读取剪贴板；也可传入 JSON 文本或文件绝对路径。商店用户无需 Node.js、Xcode 或单独下载应用。

另一个命令 **Preview JSON** 提供 Raycast 内部的树形浏览、字段搜索、分页、复制当前节点与路径。

## 编辑窗口

- 双栏编辑与预览、行号、语法高亮、代码折叠、搜索、Undo/Redo、可拖动分隔线与系统明暗主题。
- 启动、文件打开、剪贴板载入和编辑器内粘贴自动格式化；清空过滤条件立即恢复单面板。
- JSON / JSON5 / YAML / XML / URL Params 输入自动识别；支持含 JSON 的转义字符串。
- 结果可选 JSON、YAML、XML、TypeScript、转义 JSON；提供压缩、递归键排序和 2 / 4 空格缩进。
- JSON 原始数字 token 在预览、格式化和 JSON 导出时保留，不将大整数 ID 隐式舍入。
- 本地剪贴板、文件打开和导出；更换有修改的输入与关闭窗口时提示。
- 默认“复制”输出格式化 JSON；“压缩复制”和“转义复制”直接复制对应内容，与 uTools 工具栏的用途一致。
- “折叠”与“展开”使用文字按钮；右上角“置顶”切换窗口是否始终处于普通窗口上方，并记住选择。
- 不持久化编辑内容、不使用远程 CDN、不访问网络；临时输入文件由窗口读取后删除。

表达式示例：

```js
Object.values(this).map(x => x.map(y => y.name))
;Object.values(this).map(x => x.map(y => y.name))
.filter(x => x.enabled)
[0][1]
this.users.map(user => ({ id: user.id, name: user.name }))
```

表达式需要返回同步、可序列化的 JSON 值。每次在独立 QuickJS WASM runtime 执行，限制 800 ms、64 MiB 内存与 1 MiB 栈，不暴露 Node、网络、文件系统或原生桥接 API。含超出 JavaScript Number 精度的数值时，保留预览并拒绝过滤；可将编号字段先改为字符串。

输入最大 8 MiB。CodeMirror 按可见区域渲染，Raycast 原生列表每页 150 项、文字预览上限 30,000 字符；复制完整 JSON 不截断。JSON5 数值遵循 JSON5 的 JavaScript Number 语义，精确数字输入应使用标准 JSON。

TypeScript 类型由当前样例推断，数组最多采样前 200 项，适合起草类型，不能替代完整 schema。XML 用 `root` 包裹输出，数字精度检查通过后才转换，输入禁用 DTD / 自定义实体。

## 许可与参考

MIT。工作流参考了 uTools JSON 编辑器，本工程独立实现，不包含原插件源码或资源。
