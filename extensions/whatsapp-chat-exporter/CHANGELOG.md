# Changelog

## [1.0.0] - 2026-01-26

### Added
- Initial release of WhatsApp Chat Exporter
- Export individual or all WhatsApp chats
- Support for JSON and Markdown export formats
- Media file export (images, videos, documents, audio)
- Group chat support with proper sender identification
- Contact name resolution from WhatsApp profile database
- Base64-encoded name decoding
- Graceful handling of missing/cloud-only media files
- Progress notifications during export
- Customizable export destination folder

### Features
- Read WhatsApp's local SQLite database
- Export chat metadata and full message history
- Include timestamps and sender information
- Copy media files to organized folders
- Generate human-readable Markdown or structured JSON
- Support for multiple media types (images, videos, audio, documents, vCards)
