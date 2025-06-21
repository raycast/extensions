# Lyrics Finder - Raycast Extension

A powerful Raycast extension that allows you to search for and display song lyrics from multiple sources including Spotify and Genius. Enhanced with comprehensive search capabilities and intelligent source prioritization.

## 🚀 Key Features

### **Multi-Source Search**
- 🎵 **Spotify Integration** - Primary search with comprehensive catalog access
- 🧠 **Genius API** - Fallback for lyrics and detailed song information  
- 🔄 **Alternative Sources** - Automatic fallback when primary sources fail

### **Advanced Search Modes**
- 🎶 **Song Search** - Find specific tracks with autocomplete suggestions
- 👨‍🎤 **Artist Search** - Browse artist catalogs with smart prioritization

### **Intelligent Features**
- 🔍 **Smart autocomplete** - Real-time suggestions as you type
- 🎯 **Duplicate detection** - Clean results without repeated entries
- 📊 **Source prioritization** - Best available lyrics source automatically selected
- 🎨 **Rich metadata** - Album art, artist info, release details
- ⚡ **Performance optimized** - Cached authentication and rate-limited API calls

### **User Experience**
- 📖 **Beautiful lyrics display** - Clean, readable formatting with line breaks
- 🔗 **Multiple actions** - Open on platforms, copy lyrics/info
- 📋 **Advanced copy options** - Copy lyrics, song info, or search queries
- 🎛️ **Mode switching** - Easy toggle between song and artist modes
- 🌐 **Platform linking** - Direct links to Spotify and Genius

## 📱 Usage Guide

### **Basic Search (Song Mode)**
1. Open Raycast and type "Search Lyrics"
2. Start typing a song title or artist name
   - Real-time autocomplete shows: **Song Title** by **Artist** (Album)
   - Thumbnails and metadata preview available
3. Select a song to view full lyrics with multiple source options
4. Use "Back to Search" to return to results

### **Artist Mode (Enhanced)**
1. Switch to Artist mode in the dropdown
2. Search for an artist name
3. Select an artist to see their catalog organized by:
   - **🔥 Top Tracks First** - Most popular songs (up to 10 tracks)
   - **🆕 New Releases Next** - Recent albums and singles (newest first)
   - **Smart Deduplication** - No repeated songs across categories
   - **Rich Metadata** - Album art, release dates, track counts
4. Visual indicators show whether each song is a top track or new release
5. Select any song to view lyrics

## ⌨️ Keyboard Shortcuts

### **In Search View:**
- `⌘ + O` - Open selected song on original platform (Spotify/Genius)
- `⌘ + C` - Copy song info (title and artist)
- `⌘ + ↑/↓` - Navigate through search modes

### **In Lyrics View:**
- `⌘ + B` - Back to search results
- `⌘ + O` - Open song on Genius/original source
- `⌘ + C` - Copy full lyrics to clipboard
- `⌘ + ⇧ + C` - Copy song info (title and artist)

## 🎯 Search Tips & Best Practices

### **For Better Song Results:**
- Include artist name for more accurate matches
- Use primary keywords from song titles
- Try alternative spellings if needed
- Check your spelling for best results

### **For Artist Discovery:**
- **Top Tracks** appear first for instant access to popular songs
- **New Releases** follow, sorted by release date (newest first)
- Complete discography browsing with up to 50+ tracks per artist
- Album covers and metadata provide rich context
- Smart duplicate removal ensures clean browsing experience

### **Visual Indicators:**
- 🔥 **Top Track** - Popular songs with high play counts
- 🆕 **New Release** - Recent albums and singles
- Album names and track positions for easy navigation

## 🛠️ Installation & Setup

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd lyrics-finder
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Add Required Icon**
   - Create a 512x512 PNG file named `icon.png` in the `assets/` folder
   - Use [Raycast's Icon Generator](https://icon.ray.so/) for best results
   - Music-themed icons (🎵, 🎶, 🎼) work well

4. **Development Mode**
   ```bash
   npm run dev
   ```

5. **Production Build**
   ```bash
   npm run build
   ```

## 🔧 Technical Architecture

### **Data Sources**
- **Spotify Web API** - Primary music catalog and metadata
- **Genius API** - Lyrics content and song information
- **Alternative Sources** - Fallback options for comprehensive coverage

### **Search Intelligence**
- Query preprocessing and variation generation
- Duplicate detection across sources
- Result relevance scoring and ranking
- Automatic source selection

### **Performance Features**
- OAuth token caching with automatic refresh
- Rate limiting and request optimization
- Parallel source querying where possible
- Result caching to minimize API calls

### **Artist Catalog Organization**
- **Top Tracks Priority** - Spotify's most popular tracks loaded first
- **Release Date Sorting** - Recent albums and singles ordered by date
- **Smart Limit Management** - Up to 50 total tracks for optimal performance
- **Duplicate Prevention** - Cross-reference top tracks with new releases

## 📦 Dependencies

### **Core Dependencies**
- `@raycast/api` - Raycast extension framework
- `genius-lyrics` - Genius API integration
- `spotify-web-api-node` - Spotify Web API client
- `axios` - HTTP requests for custom sources
- `cheerio` - HTML parsing capabilities

### **Development Tools**
- `@raycast/eslint-config` - Code quality standards
- `typescript` - Type safety and modern JavaScript
- `prettier` - Code formatting

## 🌟 Advanced Features

### **Source Fallback Chain**
1. **Spotify** (metadata + track info)
2. **Genius** (lyrics + song details)  
3. **Alternative Sources** (backup options)
4. **Manual Search** (online fallback links)

### **Smart Artist Browsing**
- **Popularity-Based Organization** - Top tracks always appear first
- **Chronological New Releases** - Latest albums and singles prioritized
- **Rich Visual Context** - Album artwork and release information
- **Comprehensive Coverage** - Both mainstream hits and latest releases

### **Enhanced Search Experience**
- Real-time autocomplete with rich metadata
- Artist discography exploration with smart organization
- Album and single browsing with visual indicators
- Collaborative track detection and deduplication

## 🆘 Troubleshooting

### **Common Issues**
- **No search results**: Try alternative spellings or include artist name
- **Missing lyrics**: Some songs may not have lyrics available on any source
- **Slow performance**: Check network connection; API rate limits may apply
- **Artist not found**: Try searching by song first, then browse artist catalog
- **Limited top tracks**: Spotify API provides up to 10 top tracks maximum

### **Debug Information**
- Check Raycast console for detailed search logs
- Spotify authentication status logged on each search
- Source fallback progression shown in development mode
- Track categorization (top tracks vs new releases) logged during artist browsing

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please read the contribution guidelines and submit pull requests for any enhancements.

---

**Note**: This extension requires active internet connection for all search and lyrics functionality. Some features may be limited by API rate limits during heavy usage. 