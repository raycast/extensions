# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-01-10

### Changed
- **Internationalization**: Converted all Chinese text in the user interface to English
- **UI Text**: Translated all button labels, placeholders, and status messages to English
- **Error Messages**: Updated all error and notification messages to English
- **Documentation**: Translated README.md and other documentation files to English
- **Code Comments**: Updated all code comments to English
- **Raycast Store Compliance**: Ensured full compliance with Raycast Store English-only UI requirements

### Technical Improvements
- Updated TypeScript type annotations and comments
- Improved code readability with English comments
- Enhanced internationalization support for future localization
- Fixed image buffer handling in cache system

### Fixed
- Fixed image caching buffer type compatibility issue
- Improved error handling messages for better user experience

## [1.0.0] - 2025-01-10

### Added
- Initial release of Wubi Encoding Query extension for Raycast
- Fast Wubi encoding lookup for Chinese characters (86 and 98 versions)
- Batch query support for multiple characters simultaneously
- Real-time search with 300ms response time
- Smart image caching for character decomposition diagrams
- One-click copy functionality for Wubi encodings
- Complete character information display (encoding, pinyin, strokes)
- Modern list + detail view interface design
- Support for both short codes and full encodings
- Error handling for invalid input
- Local image caching to improve performance
- Browser fallback for viewing decomposition diagrams

### Technical Features
- TypeScript + React implementation
- Integration with iamwawa.cn Wubi encoding API
- Automatic image downloading and caching
- Debounced search input for better performance
- Cross-platform compatibility
- Complete type safety with TypeScript
- ESLint and Prettier code quality tools
- MIT open source license

### Supported Features
- **Query Methods**: Real-time search, batch processing
- **Encoding Versions**: Wubi 86, Wubi 98
- **Additional Info**: Pinyin pronunciation, stroke count
- **Visual Aid**: Character decomposition diagrams
- **User Actions**: Copy encodings, view details, open in browser
- **Performance**: Local caching, fast API responses

[1.0.1]: https://github.com/0xlane/raycast_wubi/releases/tag/v1.0.1
[1.0.0]: https://github.com/0xlane/raycast_wubi/releases/tag/v1.0.0
