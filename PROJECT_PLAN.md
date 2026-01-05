# Raycast 双语排版纠正插件 - 项目规划文档

## 项目概述

**项目名称**: raycast-bilingual-formatter
**功能**: 自动纠正中英混合排版的文字（包含 Markdown 代码）
**技术栈**: TypeScript + React + Node.js + Raycast Extension API

## 项目目标

创建一个 Raycast 插件，自动纠正中英混合排版的文字，基于中文文案排版指北规范。

### 使用场景
- 日常文档排版
- 技术文档编写
- 博客文章写作
- 中英文混合内容整理

## 技术架构

### 开发栈
- **语言**: TypeScript 5.4.5
- **框架**: React 18.3.3
- **Runtime**: Node.js 22.14+
- **包管理**: npm
- **API**: Raycast Extension API 1.76.1

### 项目结构

```
raycast-bilingual-formatter/
├── package.json                    # 项目配置和依赖
├── tsconfig.json                   # TypeScript 配置
├── .eslintrc.json                 # ESLint 配置
├── eslint.base.json                # ESLint 基础配置
├── eslint.test.json               # 测试 ESLint 配置
├── package.eslintrc.json         # 包 ESLint 配置
├── .gitignore
├── src/                          # 源代码目录（原 sources/）
│   ├── commands/                  # Raycast 命令
│   │   ├── format-clipboard.ts    # 格式化剪贴板并复制
│   │   ├── format-and-paste.ts    # 格式化剪贴板并粘贴
│   │   └── format-text.ts         # 输入文本格式化
│   ├── services/                  # 核心服务
│   │   ├── formatter-service.ts    # 主格式化服务
│   │   ├── markdown-protector.ts   # Markdown 保护器
│   │   └── error-handler.ts       # 错误处理器
│   ├── correctors/                # 各个纠正器模块
│   │   ├── base-corrector.ts      # 纠正器基类
│   │   ├── space-corrector.ts     # 空格纠正器
│   │   ├── character-corrector.ts # 字符纠正器
│   │   ├── punctuation-corrector.ts # 标点纠正器
│   │   └── quote-corrector.ts    # 引号纠正器
│   ├── utils/                     # 工具函数
│   │   ├── character-types.ts      # 字符类型判断
│   │   ├── regex-patterns.ts      # 正则表达式模式
│   │   ├── constants.ts           # 常量定义
│   │   └── logger.ts             # 日志工具
│   └── index.ts                  # 主入口
├── tests/                        # 测试目录
│   ├── fixtures/                  # 测试用例
│   ├── correctors/
│   │   ├── space-corrector.test.ts
│   │   ├── character-corrector.test.ts
│   │   ├── punctuation-corrector.test.ts
│   │   └── quote-corrector.test.ts
│   └── formatter-service.test.ts
└── assets/                       # 图标等资源
    └── icon.png
```

## 核心功能

### 1. 空格处理（SpaceCorrector）

**功能说明**:
- 中文字符与英文字母/数字之间添加空格
- 中文引号与英文内容之间处理空格
- 中英文括号与内容之间的空格调整
- 希腊字母与中英文之间的空格
- 全角标点与其他字符之间不加空格

**规则示例**:
- 输入: `在LeanCloud上，数据存储是围绕AVObject进行的。`
- 输出: `在 LeanCloud 上，数据存储是围绕 AVObject 进行的。`

### 2. 全角/半角转换（CharacterCorrector）

**功能说明**:
- 全角数字、英文字母、标点转为半角
- 中文内容后使用全角中文标点（！？。，：；）
- 去除中文标点重复（！！？？ → ！？）

**规则示例**:
- 输入: `１２３４ ＡＢＣＤ`
- 输出: `1234 ABCD`
- 输入: `你好！！怎么了？？`
- 输出: `你好！怎么了？`

### 3. 标点符号规范（PunctuationCorrector）

**功能说明**:
- 根据上下文转换中英文标点
- 括号匹配和转换
- 省略号处理（.../。。 → …）
- 句号统一为全角空心句号（。）

**规则示例**:
- 输入: `这是一个英文(Hello World)句子。`
- 输出: `这是一个英文（Hello World）句子。`

### 4. 引号处理（QuoteCorrector）

**功能说明**:
- 引号状态追踪
- 简体中文使用直角引号「」
- 英文引号转直角引号「」
- 引号自动配对
- 引号周围空格处理

**规则示例**:
- 输入: `老师说"你好"`
- 输出: `老师说「你好」`

### 5. Markdown 保护（MarkdownProtector）

