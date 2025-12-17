# LanguageTool for Raycast ✨

> Instant spelling and grammar correction using LanguageTool API. Get real-time suggestions and improve your text quality in multiple languages.

![Raycast LanguageTool Extension](./assets/extension-icon.png)

## 🚀 Features

- ✅ **Check Text** - Interactive form with detailed results and corrections
- ⚡ **Check Text Instant** - Quick clipboard check and paste (background mode)
- 🌍 **30+ Languages** - Auto-detection or manual selection
- 🎯 **Smart Sorting** - Most used languages appear first (frecency-based)
- 💾 **Persistent Settings** - Your preferred language is remembered
- 🔧 **Advanced Options** - Fine-tune checks with rules, categories, and levels
- 👑 **Premium Support** - Automatic integration with LanguageTool Premium accounts
- 📊 **Detailed Results** - View all issues with suggestions and context
- 🎨 **Modern UI** - Clean interface with Raycast's native components

## 📦 Installation

### From Raycast Store (Recommended)

1. Open Raycast
2. Search for "Store"
3. Find "LanguageTool"
4. Click "Install"

### Manual Installation

```bash
# Clone the repository
git clone https://github.com/raycast/extensions.git
cd extensions/extensions/language-tool

# Install dependencies
npm install

# Development mode
npm run dev

# Build for production
npm run build
```

## 🎯 Usage

### Check Text (Interactive)

1. Open Raycast (⌘Space)
2. Type "Check Text"
3. Select language
4. Type or paste your text
5. Press Enter
6. Review results and apply corrections

**Keyboard Shortcuts:**
- `⌘↵` - Apply all corrections and paste
- `⌘⇧A` - Apply all corrections
- `⌘R` - Reset corrections
- `⌘C` - Copy corrected text

### Check Text Instant (Background)

1. Copy text to clipboard
2. Open Raycast
3. Type "Check Text Instant"
4. ✨ Corrected text is automatically pasted!

Perfect for quick corrections while writing emails, documents, or messages.

## ⚙️ Configuration

### Basic Setup

Open Raycast Settings → Extensions → LanguageTool

**No configuration required** - works out of the box with free API!

### Premium Setup (Optional)

For faster checks and higher limits:

1. Create account at [languagetool.org](https://languagetool.org)
2. Get API key from [Access Tokens](https://languagetool.org/editor/settings/access-tokens)
3. Configure in Raycast:
   - **Username/Email**: your@email.com
   - **API Key**: your-api-key

### Advanced Options

Enable advanced features in settings:

- ☑️ **Show Advanced Options**

Then configure:
- **Check Level**: Default or Picky (stricter for formal text)
- **Mother Tongue**: Native language for false friends detection
- **Preferred Variants**: Language variants (e.g., en-GB, en-US)
- **Rules & Categories**: Enable/disable specific checks

📖 [Read the Advanced Options Guide](./ADVANCED_OPTIONS.md)

## 🌍 Supported Languages

**30+ languages** including:

| Language | Code | Variants |
|----------|------|----------|
| English | `en` | US, GB, CA, AU, NZ, ZA |
| Portuguese | `pt` | BR, PT, AO, MZ |
| Spanish | `es` | ES, AR, MX, and more |
| German | `de` | DE, AT, CH |
| French | `fr` | - |
| Italian | `it` | - |
| Dutch | `nl` | - |
| Russian | `ru` | - |
| Chinese | `zh` | - |
| Japanese | `ja` | - |

And many more! Use `auto` for automatic detection.

## 💡 Tips & Tricks

### 1. Frecency Sorting
Languages you use most frequently automatically appear at the top of the list. No manual sorting needed!

### 2. Keyboard Shortcuts
Learn the shortcuts for faster workflow:
- `⌘↵` to apply all and paste instantly
- Use arrow keys to navigate corrections

### 3. Background Mode
Use "Check Text Instant" for quick corrections without opening UI. Perfect for:
- Quick email fixes
- Social media posts
- Chat messages

### 4. Picky Mode
Enable "Picky" level in advanced options for:
- Academic papers
- Professional emails
- Formal documents
- Business presentations

### 5. False Friends Detection
Set your mother tongue to detect common translation mistakes:
```
Text: "I am embarrassed" (English)
Mother Tongue: Portuguese
→ Detects potential confusion with "embaraçada"
```

## 🏗️ Architecture

```
src/
├── check-text.tsx                # Main command (interactive form)
├── check-text-instant.tsx        # Background command (clipboard)
├── components/                   # React components
│   ├── check-text-result.tsx    # Results screen orchestrator
│   ├── result-metadata.tsx      # Results metadata display
│   └── result-actions.tsx       # Action panel with shortcuts
├── hooks/                        # React hooks
│   └── use-text-corrections.ts  # Corrections state management
├── services/                     # Business logic
│   └── languagetool-api.ts      # API client (Premium support)
├── utils/                        # Pure functions
│   └── text-correction.ts       # Text correction algorithms
├── config/                       # Configuration
│   └── api.ts                   # API endpoints and limits
└── types.ts                     # TypeScript types
```

**Design Principles:**
- ✅ Separation of concerns
- ✅ Pure functions for business logic
- ✅ Reusable hooks and components
- ✅ Type-safe with TypeScript
- ✅ No external API client libraries needed

## 📊 API Limits

### Free Tier
- 20 requests/minute
- 75,000 characters/minute
- 20,000 characters/request

### Premium Tier
- 80 requests/minute
- 300,000 characters/minute
- 60,000 characters/request

💡 Configure your Premium credentials in settings for higher limits!

## 🛠️ Development

```bash
# Install dependencies
npm install

# Development mode (hot reload)
npm run dev

# Type checking
npm run lint

# Build for production
npm run build

# Publish to Raycast Store
npm run publish
```

### Tech Stack
- **Raycast API** - Native Raycast integration
- **React** - UI components
- **TypeScript** - Type safety
- **LanguageTool API** - Grammar checking

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- [LanguageTool](https://languagetool.org) - Amazing open-source grammar checker
- [Raycast](https://raycast.com) - The best launcher for macOS
- All contributors and users of this extension

## 🐛 Issues & Support

Found a bug or have a suggestion?

- 🐛 [Report an issue](https://github.com/raycast/extensions/issues)
- 💬 [Join the Raycast Community](https://raycast.com/community)

## 🔗 Links

- [Raycast Store](https://raycast.com/store)
- [LanguageTool API Docs](https://languagetool.org/http-api/)
- [GitHub Repository](https://github.com/raycast/extensions/tree/main/extensions/language-tool)

---

Made with ❤️ by [lucastaonline](https://github.com/lucastaonline)