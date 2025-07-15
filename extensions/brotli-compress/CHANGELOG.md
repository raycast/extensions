# Brotli Changelog

## [Initial Release] - {PR_MERGE_DATE}

### Added

- 🗜️ **Compress Text Command**: Compress selected text or clipboard content using Brotli algorithm
- 📄 **Decompress Text Command**: Decompress Brotli-compressed base64 text with live preview
- 🎨 **Syntax Highlighting**: Auto-detection and formatting for JSON, JavaScript, HTML, XML, and plain text
- 📊 **Comprehensive Analytics**: Shows compression ratios, file sizes, and performance metrics
- ⚡ **Performance Optimizations**: Progress indicators for large text files (>10KB)
- 🛡️ **Robust Error Handling**: Input validation, format checking, and user-friendly error messages
- 📋 **Smart Input Detection**: Automatically reads from selected text with clipboard fallback
- 🎯 **Professional UI**: Clean interface with metadata panels and detailed information display

### Technical Features

- Base64 input validation with format verification
- Content type auto-detection (JSON, JavaScript, HTML, XML, Plain Text)
- Comprehensive error handling with actionable error messages
- TypeScript implementation with proper type safety
- ESLint configuration following Raycast best practices
- Optimized performance for large text processing

### Security

- Input sanitization and validation
- Safe base64 decoding with error handling
- No external network dependencies
- Local processing only
