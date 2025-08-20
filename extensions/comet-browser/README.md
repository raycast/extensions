# Comet Browser Raycast Extension

A powerful Raycast extension that enables seamless search functionality for the Comet browser by Perplexity AI. Search through open tabs, browsing history, and get unified results with lightning-fast performance.

## Features

### Search Commands

1. **Search Tabs** (`search-tabs`): Search currently open tabs in Comet browser
2. **Search History** (`search-history`): Search browser history with full-text search
3. **Search Comet** (`search-comet`): Unified search across both tabs and history

### Key Capabilities

- **Fast Fuzzy Search**: Powered by Fuse.js for intelligent, forgiving search
- **Smart Prioritization**: Open tabs are prioritized over history results
- **AppleScript Integration**: Direct communication with Comet browser for real-time tab data
- **Database Access**: SQLite-based history search for comprehensive results
- **Rich Actions**: Switch to tabs, open URLs, copy links, create Markdown links

### Actions Available

- **Navigation**: Switch to existing tabs, open URLs in current/new tabs
- **Copy Operations**: Copy URLs, page titles, or create Markdown-formatted links
- **Keyboard Shortcuts**: 
  - `⌘+C` - Copy URL
  - `⌘+⌥+C` - Copy title
  - `⌘+⇧+C` - Copy as Markdown
  - `⌘+N` - Open in new tab
  - `⌘+R` - Refresh results

## Requirements

- macOS 12.0 or later
- Raycast 1.26.0 or later
- Comet browser installed and running
- Node.js 22.14+ for development

## Installation

1. Clone this repository or download the extension
2. Install dependencies: `npm install`
3. Build the extension: `npm run build`
4. Import into Raycast or run in development mode: `npm run dev`

## Technical Implementation

### Browser Integration

1. **AppleScript Primary**: Uses AppleScript for real-time tab data
2. **Database Fallback**: Reads SQLite history database directly
3. **Error Recovery**: Graceful handling of browser not running

### Search Engine

- **Fuse.js Integration**: Fuzzy search with configurable thresholds
- **Smart Weighting**: URLs weighted higher than titles for relevance
- **Multi-field Search**: Searches across titles, URLs, and domains

### Performance Optimizations

- **Real-time Search**: Instant filtering as you type
- **Cached Results**: Uses `@raycast/utils` caching for tabs
- **Efficient Rendering**: Optimized for large datasets
- **Smart Result Ranking**: Tabs prioritized over history

## Project Structure

```
src/
├── commands/           # Main command implementations
├── lib/               # Core functionality (browser integration, search)
├── components/        # UI components
└── hooks/             # React hooks
```

## License

MIT License