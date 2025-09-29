# String Formatter - Raycast Extension

![String Formatter Demo](assets/show.png)

A powerful string formatting Raycast extension with intelligent separator detection, character removal, custom decorators, and output formatting. Supports both Chinese and English interfaces.

## 🚀 Features

### Input Processing
- 🔤 **String Input**: Support for multi-line string input
- 🗑️ **Character Removal**: Remove specified characters or strings
- 🔍 **Smart Separator Detection**: Automatically detect separators in input strings
- ⚙️ **Manual Separator Selection**: Support for comma, semicolon, space, pipe, tab, newline, etc.

### Output Formatting
- 🎨 **Decorator Selection**: Support for single quotes, double quotes, backticks, square brackets, parentheses, curly braces
- 📤 **Custom Output Separator**: Configurable output result separator
- 🔄 **Deduplication**: Optional removal of duplicate elements (enabled by default)
- 👀 **Real-time Preview**: Instantly display formatting results as you type
- 📋 **One-click Copy**: Quick copy of formatted results to clipboard

### User Experience
- 🌐 **Multi-language Support**: Chinese and English interfaces
- 🎯 **Smart Interface**: Clear separation between input and output areas with dividers
- ⚠️ **Error Handling**: Friendly error messages and exception handling
- ⌨️ **Keyboard Shortcuts**: Convenient keyboard operations

## 📝 Usage Examples

### Basic Example
**Input**: `a,b,c`
**Input Separator**: Auto Detect (detects comma)
**Decorator**: Single Quote (')
**Output Separator**: Comma (,)
**Deduplication**: ✅ Enabled
**Output**: `'a','b','c'`

### Advanced Example
**Input**: `(apple);(banana);(cherry)`
**Remove Characters**: `()`
**Input Separator**: Auto Detect (detects semicolon)
**Decorator**: Square Brackets []
**Output Separator**: Newline (\n)
**Output**:
```
[apple]
[banana]
[cherry]
```

### Complex Example
**Input**: `"item1" | "item2" | "item3"`
**Remove Characters**: `"`
**Input Separator**: Pipe (|)
**Decorator**: Backtick (`)
**Output Separator**: Semicolon (;)
**Output**: `` `item1`;`item2`;`item3` ``

### Deduplication Example
**Input**: `apple,banana,apple,cherry,banana`
**Input Separator**: Auto Detect (detects comma)
**Decorator**: Double Quote (")
**Output Separator**: Comma (,)
**Deduplication**: ✅ Enabled
**Output**: `"apple","banana","cherry"`

## 🌐 Language Support

The extension supports both Chinese and English interfaces:

1. Open Raycast preferences
2. Navigate to Extensions → String Formatter
3. Select your preferred language:
   - **中文 (Chinese)**: Default Chinese interface
   - **English**: English interface

## ⌨️ Keyboard Shortcuts

- `Cmd + C`: Copy formatted result
- `Cmd + R`: Reset form

## 🛠️ Installation

1. Make sure [Raycast](https://raycast.com/) is installed
2. Run in project directory: `npm install`
3. Development mode: `npm run dev`
4. Build: `npm run build`

## 🔧 Development

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Code linting
npm run lint

# Fix code formatting
npm run fix-lint
```

## 📄 License

MIT License

---

# String Formatter - Raycast插件

一个功能强大的字符串格式化Raycast插件，支持智能分隔符检测、字符移除、自定义修饰符和输出格式。支持中英文界面。

## 🚀 功能特性

### 输入处理
- 🔤 **字符串输入**：支持多行字符串输入
- 🗑️ **字符移除**：支持移除指定的字符或字符串
- 🔍 **智能分隔符检测**：自动检测输入字符串中的分隔符
- ⚙️ **手动分隔符选择**：支持逗号、分号、空格、竖线、制表符、换行符等

### 输出格式化
- 🎨 **修饰符选择**：支持单引号、双引号、反引号、方括号、圆括号、花括号
- 📤 **自定义输出分隔符**：可设置输出结果的分隔符
- 🔄 **去重功能**：可选择是否移除重复的元素（默认开启）
- 👀 **实时预览**：输入内容后立即显示格式化结果
- 📋 **一键复制**：快速复制格式化结果到剪贴板

### 用户体验
- 🌐 **多语言支持**：中英文界面切换
- 🎯 **智能界面**：输入和输出区域用分隔线清晰区分
- ⚠️ **错误处理**：友好的错误提示和异常处理
- ⌨️ **快捷键支持**：便捷的键盘操作

## 🌐 语言支持

插件支持中英文界面切换：

1. 打开Raycast偏好设置
2. 导航到扩展 → String Formatter
3. 选择您的首选语言：
   - **中文 (Chinese)**：默认中文界面
   - **English**：英文界面

## ⌨️ 快捷键

- `Cmd + C`：复制格式化结果
- `Cmd + R`：重置表单

## 🛠️ 安装

1. 确保已安装 [Raycast](https://raycast.com/)
2. 在项目目录运行：`npm install`
3. 开发模式：`npm run dev`
4. 构建：`npm run build`

## 📄 许可证

MIT License