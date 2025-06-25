# Changelog

All notable changes to the SubDL Subtitle Finder extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2024-01-16

### 🎨 Enhanced UI & Separate Filters

#### ✨ Added
- **Separate Language & Quality Filters**: Redesigned filter interface for better UX
  - Language filter moved to search bar dropdown with country flag emojis
  - Quality filter accessible via action panel submenu
  - Independent filter operation for more flexible searching
  - Enhanced quality labels: 1080p/Blu-ray, 720p/HD, 480p/DVD, 360p/SD

#### 🎬 TMDB-Style Movie Presentation
- **Enhanced Movie Display**: High-quality poster integration directly in list items
- **Rich Movie Details**: Structured movie detail view with organized sections
- **Interactive Actions**: Copy IMDb links, open movie details
- **Professional Layout**: TMDB-inspired design with emoji indicators
- **Improved Accessories**: Runtime, ratings, and metascore with visual indicators

#### ⌨️ Enhanced Keyboard Shortcuts
- **Cmd+R**: Clear all active filters
- **Cmd+Shift+R**: Refresh current search
- **Existing shortcuts**: Cmd+Enter (download), Cmd+C (copy link)

#### 🔧 Technical Improvements
- Enhanced movie info API with full plot details instead of short summaries
- Better poster fallback handling for missing or invalid poster URLs
- Improved accessories display with emojis for visual appeal
- Structured movie detail markdown with organized sections
- Enhanced error handling for movie information retrieval

### 🔄 Changed
- **Filter Interface**: Separated combined language+quality dropdown into two independent filters
- **Movie Details**: Restructured movie detail view with sections for overview, production, and ratings
- **Quality Labels**: Updated quality descriptions to include format references (Blu-ray, HD, DVD, SD)
- **Action Panel**: Added quality filter to action panel for better accessibility

---

## [1.0.0] - 2024-01-15

### 🎉 Initial Release

This is the first major release of SubDL Subtitle Finder for Raycast, featuring comprehensive subtitle search and download capabilities.

### ✨ Added

#### Core Functionality
- **SubDL API Integration**: Complete integration with SubDL.com API for subtitle search and download
- **Multi-language Support**: Support for 11 languages (Arabic, English, French, Spanish, German, Italian, Portuguese, Russian, Japanese, Korean, Chinese)
- **Quality Filtering**: Filter subtitles by video quality (4K/2160p, 1080p, 720p, 480p, 360p)
- **Direct Downloads**: Download subtitle files directly to Downloads folder or custom directory
- **Copy Links**: Copy subtitle download URLs to clipboard

#### Smart Search Features
- **Auto-suggestions**: Smart suggestions as you type (2+ characters)
- **Popular Content Database**: Comprehensive database of 60+ popular movies and TV shows
- **Real-time Search**: Debounced search with 800ms delay for optimal performance
- **Search Suggestions**: Intelligent filtering and movie/TV show recommendations

#### User Interface
- **Language & Quality Dropdown**: Combined filter dropdown for language and quality selection
- **Language Flags**: Visual language identification with country flags (🇸🇦🇺🇸🇫🇷)
- **Sectioned Results**: Organized display with suggestions, movie info, and subtitles
- **Loading States**: Visual feedback during searches and downloads
- **Empty States**: Helpful actions when no results are found

#### Movie Information Integration
- **OMDb API Integration**: Rich movie information display with posters
- **Movie Details**: Plot, cast, ratings, runtime, and release information
- **IMDb Ratings**: Display ratings and vote counts
- **Movie Posters**: Visual movie identification

#### Error Handling & UX
- **Comprehensive Error Messages**: Detailed error handling for API failures
- **Success Notifications**: Toast messages for successful downloads and actions
- **API Key Validation**: Proper validation and error messages for missing API keys
- **Rate Limiting Handling**: Graceful handling of API rate limits

#### Configuration & Preferences
- **SubDL API Key**: Required preference for subtitle search functionality
- **Default Language**: User-configurable default language preference
- **Download Directory**: Customizable download location
- **Movie Info Toggle**: Option to enable/disable movie information display
- **OMDb API Key**: Optional preference for enhanced movie information

### 🔧 Technical Features

#### API Integration
- **SubDL API**: Full integration with `api.subdl.com/api/v1/subtitles` endpoint
- **OMDb API**: Integration with OMDb for movie information retrieval
- **Error Handling**: Robust error handling for network failures and API errors
- **Rate Limiting**: Proper handling of API rate limits and quotas

#### Performance Optimizations
- **Debounced Search**: 800ms debounce for search queries to reduce API calls
- **Client-side Filtering**: Language and quality filtering performed client-side for better UX
- **Efficient Caching**: Intelligent caching of search results and movie information
- **Parallel Processing**: Concurrent API calls where appropriate

