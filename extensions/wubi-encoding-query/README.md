# Raycast Wubi Encoding Query Extension

An efficient Raycast extension for quickly querying Wubi encoding and character decomposition diagrams of Chinese characters.

## 🎯 Features

- ⚡ **Fast Query**: 300ms response time with real-time search
- 🔍 **Batch Query**: Query multiple Chinese characters at once (e.g., "Wubi encoding")
- 📋 **Quick Copy**: One-click copy of Wubi 86/98 encodings to clipboard
- 🖼️ **Smart Caching**: Automatically download and cache decomposition diagrams for faster access
- 📱 **Modern Interface**: Elegant list + detail view design
- 🎵 **Complete Information**: Display encoding, short codes, pinyin, and stroke count

## 🚀 Installation

### Method 1: Clone Repository (Recommended)
```bash
git clone https://github.com/0xlane/raycast_wubi.git
cd raycast_wubi
npm install
npm run dev
```

### Method 2: Download ZIP
1. Download the project ZIP file to your local machine
2. Extract to any directory
3. Open terminal and run:
   ```bash
   cd raycast_wubi
   npm install
   npm run dev
   ```

## 💡 Usage Tips

### How to Use

1. **Plugin Interface Query**:
   - Search for `Wubi` or `五笔` in Raycast to find the extension
   - Open the extension and enter Chinese characters to search
   - Supports auto search (after 300ms) or press Enter for immediate search

2. **Batch Query**:
   ```
   Input: 程序员  →  Display encodings for 3 characters
   ```

### Usage Tips
- Search for `Wubi` or `五笔` in Raycast to quickly find the extension
- Supports Chinese keyword search, enter `五笔编码` to find the extension
- Support querying multiple Chinese characters simultaneously

### Feature Operations
- **View Details**: Click any character to view complete encoding information and decomposition diagram
- **Quick Copy**: Directly copy encodings from the list, supports Wubi 86 and 98 versions
- **View Decomposition**: View decomposition diagram in detail page or open in browser

## 📊 Feature Demo

### Query Results Interface
```
┌─────────────────────────────────────────────┐
│ [Search: Enter Chinese characters to query...] │
├─────────────────────────────────────────────┤
│ Found 4 results                             │
│                                             │
│ 五    4 strokes   [gggh] [♪wǔ]            │
│ 笔    6 strokes   [thln] [♪bǐ]            │  
│ 编    15 strokes  [xyna] [98:xynw] [♪biān] │
│ 码    8 strokes   [dmjc] [♪mǎ]            │
└─────────────────────────────────────────────┘
```

## 🛠️ Development

### Tech Stack
- **TypeScript** - Type-safe JavaScript
- **React** - User interface library
- **Raycast API** - Extension development framework
- **Node.js** - Runtime environment

### Project Structure
```
raycast_wubi/
├── package.json          # Extension configuration and dependencies
├── src/
│   ├── search-wubi.tsx   # Main interface component
│   ├── api.ts            # API service
│   ├── imageCache.ts     # Image cache management
│   └── types.ts          # TypeScript type definitions
└── assets/
    └── logo.png          # Extension icon
```

### Development Commands
```bash
npm run dev        # Development mode (hot reload)
npm run build      # Build extension
npm run lint       # Code linting
npm run fix-lint   # Fix code formatting
```

## 🌐 API Information

This extension uses the Wubi encoding query API provided by [iamwawa.cn](https://www.iamwawa.cn).

- **Encoding Query**: Supports Wubi 86 and 98 versions
- **Decomposition Diagrams**: Provides character decomposition illustrations
- **Complete Information**: Includes pinyin, stroke count and other detailed information

## 🤝 Contributing

Welcome to submit Issues and Pull Requests!

1. Fork this repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add some amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Submit Pull Request

## 📄 License

This project is open source under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Raycast](https://raycast.com) - Providing excellent extension development platform
- [iamwawa.cn](https://www.iamwawa.cn) - Providing Wubi encoding query API
- All contributors and users for their support

---

If this extension helps you, please give it a ⭐ Star!
