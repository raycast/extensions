# Changelog

## [1.1.0] - 2025-01-19

### New Features
- 🧭 **Note Roaming Feature**: Support random roaming, tag theme roaming, old notes review, and document block roaming
  - Random Document Roaming: Randomly discover document content
  - Random Block Roaming: Randomly browse block-level content
  - Old Notes Review: Rediscover past notes (support filtering by month/year)
  - Tag Theme Roaming: Explore related content by tags
  - Document Block Roaming: Randomly browse block content within specified documents
- 📎 **Asset File Finding Feature**: Quickly find and manage attachment files in SiYuan assets folder
  - Support search by filename
  - Support filter by file type (images, documents, audio, video, etc.)
  - Support file preview and quick open
  - Support showing file location in Finder
- ⚡ **Quick Add Note Feature**: Quickly add clipboard content to recently edited SiYuan note documents
  - Auto-get clipboard content
  - Support selecting recently edited documents
  - Support timestamp option
  - Support quick parameter passing

### Improvements and Optimizations
- 🔧 Fixed daily note creation path issue
- 🔧 Fixed quick add default timestamp issue
- 🔧 Optimized search document reference feature
- 🔧 Fixed asset finding high CPU usage issue
- 🔧 Optimized overall code structure and performance

## [1.0.0] - 2025-08-01

### Added
- 🔍 Note Search Feature: Quickly search documents and block content
- 📝 Create Note Feature: Create new documents in specified notebooks
- 📅 Daily Note Feature: Quickly add content to today's note
- 📋 Recent Notes Feature: View and access recently modified documents
- 📎 File Link Support: Directly open attachments and local files in notes
- 🎨 Use SiYuan Notes official icon
- ⚙️ Complete configuration options: server address, API token, workspace path, etc.

### Features
- Support filtering search results by notebook
- Support icon display for multiple block types
- Support quick access to local files and attachments
- Support quick recording in daily notes
- Complete error handling and user feedback

### Technical
- Built on Raycast API 1.70.0
- Built with TypeScript
- Complete ESLint and Prettier configuration
- Compliant with Raycast Store publishing standards
