# Text Case Transformer Changelog

## [Initial Release] - {PR_MERGE_DATE}

Initial version of Text Case Transformer extension for Raycast.

### Features
- Transform selected text to 10 different case formats
- Interactive List interface with live preview
- Quick commands for individual transformations
- Support for:
  - lowercase
  - UPPERCASE
  - camelCase
  - PascalCase
  - snake_case
  - kebab-case
  - CONSTANT_CASE
  - Title Case
  - Sentence case
  - dot.case

### Commands
- **Transform Text Case**: Main interface with all transformations
- **To Lowercase**: Direct command for lowercase transformation
- **To Uppercase**: Direct command for uppercase transformation
- **To camelCase**: Direct command for camelCase transformation
- **To PascalCase**: Direct command for PascalCase transformation
- **To snake_case**: Direct command for snake_case transformation
- **To kebab-case**: Direct command for kebab-case transformation

### Usage
1. Select text in any application
2. Open Raycast and search for "Transform Text Case" or specific commands
3. Choose desired transformation
4. Text is automatically pasted or copied

### Technical Details
- Built with TypeScript and React
- Uses native Raycast APIs for clipboard and text selection
- Zero external dependencies for transformations
- Optimized for performance and reliability