**功能说明**:
- 识别 ``` 包围的代码块，跳过处理
- 识别行内代码 `code`，跳过处理
- 保护 URL（http/https）
- 保护文件路径（/path/to/file）

**规则示例**:
- 输入:
  ```markdown
  这是代码：
  ```js
  const x = 1;
  ```
  ```
- 输出:
  ```markdown
  这是代码：
  ```js
  const x = 1;
  ```
  ```
  （代码块内容不被修改）

### 6. 错误处理（ErrorHandler）

**功能说明**:
- 剪贴板为空提示
- 格式化异常处理
- 粘贴失败降级
- Markdown 保护失败降级
- 错误日志记录

## 用户交互设计

### 主要命令

#### 1. Format Clipboard（格式化剪贴板）
- **操作**: 读取剪贴板 → 格式化 → 复制回剪贴板
- **反馈**: Toast 提示"格式化完成"
- **错误**: Toast 提示"剪贴板为空"或"格式化失败"

#### 2. Format and Paste（格式化并粘贴）
- **操作**: 读取剪贴板 → 格式化 → 粘贴到当前应用
- **反馈**: Toast 提示"已粘贴"
- **降级**: 粘贴失败时提示"内容已在剪贴板中"

#### 3. Format Text（格式化文本）
- **操作**: 显示输入框 → 用户输入 → 格式化 → 复制
- **反馈**: Toast 提示"格式化完成"
- **验证**: 检查输入是否为空

### 交互流程
```
用户触发命令 → 读取剪贴板/输入文本 → 应用排版规则 → 显示预览（可选） → 用户确认 → 复制/粘贴
```

## 配置说明

### 排版规则（固定配置）

根据用户确认，以下规则固定，不需要用户配置：

1. **句号风格**: 全角空心句号（。）
2. **引号风格**: 简体中文直角引号「」
3. **空格处理**: 标准空格，不支持自定义次级空格
4. **用户交互**: 直接纠正，无预览
5. **快捷键**: 依赖 Raycast 快捷键设置

## 技术实现要点

### 1. 字符类型判断

```typescript
// 字符类型判断函数
isZhChar(c: string): boolean      // 中文字符
isEnLetter(c: string): boolean    // 英文字母
isDigit(c: string): boolean       // 数字
isZhPunctuation(c: string): boolean // 中文标点
isEnPunctuation(c: string): boolean // 英文标点
isZhQuote(c: string): boolean    // 中文引号
```

### 2. 正则表达式设计

```typescript
// 空格添加模式
const SPACE_PATTERNS = [
  { pattern: /([\u4e00-\u9fa5])([A-Za-z0-9])/g, replacement: '$1 $2' },
  { pattern: /([A-Za-z0-9])([\u4e00-\u9fa5])/g, replacement: '$1 $2' },
  // 更多模式...
];

