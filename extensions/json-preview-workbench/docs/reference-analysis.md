# uTools JSON 编辑器参考分析

核验日期：2026-10-06。

## 离线包检查

- 文件：`7lpnpo28z0ttxzoeuvzwgcwwscnm1pxw.upxs`。
- 大小：1,080,080 字节。
- SHA-256：`1c26e60279df633bf1ffd63b5859700ab81150e3c89c3dffa253a19adf2323c8`。
- 字节熵：7.99985 bit/byte；开头 4 字节的小端整数为 156。
- 未识别为 ZIP / 明文 ASAR；内部偶发 GZIP 字节标记不能证明是 gzip 文件。
- uTools 官方 v5 更新说明明确将 UPXS 描述为加密且含开发者签名的安装包。
- 原始 UPXS 完成二进制结构检查，未直接解密。不能仅凭高熵确定加密算法、内部文件清单或源码实现。
- 原包保留在用户下载目录；本工程不提交、分发原插件代码或资源。

检查脚本：`python3 scripts/inspect-upxs.py <package.upxs>`。脚本不会执行插件代码。

## 公开可核验功能

参考页面展示版本 1.7.1，支持 URL Params / XML / YAML 输入自动转换为 JSON，JSON 转 XML、压缩、转义和 TypeScript，底部使用 JavaScript 过滤数据。

用户截图中可见双栏代码区域、行号、折叠和底部固定 `this` 标签；示例表达式为 `;Object.values(this).map(x=>x.map(y=>y.name))`。

## 安装后资源与真实界面比较

用户打开 uTools 插件后，通过 Computer Use 核对本机插件窗口，发现安装后的 ASAR 可直接读取。只读检查确认 `plugin.json` 的名称为 `jsoneditor`、版本为 1.7.1，共 13 个资源文件，包含 Monaco 编辑器主包与 JSON worker。检查没有修改插件或复制其源码到本工程。

本机资源体现的 `formatOnPaste` 和 `formatOnType` 均开启。Computer Use 实测无条件时只有输入编辑器，设置 `.胡杨河市.map(x => x.name)` 后出现右侧名称数组，清空条件立即恢复单面板。工具栏包括格式化、折叠/展开、去注释、压缩并复制、压缩转义并复制、XML 复制和 TypeScript 复制。

本工程对齐自动格式化、单/双面板切换、点号与方括号路径，以及默认格式化复制、专门压缩/转义复制。差异是使用 CodeMirror 和隔离的 QuickJS，另提供 YAML 输出、键排序及显式文件保存。有效 JSON5 输入通过格式化会移除注释，没有单独的“去注释”按钮。

安装后的 ASAR 资源可读不等同于直接解密原始 UPXS，也尚未证明两个文件逐字节对应。

本工程使用独立实现的 CodeMirror 编辑器、macOS WKWebView 窗口与 QuickJS 表达式运行时，仿照功能和布局。

## Raycast 架构边界

Raycast 公开 UI API 使用 List / Grid / Detail / Form 等原生组件，无法直接嵌入任意 HTML / CodeMirror。用户选择由 Raycast 启动独立双栏窗口。因此主命令启动 Swift + WKWebView 本地窗口，同时提供 Raycast 原生树形预览作为辅助入口。

## 来源

- [uTools JSON 编辑器](https://www.u-tools.cn/plugins/detail/JSON%20%E7%BC%96%E8%BE%91%E5%99%A8/)
- [uTools v5.0.0 更新说明](https://res.u-tools.cn/update_description/5.0.0/index.html)
- [uTools 离线安装包](https://www.u-tools.cn/docs/developer/basic/offline-plugin.html)
- [Raycast UI API](https://developers.raycast.com/api-reference/user-interface)
- [Raycast FAQ](https://developers.raycast.com/misc/faq)
- 用户提供的截图、离线包，以及本轮结构检查记录。
