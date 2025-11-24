# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-24

### Added
- 快速截图功能，使用 macOS 原生 screencapture 工具 | Quick screenshot using macOS native screencapture tool
- 悬浮窗口显示截图，1:1 比例显示 | Floating window display with 1:1 ratio
- OCR 文字识别功能，支持中文（简体/繁体）和英文 | OCR text recognition supporting Chinese (Simplified/Traditional) and English
- 一键复制识别的文字到剪贴板 | One-click copy recognized text to clipboard
- 一键粘贴识别的文字到当前应用 | One-click paste recognized text to current application
- 可折叠的 OCR 结果面板 | Collapsible OCR results panel
- 窗口拖动功能，可在屏幕任意位置移动 | Window dragging, movable anywhere on screen
- ESC 键快速关闭悬浮窗口 | ESC key to quickly close floating window
- 自动清理临时截图文件 | Automatic cleanup of temporary screenshot files
- 智能窗口定位，截图后显示在截图位置附近 | Smart window positioning near screenshot location
- 英文文档支持 (README_EN.md) | English documentation support (README_EN.md)
- MIT 许可证文件 | MIT License file

### Technical
- 使用 Objective-C 实现高性能悬浮窗口 | High-performance floating window implemented in Objective-C
- 集成 Apple Vision Framework 进行 OCR 识别 | Integrated Apple Vision Framework for OCR recognition
- 使用原生工具获取鼠标位置，精确定位窗口 | Native tool for mouse position to precisely position window
- 支持 Retina 显示屏的高分辨率截图 | Support for high-resolution screenshots on Retina displays
- TypeScript 代码优化：提取常量、改进错误处理、添加类型注解和 JSDoc 注释 | TypeScript code optimization: extracted constants, improved error handling, added type annotations and JSDoc comments
- 优化二进制文件查找逻辑，减少重复代码 | Optimized binary file lookup logic, reduced code duplication
- 完善的元数据配置，包含关键词、仓库信息等 | Complete metadata configuration including keywords, repository info, etc.

### Changed
- 更新 package.json 添加完整的作者信息和仓库链接 | Updated package.json with complete author info and repository links
- 改进 .gitignore 和 .raycastignore 配置 | Improved .gitignore and .raycastignore configuration
- 优化构建脚本的错误提示 | Improved error messages in build scripts
- 使用 photo.on.rectangle.png 作为插件图标 | Using photo.on.rectangle.png as plugin icon

### Fixed
- 移除未使用的变量和代码 | Removed unused variables and code
- 改进错误处理，区分不同类型的错误 | Improved error handling to distinguish different error types
