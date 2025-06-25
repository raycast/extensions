# SubDL Subtitle Finder for Raycast

A powerful Raycast extension for searching and downloading Arabic and international movie/TV show subtitles from SubDL.com. Features smart search, quality filtering, multi-language support, and direct downloads.

![Extension Icon](assets/extension-icon.png)

## ✨ Features

### 🔍 Smart Search
- **Auto-suggestions**: Get smart suggestions as you type (2+ characters)
- **Popular content**: Discover popular movies and TV shows
- **Comprehensive database**: Search through 60+ popular titles
- **Real-time filtering**: Debounced search with 800ms delay for optimal performance

### 🌍 Multi-Language Support
- **11 Languages**: Arabic, English, French, Spanish, German, Italian, Portuguese, Russian, Japanese, Korean, Chinese
- **Language flags**: Visual language identification with country flags 🇸🇦🇺🇸🇫🇷
- **Smart filtering**: Client-side language filtering for better UX

### 🎬 Quality Filtering
- **Multiple qualities**: 4K/2160p, 1080p, 720p, 480p, 360p
- **Combined filters**: Filter by language AND quality simultaneously
- **Quality indicators**: Parse release names for quality information

### 📥 Download & Share
- **Direct downloads**: Download to Downloads folder or custom directory
- **Copy links**: Copy download URLs to clipboard
- **File naming**: Smart file naming with movie title and language

### 🎭 Movie Information
- **OMDb integration**: Rich movie information display
- **Movie details**: Plot, cast, ratings, runtime, and more
- **Movie posters**: Visual movie identification
- **IMDb ratings**: See ratings and vote counts

### 🎨 User Experience
- **Loading states**: Visual feedback during searches
- **Error handling**: Comprehensive error messages and recovery
- **Success notifications**: Toast messages for downloads and actions
- **Empty states**: Helpful actions when no results found

## 🚀 Installation

### From Raycast Store (Recommended)
1. Open Raycast
2. Search for "SubDL Subtitle Finder"
3. Click "Install Extension"
4. Configure your API keys in preferences

### Manual Installation (Development)
1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/subdl-subtitle-finder
   cd subdl-subtitle-finder
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Import into Raycast:
   ```bash
   npm run dev
   ```

## ⚙️ Configuration

### Required Settings

