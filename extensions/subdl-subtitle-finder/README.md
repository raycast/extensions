# SubDL Subtitle Finder - Raycast Extension

<div align="center">

![SubDL Subtitle Finder Raycast Extension](assets/extension-icon.png)

**A powerful Raycast extension for searching and downloading Arabic and international subtitles from SubDL**

[![Raycast Store](https://img.shields.io/badge/Raycast-Store-red)](https://www.raycast.com/sal2049/subdl-subtitle-finder)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Configuration](#-configuration)

</div>

## ✨ Features

### 🔍 Smart Search Experience
- **Auto-suggestions**: Instant suggestions as you type (2+ characters)
- **Popular content database**: Quick access to 60+ trending movies and TV shows
- **Real-time search**: Comprehensive subtitle search across SubDL's database
- **Debounced search**: Optimized performance with intelligent search delays

### 🌍 Multi-language Support
Support for 11 languages with visual country flags:

🇸🇦 Arabic • 🇺🇸 English • 🇫🇷 French • 🇪🇸 Spanish • 🇩🇪 German • 🇮🇹 Italian • 🇵🇹 Portuguese • 🇷🇺 Russian • 🇯🇵 Japanese • 🇰🇷 Korean • 🇨🇳 Chinese

### 📺 Advanced Filtering
- **Separate Language & Quality Filters**: Clean, intuitive filter interface
- **Language Filter**: Dropdown in search bar with country flag emojis
- **Quality Filter**: Action panel submenu with 4K/2160p, 1080p/Blu-ray, 720p/HD, 480p/DVD, 360p/SD
- **Smart parsing**: Automatic quality detection from release names
- **Instant filtering**: Real-time results as you select filters
- **Keyboard shortcuts**: Cmd+R (clear filters), Cmd+Shift+R (refresh)

### 💾 Flexible Download Options
- **Direct download**: Save to Downloads or custom directory
- **Copy link**: Quick clipboard access to download URLs
- **Multiple formats**: Support for various subtitle file formats
- **Batch operations**: Handle multiple downloads efficiently

### 🎬 Rich Movie Information (TMDB-Style)
- **High-quality movie posters**: Displayed directly in search results
- **Comprehensive details**: IMDb ratings, Metascore, runtime with emoji indicators
- **Structured movie view**: Organized sections for overview, production, ratings
- **Interactive actions**: Copy IMDb links, view full details
- **Professional presentation**: TMDB-inspired interface design

## 🚀 Installation

### From Raycast Store
1. Open Raycast (⌘ + Space)
2. Search for "SubDL Subtitle Finder" or visit the [Raycast Store](https://www.raycast.com/sal2049/subdl-subtitle-finder)
3. Click "Install Extension"
4. Configure your SubDL API key in preferences

### Development Setup
```bash
# Clone the repository
git clone https://github.com/sal2049/subdl-subtitle-finder-raycast.git
cd subdl-subtitle-finder-raycast

# Install dependencies
npm install

# Start development mode
npm run dev
```

## ⚙️ Configuration

Access preferences via: **Raycast Preferences → Extensions → SubDL Subtitle Finder**

| Setting | Description | Required |
|---------|-------------|----------|
| **SubDL API Key** | Your API key from [SubDL.com](https://subdl.com/) | ✅ Yes |
| **Default Language** | Preferred subtitle language | ❌ Optional |
| **Download Directory** | Custom download location | ❌ Optional |
| **Show Movie Info** | Enable movie posters and details | ❌ Optional |
| **OMDb API Key** | Enhanced movie information | ❌ Optional |

### Getting API Keys
1. **SubDL API Key** (Required): Register at [SubDL.com](https://subdl.com/) for free
2. **OMDb API Key** (Optional): Get enhanced movie data at [OMDb API](http://www.omdbapi.com/)

## 📖 Usage

### Quick Start
1. **Open Raycast**: ⌘ + Space
2. **Search**: Type "Search Subtitles" or "sub"
3. **Enter query**: Movie or TV show name
4. **Browse results**: With language flags and quality indicators
5. **Download**: ⌘ + Enter or copy link with ⌘ + C

### Pro Tips
- **Specific searches**: Include year for accuracy (e.g., "Inception 2010")
- **Quality matching**: Use quality filters that match your video file format
- **Filter combinations**: Combine language + quality for precise results
- **Popular content**: Browse trending suggestions for quick access
- **Keyboard shortcuts**: 
  - ⌘ + Enter (download subtitle)
  - ⌘ + C (copy download link)
  - ⌘ + R (clear all filters)
  - ⌘ + Shift + R (refresh search)

## 🛠️ Technical Stack

- **Framework**: TypeScript + Raycast API
- **APIs**: SubDL API, OMDb API
- **Features**: Client-side filtering, debounced search, error handling
- **Performance**: Optimized API calls, cached suggestions, parallel requests

## 📁 Project Structure

```
subdl-subtitle-finder-raycast/
├── src/
│   ├── api.ts                 # API integrations (SubDL, OMDb)
│   ├── search-subtitles.tsx   # Main search interface
│   ├── components/
│   │   └── SubtitleItem.tsx   # Subtitle result component
│   └── utils/
│       └── show-info.ts       # Movie information utilities
├── assets/
│   ├── extension-icon.png     # Raycast extension icon
│   └── extension-icon-backup.png
├── .github/                   # GitHub templates
├── README.md                  # This file
├── CHANGELOG.md              # Version history
├── CONTRIBUTING.md           # Contribution guidelines
├── LICENSE                   # MIT License
└── package.json              # Raycast extension metadata
```

## 🧪 Development Commands

```bash
npm run dev        # Start development mode
npm run build      # Build for production
npm run lint       # Check code quality
npm run fix-lint   # Auto-fix linting issues
npm run publish    # Publish to Raycast Store
```

## 🐛 Troubleshooting

<details>
<summary><strong>Common Issues & Solutions</strong></summary>

**API Key Issues**
- Verify SubDL API key in extension preferences
- Check API key validity at SubDL dashboard

**No Results Found**
- Try alternative search terms or include release year
- Verify language filter settings
- Check if content exists on SubDL

**Download Problems**
- Confirm download directory permissions
- Ensure stable internet connection
- Verify sufficient disk space

**Missing Movie Info**
- Check if movie info is enabled in preferences
- Verify OMDb API key (if using enhanced features)
- Some titles may have limited metadata

</details>

## 📈 Roadmap

- [ ] Batch download functionality
- [ ] Custom subtitle format preferences
- [ ] Integration with popular media players
- [ ] Advanced search filters (year, genre, etc.)
- [ ] Subtitle preview before download

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **[SubDL](https://subdl.com/)** - Comprehensive subtitle database
- **[OMDb API](http://www.omdbapi.com/)** - Movie information and metadata
- **[Raycast](https://raycast.com/)** - Powerful extension platform
- **Community** - Users and contributors who make this project better

---

<div align="center">
<strong>Built with ❤️ for the Raycast community</strong>
</div>