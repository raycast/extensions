# Text Toolbox Changelog

## [Initial Release] - 2026-02-08

### Added

- 27 text transformations across 5 categories
- Interactive transformation list with live preview
- Ability to chain multiple transformations sequentially
- Quick transform commands with keyboard shortcut support
- Comprehensive test coverage (170+ tests)

#### Case Conversions (8)
- UPPERCASE transformation
- lowercase transformation
- camelCase transformation
- PascalCase transformation
- snake_case transformation
- kebab-case transformation
- SNAKE_UPPER_CASE transformation
- Capitalize Each Word transformation

#### Text Operations (3)
- Trim Whitespace transformation
- Remove Extra Spaces transformation
- Remove Non-ASCII Characters transformation

#### Line Operations (4)
- Sort Lines transformation
- Reverse Lines transformation
- Remove Duplicate Lines transformation
- Add Line Numbers transformation

#### Encoding/Decoding (8)
- URL Encode transformation
- URL Decode transformation
- Base64 Encode transformation
- Base64 Decode transformation
- HTML Encode transformation
- HTML Decode transformation
- Hexadecimal Encode transformation
- Hexadecimal Decode transformation

#### Hashing (4)
- MD5 Hash generation
- SHA1 Hash generation
- SHA256 Hash generation
- SHA512 Hash generation

### Features

- **Text Source Options**: Configure quick commands to use selected text, clipboard, or both with fallback
- **Result Behavior**: Choose to copy or paste transformed results
- **Transformation Visibility**: Show/hide individual transformations in the list
- **Error Handling**: Clear error messages for invalid decode operations
- **Cross-platform**: Full support for macOS and Windows