#### Code Quality
- **TypeScript**: Full TypeScript implementation with proper type definitions
- **ESLint**: Comprehensive linting rules and code style enforcement
- **Error Boundaries**: Proper error boundaries and exception handling
- **Code Organization**: Well-structured codebase with clear separation of concerns

### 🏗️ Architecture

#### File Structure
- `src/api.ts`: SubDL API integration and interface definitions
- `src/search-subtitles.tsx`: Main search interface and application logic
- `src/components/SubtitleItem.tsx`: Individual subtitle item component
- `src/utils/show-info.ts`: OMDb API integration for movie information
- `assets/extension-icon.png`: Extension icon assets

#### Components
- **SubtitleItem**: Reusable component for displaying individual subtitle results
- **MovieInfoItem**: Component for displaying movie information
- **MovieDetail**: Detailed movie information view
- **Smart Suggestions**: Auto-suggestion system for popular content

### 📋 Requirements

#### Required Dependencies
- `@raycast/api`: ^1.83.2 - Core Raycast API integration
- `node-fetch`: ^3.3.2 - HTTP requests for API integration

#### API Keys
- **SubDL API Key** (Required): Available from [subdl.com](https://subdl.com/api-doc)
- **OMDb API Key** (Optional): Available from [omdbapi.com](http://www.omdbapi.com/apikey.aspx)

#### System Requirements
- Raycast 1.50.0 or later
- macOS 12.0 or later
- Node.js 18.0 or later (for development)

### 🎯 Supported Use Cases

#### Primary Use Cases
- **Arabic Subtitle Search**: Primary focus on Arabic subtitle discovery and download
- **Multi-language Support**: Support for international subtitle search
- **Quality-based Filtering**: Find subtitles for specific video qualities
- **Movie Discovery**: Discover popular movies and TV shows
- **Quick Downloads**: One-click subtitle downloads

#### Advanced Features
- **Movie Information**: Rich movie details with posters and metadata
- **Batch Operations**: Multiple subtitle downloads and link copying
- **Custom Organization**: Configurable download directories
- **Link Sharing**: Copy and share subtitle download links

### 🔒 Security & Privacy

#### Data Handling
- **Secure API Key Storage**: API keys stored in Raycast's encrypted preferences
- **No Personal Data Collection**: Extension doesn't collect or store personal information
- **External API Communication**: Only communicates with SubDL and OMDb APIs
- **Local Processing**: All filtering and processing performed locally

#### API Security
- **HTTPS Only**: All API communications use HTTPS encryption
- **API Key Validation**: Proper validation of API keys before requests
- **Rate Limiting Compliance**: Respects API rate limits and quotas
- **Error Logging**: Minimal error logging without sensitive information

### 📚 Documentation

#### User Documentation
- **Comprehensive README**: Detailed setup and usage instructions
- **Configuration Guide**: Step-by-step API key configuration
- **Feature Documentation**: Complete feature overview and capabilities
- **Troubleshooting**: Common issues and solutions

#### Developer Documentation
- **Code Comments**: Comprehensive inline documentation
- **Type Definitions**: Full TypeScript type definitions
- **API Documentation**: Detailed API integration documentation
- **Development Guide**: Setup and development instructions

### 🧪 Quality Assurance

#### Testing
- **Manual Testing**: Comprehensive manual testing of all features
- **Error Scenario Testing**: Testing of various error conditions
- **API Integration Testing**: Validation of API integrations
- **Cross-platform Testing**: Testing on different macOS versions

#### Code Quality
- **ESLint Compliance**: Zero linting errors
- **TypeScript Compliance**: Full type safety and validation
- **Build Validation**: Successful production builds
- **Performance Testing**: Validation of search and download performance

---

## Future Roadmap

### Planned Features
- **Subtitle Preview**: Preview subtitle content before downloading
- **Batch Downloads**: Download multiple subtitles simultaneously
- **Subtitle History**: Track of previously downloaded subtitles
- **Advanced Search**: Search by IMDb ID, file hash, or specific criteria
- **Subtitle Sync**: Tools for subtitle timing adjustment
- **Custom Sources**: Support for additional subtitle sources

### Potential Enhancements
- **Offline Mode**: Cache popular subtitles for offline access
- **Subtitle Rating**: Community rating and review system
- **Auto-detection**: Automatic movie detection from file names
- **Integration Improvements**: Enhanced movie database integration
- **Performance Optimizations**: Further performance improvements

---

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on how to:
- Report bugs and issues
- Request new features
- Submit code contributions
- Improve documentation

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/subdl-subtitle-finder/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/subdl-subtitle-finder/discussions)
- **Documentation**: [README.md](README.md)

---

**Note**: This extension is not affiliated with SubDL.com. It's an independent project that uses the SubDL API for subtitle search and download functionality.