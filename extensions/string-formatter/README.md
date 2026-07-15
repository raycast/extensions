# String Formatter - Raycast Extension

![String Formatter Demo](metadata/string-formatter-1.png)

A powerful string formatting Raycast extension with intelligent separator detection, character removal, custom decorators, and output formatting.

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

