# 参考实现与第三方素材

- 浏览器读取与原生交互思路参考 `raycast/extensions` 的 `google-chrome` 扩展（MIT）。实现保留了数据适配层并重新处理了真实标签 ID、拼音匹配和 SQLite 快照。
- 拼音搜索使用 `text-search-engine@1.5.3`（MIT），依赖及其许可随 npm 安装获得。
- `assets/extension-icon.png` 来自用户的 Blazwitcher 项目，原项目采用 Apache-2.0，许可副本位于 `licenses/Blazwitcher-Apache-2.0.txt`。
- 标签 ID 导航设计亦参考当前目录的 `raycast-chrome-tab-id` 项目。

项目源代码采用 MIT；上述素材继续适用原许可。
