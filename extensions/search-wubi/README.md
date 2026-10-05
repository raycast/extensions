# Search Wubi Raycast Extension

这是一个为 [search-wubi](https://github.com/hantang/search-wubi) 项目开发的 Raycast 扩展。

## 功能

- **即时查询**：在搜索列表即可直接预览汉字的五笔拆解图解。
- **详细信息**：显示五笔全码、字根拆解、简码/容错码、拼音、笔画、部首等。
- **图解显示**：横向排列显示汉字的字根拆解过程，并高亮当前字根。
- **快捷操作**：支持复制全码或在浏览器中打开原项目详情页。

## 开发信息

- **扩展开发者**：能蟹仔@androidcn
- **数据与算法引用**：感谢 [hantang/search-wubi](https://github.com/hantang/search-wubi) 提供的核心数据支持。

## 安装与运行

1. 确保已安装 Node.js 和 npm。
2. 进入扩展目录：
   ```bash
   cd search-wubi-raycast
   ```
3. 安装依赖：
   ```bash
   npm install
   ```
4. 启动开发模式：
   ```bash
   npm run dev
   ```
5. 在 Raycast 中即可搜索并使用 "Search Wubi" 命令。

## 数据来源

数据实时从 [hantang.github.io/search-wubi](https://hantang.github.io/search-wubi/) 获取。
