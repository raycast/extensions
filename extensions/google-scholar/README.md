# Google Scholar Search for Raycast

A streamlined Raycast extension for searching Google Scholar academic articles and research papers. Built with compliance and simplicity in mind.

## 🔍 Overview

This extension provides a clean, efficient interface to search Google Scholar directly from Raycast. Instead of web scraping, it constructs proper Google Scholar search URLs and opens them in your browser, ensuring full compliance while maintaining excellent usability.

## ✨ Features

### 🎯 **Advanced Search Interface**
- **Multiple search fields** - All words, exact phrases, at least one word, without words
- **Author search** - Find papers by specific researchers
- **Publication filtering** - Search within specific journals or conferences
- **Smart year filtering** - Only available when relevant (disabled for newest-first sorting)
- **Word occurrence targeting** - Search in titles only or anywhere in articles

### 📊 **Intelligent Sorting**
- **Relevance-based** - Google Scholar's default ranking with year filtering
- **Date-based** - Newest articles first (year filtering automatically disabled for logical consistency)

### 💾 **Search History**
- **Recent searches** - Keeps track of your last 10 searches
- **Quick display** - Shows 5 most recent searches in the form
- **Smart formatting** - Displays search terms, authors, and year ranges clearly

### 🚀 **Seamless Integration**
- **Direct browser opening** - Results open in your default browser
- **Google Scholar integration** - Quick access to main Google Scholar page
- **Keyboard shortcuts** - Efficient navigation with `Cmd+O` for Google Scholar

## 🛡️ Compliance & Privacy

### **Terms of Service Compliant**
- ✅ **No web scraping** - Respects Google Scholar's robots.txt and ToS
- ✅ **Official URLs** - Uses Google Scholar's documented search parameters
- ✅ **Browser-based** - All interactions happen through your browser, not automated requests

### **Privacy Focused**
- ✅ **Local storage only** - Search history stored locally on your device
- ✅ **No data collection** - No analytics, tracking, or external data transmission
- ✅ **No API keys required** - No third-party services or accounts needed

## 🚀 Installation

1. Open Raycast
2. Go to Extensions
3. Search for "Google Scholar"
4. Install and start searching!

## 📖 Usage

1. **Launch the extension** - Type "Search Articles" in Raycast
2. **Fill search criteria** - Add any combination of search terms
3. **Choose sorting** - Relevance (with optional year filter) or newest first
4. **Submit** - Extension opens Google Scholar with your search in the browser
5. **Review results** - Browse and access papers directly on Google Scholar

### Example Searches

**Machine Learning Research:**
- All Words: `machine learning`
- Publication: `ICML OR NeurIPS OR ICLR`
- From Year: `2022`

**Specific Author Work:**
- Author: `Geoffrey Hinton`
- Exact Phrase: `deep learning`
- Sort: `Date (newest first)`

**Targeted Topic Search:**
- All Words: `neural networks`
- Without Words: `survey review`
- Where: `In the title`

## 🔧 Technical Details

### **Search URL Construction**
The extension builds proper Google Scholar URLs using documented parameters:
- `as_q` - All words
- `as_epq` - Exact phrase
- `as_oq` - At least one word
- `as_eq` - Without words
- `as_sauthors` - Author
- `as_publication` - Publication
- `as_ylo/as_yhi` - Year range
- `scisbd` - Sort order

### **Smart Form Logic**
- Year filtering only appears when sort is set to "Relevance"
- Prevents illogical combinations (newest articles + year restrictions)
- Dynamic form updates based on user selections

## 📋 Requirements

- Raycast (latest version recommended)
- Default web browser
- Internet connection

## 🤝 Contributing

This extension is designed to be simple and compliant. If you have suggestions for improvements that maintain these principles:

1. Fork the repository
2. Make your changes
3. Submit a pull request

## 🆘 Support

For issues or questions:
- Check that your search has at least one field filled
- Ensure your default browser can access Google Scholar
- Try simpler search terms if you get no results

## 🎯 Why This Approach?

This extension was redesigned to prioritize **compliance** and **sustainability**:

- **Respectful** - Follows Google Scholar's intended usage patterns
- **Reliable** - Won't break due to anti-scraping measures
- **Fast** - No API calls or data processing delays
- **Transparent** - You see exactly what Google Scholar shows
- **Future-proof** - Works with Google Scholar's official interface

By opening searches in your browser, you get the full Google Scholar experience with all its features, while the extension provides the convenience of advanced search construction from Raycast.

---

**Made with ❤️ for the research community**