#### SubDL API Key (Required)
1. Visit [SubDL.com](https://subdl.com/api-doc)
2. Create an account or sign in
3. Generate an API key from your account dashboard
4. Add the API key in Raycast Extension Preferences

### Optional Settings

#### Default Language
- Choose your preferred subtitle language
- Defaults to Arabic if not specified
- Can be changed per search using the filter dropdown

#### Download Directory
- Customize where subtitles are downloaded
- Defaults to your Downloads folder
- Supports custom paths for organization

#### Movie Information
- Toggle movie info display on/off
- Requires OMDb API key for full functionality
- Shows plot, cast, ratings, and movie details

#### OMDb API Key (Optional)
1. Visit [OMDb API](http://www.omdbapi.com/apikey.aspx)
2. Request a free API key
3. Add the key in Extension Preferences
4. Enables rich movie information display

## 🎯 Usage

### Basic Search
1. Open Raycast (⌘ + Space)
2. Type "SubDL" or "Search Subtitles"
3. Enter movie or TV show name
4. Browse and download subtitles

### Advanced Filtering
1. Use the dropdown filter next to the search bar
2. Select language and quality combinations:
   - Arabic • 1080p
   - English • 4K/2160p
   - All Languages • 720p
3. Results update automatically

### Download Subtitles
1. Browse search results
2. Press Enter or click on a subtitle
3. Choose "Download Subtitle" action
4. File downloads to configured directory

### Copy Download Links
1. Select a subtitle from results
2. Use "Copy Download Link" action (⌘ + C)
3. Share the link or download later

## 🔧 Development

### Project Structure
```
subdl-subtitle-finder/
├── src/
│   ├── api.ts                 # SubDL API integration
│   ├── search-subtitles.tsx   # Main search interface
│   ├── components/
│   │   └── SubtitleItem.tsx   # Individual subtitle component
│   └── utils/
│       └── show-info.ts       # OMDb API integration
├── assets/
│   └── extension-icon.png     # Extension icon
├── package.json               # Dependencies and configuration
└── README.md                  # Documentation
```

### Available Scripts
```bash
# Development mode
npm run dev

# Production build
npm run build

# Code linting
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run typecheck
```

### API Integration

#### SubDL API
- Endpoint: `https://api.subdl.com/api/v1/subtitles`
- Authentication: API key required
- Features: Search, download, quality filtering
- Rate limiting: Applied per API key

#### OMDb API
- Endpoint: `http://www.omdbapi.com/`
- Authentication: API key required (optional)
- Features: Movie information, ratings, posters
- Rate limiting: 1000 requests/day (free tier)

## 📦 Deployment to Raycast Store

### Prerequisites
1. **GitHub Account**: Extension must be in a public repository
2. **Raycast Developer Account**: Sign up at [developers.raycast.com](https://developers.raycast.com)
3. **MIT License**: Required for store submissions
4. **Quality Assurance**: Extension passes all linting and build checks

### Store Submission Process

#### 1. Prepare Extension
```bash
# Ensure all dependencies are up to date
npm update

# Run quality checks
npm run lint
npm run build
npm run typecheck

# Test thoroughly in development mode
npm run dev
```

#### 2. Update Metadata
Ensure `package.json` includes:
```json
{
  "name": "subdl-subtitle-finder",
  "title": "SubDL Subtitle Finder",
  "description": "Search and download Arabic and international movie/TV subtitles from SubDL.com",
  "author": "yourusername",
  "license": "MIT",
  "version": "1.0.0"
}
```

#### 3. Create Extension Icon
- Size: 512x512px PNG format
- Works in both light and dark themes
- Represents the extension's functionality
- Place in `assets/extension-icon.png`

#### 4. Documentation Requirements
- ✅ Comprehensive README.md
- ✅ CHANGELOG.md with version history
- ✅ Clear setup instructions
- ✅ API key configuration guide

#### 5. Submit to Store
1. Fork the [Raycast Extensions Repository](https://github.com/raycast/extensions)
2. Add your extension to the `extensions/` directory
3. Create a pull request with:
   - Extension source code
   - Complete documentation
   - Working API integrations
   - Proper error handling

#### 6. Review Process
- **Automated checks**: Linting, building, TypeScript validation
- **Manual review**: Functionality, UX, code quality
- **Testing**: Raycast team tests all features
- **Approval**: Usually takes 3-7 business days

### Store Guidelines Compliance

#### ✅ Naming Conventions
- **Extension Title**: "SubDL Subtitle Finder" (descriptive, noun-based)
- **Command Title**: "Search Subtitles" (verb + noun structure)
- **Command Subtitle**: "SubDL" (service name for context)

#### ✅ User Experience
- **Required preferences**: API key validation before use
- **Error handling**: Comprehensive error messages
- **Loading states**: Visual feedback during operations
- **Empty states**: Helpful actions when no results

#### ✅ Security & Privacy
- **API keys**: Stored securely in Raycast preferences
- **No keychain access**: Uses Raycast's secure preference storage
- **External APIs**: Only connects to SubDL and OMDb official APIs

## 🔄 API Key Management

### For End Users
The extension uses Raycast's built-in preference system for secure API key storage:

1. **First Launch**: Raycast prompts for required API key
2. **Secure Storage**: Keys stored in Raycast's encrypted preferences
3. **Easy Updates**: Change keys anytime in Extension Preferences
4. **No Manual Configuration**: No need for separate config files

### Alternative Distribution Methods

#### 1. GitHub Releases
- Create releases with built extension
- Users can manually import using Raycast Developer Mode
- Suitable for beta testing and early access

#### 2. Direct Distribution
- Share the repository link
- Users clone and run `npm run dev`
- Requires technical knowledge

#### 3. Company/Team Distribution
- Raycast Teams feature for organization-wide extensions
- Custom extension stores for enterprises
- Requires Raycast Pro subscription

## 🤝 Contributing

### Bug Reports
1. Check existing issues first
2. Provide detailed reproduction steps
3. Include Raycast and extension versions
4. Add relevant logs and error messages

### Feature Requests
1. Describe the feature and use case
2. Explain how it improves user experience
3. Consider technical feasibility
4. Check SubDL API capabilities

### Development Contributions
1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Ensure linting passes
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **SubDL.com**: For providing the subtitle search API
- **OMDb API**: For movie information integration
- **Raycast Team**: For the excellent extension platform
- **Community**: For feature requests and bug reports

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/subdl-subtitle-finder/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/subdl-subtitle-finder/discussions)
- **Email**: your.email@example.com
- **Twitter**: [@yourusername](https://twitter.com/yourusername)

---

Made with ❤️ for the Arabic and international subtitle community