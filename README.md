# Raycast 双语排版纠正插件

自动纠正中英混合排版的文字（包含 Markdown 代码支持），基于中文文案排版指北规范。

## 功能特性

- ✅ 自动添加中英文之间的空格
- ✅ 全角/半角字符转换
- ✅ 标点符号规范化
- ✅ 引号自动配对和转换
- ✅ Markdown 代码保护（代码块、行内代码、URL）
- ✅ 支持直接格式化剪贴板
- ✅ 支持格式化后自动粘贴

## 安装

### 开发模式

```bash
# 克隆项目
git clone <repository-url>
cd raycast-bilingual-formatter

# 安装依赖
npm install

# 开发模式
npm run dev
```

### 生产模式

```bash
# 构建
npm run build

# 使用 Raycast 导入扩展
```

## 使用方法

### 1. Format Clipboard（格式化剪贴板）

复制文本后，在 Raycast 中执行：
```
Format Clipboard
```

剪贴板内容会被自动格式化并复制回剪贴板。

### 2. Format and Paste（格式化并粘贴）

复制文本后，在 Raycast 中执行：
```
Format and Paste
```

剪贴板内容会被自动格式化并粘贴到当前应用。

### 3. Format Text（格式化文本）

在 Raycast 中执行：
```
Format Text
```

输入要格式化的文本，点击"格式化并复制"按钮。

## 示例

### 输入文本

```
在LeanCloud上，数据存储是围绕AVObject进行的。每个AVObject都包含了与JSON兼容的key-value对应的数据。
```

### 输出文本

```
在 LeanCloud 上，数据存储是围绕 AVObject 进行的。每个 AVObject 都包含了与 JSON 兼容的 key-value 对应的数据。
```

## 支持的规则

### 空格处理
- 中文字符与英文字母/数字之间添加空格
- 希腊字母与中英文之间添加空格
- 全角标点与其他字符之间不加空格

### 全角/半角转换
- 全角数字、字母、标点转为半角
- 中文内容后使用全角中文标点
- 去除中文标点重复

### 标点符号规范
- 根据上下文转换中英文标点
- 括号匹配和转换
- 省略号处理
- 句号统一为全角空心句号（。）

### 引号处理
- 使用直角引号「」
- 引号自动配对
- 引号周围空格处理

### Markdown 保护
- 代码块保护（```...```）
- 行内代码保护（`...`）
- URL 保护
- 文件路径保护

## 技术栈

- **语言**: TypeScript 5.4.5
- **框架**: React 18.3.3
- **API**: Raycast Extension API 1.76.1
- **包管理**: npm

## 项目结构

```
src/
├── format-clipboard.ts    # Raycast 命令：格式化剪贴板
├── format-and-paste.ts    # Raycast 命令：格式化并粘贴
├── format-text.tsx        # Raycast 命令：格式化文本（UI）
├── services/              # 核心服务
│   ├── formatter-service.ts
│   ├── markdown-protector.ts
│   └── error-handler.ts
├── correctors/            # 纠正器
│   ├── base-corrector.ts
│   ├── space-corrector.ts
│   ├── character-corrector.ts
│   ├── punctuation-corrector.ts
│   └── quote-corrector.ts
└── utils/                 # 工具函数
    ├── constants.ts
    ├── character-types.ts
    ├── regex-patterns.ts
    └── logger.ts
```

## 开发

### 命令

```bash
# 开发模式
npm run dev

# 构建
npm run build

# Lint 检查
npm run lint

# 自动修复
npm run fix

# 运行测试
npm test
```

### 环境要求

- Node.js 22.14+
- npm 7+
- Raycast 1.26.0+

## 参考资料

- [中文文案排版指北](https://github.com/sparanoid/chinese-copywriting-guidelines)
- [typeset 项目](https://github.com/woct0rdho/typeset)
- [copywriting-correct](https://github.com/ricoa/copywriting-correct)
- [Raycast API 文档](https://developers.raycast.com)

## 许可证

MIT

## 作者

开发团队

---

**状态**: 已发布 (v1.0.0)
**版本**: 1.0.0
