# Changelog

All notable changes to the Lark Quick Memo extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-11-15

### Added
- **Core Memo Functionality**: Send quick memos to Lark/Feishu
  - One-action memo sending with keyboard shortcuts
  - Support for both global (larksuite.com) and China (feishu.cn) domains
  - Secure authentication with App ID and App Secret
- **File Attachments**: Upload and send files with memos
  - Support for images (PNG, JPG, JPEG, GIF, BMP, WebP)
  - Document support (PDF, DOC, DOCX, TXT, MD, CSV, XLS, XLSX)
  - Video support (MP4, MOV, AVI, MKV, WMV, FLV, WebM)
  - Native file picker integration
- **Template System**: Create and manage message templates
  - Custom template creation with categories
  - Preset templates for common use cases
  - Template search and organization
- **Message History**: Track and manage sent messages
  - View all sent messages with timestamps
  - Search functionality for finding specific messages
  - Message statistics and usage analytics
- **Chat Destinations**: Flexible message routing
  - Send to personal DMs, group chats, or bots
  - Custom chat management
  - Smart destination selection
- **Multi-language Support**: Japanese and English interfaces
  - Complete localization for both languages
  - Cultural adaptation for Japanese users
  - Language switching in settings
- **Settings Management**: Comprehensive configuration options
  - Timestamp prefixing options
  - Custom chat configuration
  - Template and history management
  - Reset and backup functionality

### Technical Features
- **Raycast Integration**: Native Raycast extension architecture
- **TypeScript**: Full type safety and modern development practices
- **Error Handling**: Robust error handling with user-friendly messages
- **Rate Limiting**: Smart retry mechanisms for API rate limits
- **Security**: Secure credential storage in Raycast Keychain
- **Performance**: Optimized for fast memo sending and file uploads

---

## Support

For issues, feature requests, or questions:
- GitHub Issues: [Create an issue](https://github.com/your-username/lark-quick-memo/issues)
- Documentation: See README.md for detailed usage instructions
- Lark API Documentation: [Lark Open Platform](https://open.larksuite.com/document/)