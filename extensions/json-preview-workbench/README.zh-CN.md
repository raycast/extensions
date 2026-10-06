# JSON Preview for Raycast

由 Raycast 启动本地 macOS JSON 编辑窗口，仿照 uTools JSON 编辑器的工作流。无过滤条件时显示单面板；输入过滤条件后，左侧保留输入、右侧实时预览，底部通过 `this` 表达式处理数据。

## 使用

使用需要 macOS 13+ 与 Raycast。商店分发包含预构建程序，不需要 Node.js 或 Xcode；从源码开发需要 Node.js 22+，重新编译原生窗口需要 Xcode Command Line Tools。

```sh
npm ci
npm run build:editor
npm run dev
```

在 Raycast 搜索 **Open JSON Editor**。默认优先读取选中文本，再读取剪贴板；也可传入 JSON 文本或文件绝对路径。Raycast 的 Import Extension 命令也可以导入本工程目录。停止开发进程后，扩展仍保留在 Raycast 中。

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

## 开发与验证

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

`npm run lint` 检查商店元数据与 Raycast 源码；`npm run lint:source` 检查全部源码。商店作者账号为 `tang_xiangrun`。

本地窗口源码在 `native/JSONEditor.swift`，网页 UI 在 `editor/`，共用解析和转换逻辑在 `src/lib/`。生成的原生程序与静态编辑器放在 `assets/`，由 Raycast 打包携带。原生窗口包含 Apple Silicon 与 Intel 双架构；重新编译使用 `npm run build:editor`，构建来源及校验值见 `docs/native-build.json`。

## 参考包

用户提供的 `.upxs` 完成结构检查，未直接解密；它是 uTools 的加密签名安装包。用户打开插件后，已核对安装后的 ASAR 清单与 1.7.1 版本配置，并通过 Computer Use 实测界面行为。本工程独立实现功能与布局，不包含原插件源码或资源。详见 [参考分析](docs/reference-analysis.md)。

```sh
npm run inspect:upxs -- /path/to/plugin.upxs
```

参考：[uTools JSON 编辑器](https://www.u-tools.cn/plugins/detail/JSON%20%E7%BC%96%E8%BE%91%E5%99%A8/)、[Raycast UI API](https://developers.raycast.com/api-reference/user-interface)。
