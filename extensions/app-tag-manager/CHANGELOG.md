# App Tag Manager Changelog

## [Initial Version] - {PR_MERGE_DATE}

### 🎉 Features

#### Core Functionality
- **Tag Management System**: Add, remove, and manage custom tags for any macOS application
- **Smart Search**: Search applications by name, tag, or Chinese/Pinyin
- **List-based Tag Editor**: Streamlined interface for managing tags with instant add/remove functionality

#### Search Capabilities
- **Multi-language Support**: Full support for English, Chinese, and Pinyin search
- **Progressive Loading**: Fast initial load with asynchronous Chinese name updates
- **Tag Filtering**: Filter applications by assigned tags for quick discovery

#### Import/Export
- **Export Tags**: Export all tag configurations as JSON for backup or sharing
- **Import Tags**: Import tag configurations from clipboard with preview
- **AI Auto-tagging**: Included AI prompt for automatic tag generation

#### User Interface
- **Intuitive Navigation**: Simple app list → tag management flow
- **Real-time Updates**: Instant feedback for all tag operations
- **Empty State Guidance**: Helpful tips when no tags are present

### 🛠 Technical Details
- Built with Raycast API v1.102.7
- Local data storage using Raycast LocalStorage
- Optimized batch processing for metadata queries
- Support for all macOS applications including system apps

### 📝 Commands
- `App Tags Search`: Main interface for searching and tagging applications
- `App Tags Export`: Export tag configurations with AI prompt
- `App Tags Import`: Import tag configurations from clipboard

---

Made with ❤️ by Deepoke for the Raycast community