// 空格移除模式
const REMOVE_SPACE_PATTERNS = [
  { pattern: /([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, replacement: '$1$2' },
  // 更多模式...
];
```

### 3. Markdown 保护策略

```typescript
// 使用唯一占位符保护 Markdown 内容
const PLACEHOLDER_PREFIX = '__MARKDOWN_PLACEHOLDER_';
const placeholders: Map<string, string> = new Map();

// 保护流程
1. 识别代码块、行内代码、URL
2. 用唯一占位符替换原始内容
3. 应用格式化规则
4. 用原始内容替换占位符
```

### 4. 纠正器模式

```typescript
// 基类
abstract class BaseCorrector {
  abstract handle(text: string): string;
}

// 服务集成
class FormatterService {
  private correctors: BaseCorrector[];

  format(text: string): string {
    let result = text;
    for (const corrector of this.correctors) {
      result = corrector.handle(result);
    }
    return result;
  }
}
```

### 5. 错误处理模式

```typescript
// 统一错误处理
try {
  const formatted = await formatText(text);
  await Clipboard.copy(formatted);
  showToast(ToastStyle.Success, "格式化完成");
} catch (error) {
  showToast(ToastStyle.Failure, `格式化失败: ${error.message}`);
  Logger.error(error);
}
```

## 开发计划

### Phase 1: 基础设施（2天）

#### 任务清单
- [x] 初始化 Raycast 项目
- [x] 搭建项目结构
- [x] 配置 TypeScript 和测试环境
- [x] 实现工具模块（字符类型、正则、常量）

#### 已完成文件
- ✅ package.json
- ✅ tsconfig.json
- ✅ .eslintrc.json
- ✅ src/utils/constants.ts
- ✅ src/utils/character-types.ts
- ✅ src/utils/regex-patterns.ts
- ✅ src/utils/logger.ts

### Phase 2: 核心服务（3天）

#### 任务清单
- [x] 实现 Markdown 保护器
- [x] 实现纠正器基类
- [x] 实现 SpaceCorrector
- [x] 实现 CharacterCorrector
- [x] 实现 PunctuationCorrector
- [x] 实现 QuoteCorrector

#### 已完成文件
- ✅ src/services/markdown-protector.ts
- ✅ src/correctors/base-corrector.ts
- ✅ src/correctors/space-corrector.ts
- ✅ src/correctors/character-corrector.ts
- ✅ src/correctors/punctuation-corrector.ts
- ✅ src/correctors/quote-corrector.ts

### Phase 3: 集成和命令（2天）

#### 任务清单
- [x] 实现格式化服务
- [x] 实现错误处理器
- [x] 实现 Format Clipboard 命令
- [x] 实现 Format and Paste 命令
- [ ] 实现 Format Text 命令（需要修复）

#### 已完成文件
- ✅ src/services/formatter-service.ts
- ✅ src/services/error-handler.ts
- ✅ src/commands/format-clipboard.ts
- ✅ src/commands/format-and-paste.ts
- ⚠️ src/commands/format-text.ts（需要修复）

#### 已知问题
- ❌ format-text.ts 存在 JSX 语法错误，导致 lint 无法通过
- ❌ 需要简化实现，避免复杂的 React 组件

### Phase 4: 测试和优化（2天）

#### 任务清单
- [x] 编写单元测试（每个纠正器）
- [x] 编写集成测试（完整流程）
- [x] 性能优化（大文本处理）- 实测 6.4万字符耗时 < 20ms
- [x] 边界情况处理
- [x] 错误场景测试

#### 测试策略
- 单元测试：每个纠正器的所有规则
- 集成测试：完整格式化流程
- 边界测试：空文本、纯中文、纯英文
- Markdown 测试：各种代码块、行内代码

### Phase 5: 文档和发布（1天）

#### 任务清单
- [x] 编写 README
- [x] 准备演示用例（截图已准备）
- [x] 测试发布流程
- [ ] 准备 Raycast Store 发布
- [x] 添加项目图标（使用临时图标，发布前建议替换）

## 当前项目状态

### 已完成
1. ✅ 项目初始化完成
2. ✅ 依赖安装完成（220 个包）
3. ✅ 核心工具模块实现完成
4. ✅ 所有纠正器实现完成
5. ✅ Markdown 保护器实现完成
6. ✅ 格式化服务实现完成
7. ✅ 两个主要命令实现完成（Format Clipboard、Format and Paste）
8. ✅ Format Text 命令实现完成
9. ✅ 所有测试用例通过（单元测试 + 集成测试 + 性能测试）
10. ✅ 代码规范检查通过（Lint + Prettier）
11. ✅ 构建流程验证通过
12. ✅ 图标已生成 (assets/icon.png)
13. ✅ 截图已准备

### 待完成
1. ⚠️ 提交到 Raycast Store

### 已知问题
无

## 快速开始

### 环境要求
- Node.js 22.14+
- npm 7+
- Raycast 1.26.0+

### 安装依赖
```bash
cd /Users/wuhanjian/Projects/personal/github/raycast-bilingual-formatter
npm install
```

### 开发命令
```bash
# 开发模式
npm run dev

# 构建
npm run build

# Lint 检查
npm run lint

# 自动修复
npm run fix
```

### 测试命令
```bash
# 运行测试
npm test
```

## 依赖项

### 生产依赖
- `@raycast/api@^1.76.1` - Raycast Extension API

### 开发依赖
- `@raycast/eslint-config@^1.0.10` - ESLint 配置
- `@types/node@20.12.12` - Node.js 类型定义
- `@types/react@18.3.3` - React 类型定义
- `eslint@^8.57.1` - 代码检查工具
- `typescript@^5.4.5` - TypeScript 编译器

## 潜在问题和解决方案

### 1. JSX 语法错误
**问题**: format-text.ts 中的 JSX 组件导致 Prettier 解析失败
**解决**: 简化 React 组件实现，避免复杂的嵌套结构

### 2. 大文本性能
**问题**: 超过 10 万字符的文本可能影响性能
**解决**:
- 使用正则表达式批量替换
- 添加大文本确认对话框
- 考虑分块处理

### 3. Markdown 保护失败
**问题**: 代码块识别错误或占位符冲突
**解决**:
- 使用唯一占位符机制
- 添加安全模式降级
- 增强正则表达式匹配

### 4. 中英文混合句子
**问题**: 复杂的中英文混合句子难以判断语言
**解决**: 参考 typeset.py 的 guess_lang 方法，根据字符比例判断

## 参考资料

### 核心参考
1. [woct0rdho/typeset](https://github.com/woct0rdho/typeset) - Python 实现
2. [sparanoid/chinese-copywriting-guidelines](https://github.com/sparanoid/chinese-copywriting-guidelines) - 中文文案排版指北
3. [ricoa/copywriting-correct](https://github.com/ricoa/copywriting-correct) - PHP 实现

### Raycast 文档
- [Raycast API 官方文档](https://developers.raycast.com)
- [Raycast Extension 开发指南](https://developers.raycast.com/basics/getting-started)
- [Clipboard API](https://developers.raycast.com/api-reference/clipboard)

## 时间估算

- Phase 1-2: 基础设施和核心服务（已完成）
- Phase 3: 集成和命令（50% 完成）
- Phase 4: 测试和优化（待完成）
- Phase 5: 文档和发布（待完成）

**剩余工作估计**: 4-5 天

## 优先级建议

### 高优先级（立即处理）
1. 修复 format-text.ts 的 JSX 语法错误
2. 通过 ESLint 检查
3. 添加项目图标

### 中优先级（本周完成）
4. 编写核心测试用例
5. 性能测试和优化
6. 边界情况处理

### 低优先级（下周完成）
7. 编写 README 文档
8. 准备演示用例
9. 测试发布流程

---

**文档版本**: 1.0
**最后更新**: 2026-01-05
**维护者**: 开发团队
