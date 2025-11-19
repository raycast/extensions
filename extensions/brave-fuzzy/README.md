# Brave Fuzzy

A powerful Raycast extension for Brave Browser that provides unified search across open tabs, browsing history, and web search engines.

## ✨ Features

### 🔍 **Unified Search Interface**
- Search across open tabs, browser history, and web search engines in a single interface
- Fast, fuzzy search with real-time filtering
- Intelligent search suggestions based on user's preferred search engine

### 🎯 **Smart Tab Management**
- **Tab Focusing**: Select existing tabs to focus them instead of opening duplicates
- **Precise Tab Switching**: Uses AppleScript with window/tab indices for reliable tab navigation
- **Multi-window Support**: Works across all open Brave Browser windows

### 📚 **Browser History Integration**
- Access recent browsing history with visit counts
- **Database Copy Strategy**: Creates local copies of the history database to avoid locking conflicts
- **Automatic Updates**: History copy refreshes every 30 seconds for current data
- **URL Validation**: Ensures proper URL formatting for reliable opening

### 🔧 **Technical Highlights**
- **Robust AppleScript Integration**: Reliable communication with Brave Browser
- **Error Handling**: Graceful fallbacks when browser interactions fail
- **Triple-pipe Parsing**: Handles tab titles containing special characters
- **Australian English**: Follows specified coding style guidelines
- **Structured Logging**: Component::function::level::description format for debugging

## 🚀 Getting Started

### Prerequisites
- [Raycast](https://raycast.com/) installed
- [Brave Browser](https://brave.com/) installed and running
- macOS (required for AppleScript integration)

### Installation
1. Clone this repository
2. Open terminal and navigate to the project directory
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start development mode:
   ```bash
   npm run dev
   ```
5. The extension will appear in Raycast for testing

### Usage
1. Open Raycast (⌘ + Space)
2. Type "Brave Fuzzy" or your configured command
3. Start typing to search across:
   - **Open tabs**: Switch to existing tabs
   - **Browser history**: Open previously visited pages
   - **Web search**: Search using your preferred engine

### Actions
- **Enter**: Primary action (focus tab or open URL)
- **⌘ + N**: Open in new tab (for existing tabs)
- **⌘ + O**: Open with system command (fallback for history items)
- **⌘ + C**: Copy URL to clipboard
- **⌘ + ⇧ + C**: Copy title to clipboard

## 🛠️ Architecture

### Core Components

#### `service.ts`
- **Tab Retrieval**: AppleScript-based tab enumeration across all windows
- **History Management**: SQLite database copying and querying
- **Tab Focusing**: Precise AppleScript commands for tab switching
- **Search Functions**: Filtering and search suggestion generation

#### `brave-search.tsx`
- **UI Components**: Raycast List interface with actions
- **State Management**: React hooks for search and data loading
- **Action Handlers**: Tab focusing and URL opening logic
- **Error Handling**: User feedback via toast notifications

### Key Technical Decisions

#### AppleScript Tab Focusing
Uses the correct syntax: `set active tab index of window X to Y`
- More reliable than object-based approaches
- Works consistently across Brave Browser versions
- Provides immediate visual feedback

#### History Database Strategy
- **Problem**: Main database often locked when browser is running
- **Solution**: Create temporary copies in system temp directory
- **Benefits**: Eliminates SQLite locking errors, maintains data freshness

#### Triple-pipe Delimiter
- **Problem**: Tab titles can contain standard pipe characters
- **Solution**: Use `|||` as delimiter in AppleScript output
- **Benefits**: Reliable parsing of complex tab titles

## 🐛 Troubleshooting

### Common Issues

#### "Database is locked" errors
- **Fixed**: The extension now uses database copies to avoid this issue
- If you see these errors, they indicate the fallback system is working correctly

#### Tab focusing not working
- Ensure Brave Browser is running and accessible
- Check that AppleScript permissions are granted to Raycast
- Try the "Open in New Tab" fallback action

#### History not loading
- The extension will attempt to create a database copy
- If the copy fails initially, it will retry on subsequent loads
- Check console logs for detailed error information

### Debug Logging
The extension uses structured logging in the format:
```
component::function::level::description
```

Enable debug output in Raycast's extension console to troubleshoot issues.

## 🔮 Future Enhancements

- **Bookmark Integration**: Search browser bookmarks
- **Tab Grouping**: Support for Brave's tab groups
- **Keyboard Shortcuts**: Custom shortcuts for common actions
- **Theme Support**: Match Raycast's appearance settings

## 🤝 Contributing

Contributions are welcome! Please ensure:
- Code follows Australian English conventions
- Comments explain complex functionality at a high level
- Logging uses the specified format
- Functional programming paradigms are preferred

## 📄 License

This project is licensed under the MIT License.

---

Built with ❤️ for the Raycast and Brave Browser communities.
