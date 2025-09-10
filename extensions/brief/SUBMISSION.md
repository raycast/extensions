# Brief - Raycast Extension Submission

## Extension Details

**Name**: Brief  
**Author**: densign01  
**Category**: Productivity, Web  
**Description**: Capture and email article summaries with AI  

## Features

- 📱 Quick article capture from any supported browser
- 🧠 AI-powered summaries (short/long format)
- ⚙️ Configurable preferences (email, API endpoint)
- 🌐 Multi-browser support (Safari, Chrome, Edge, Arc)

## Commands

1. **Brief** - Capture current browser article and send via email

## Installation Requirements

- macOS with supported browser
- User's email address for receiving articles
- Brief API endpoint (defaults to hosted version)

## How to Submit to Raycast Store

### Method 1: Developer Portal
1. Go to https://developers.raycast.com/
2. Sign in with GitHub account: densign01
3. Submit extension manually

### Method 2: GitHub PR
1. Fork https://github.com/raycast/extensions
2. Add Brief extension to the repository
3. Submit pull request

### Method 3: Contact Raycast
- Email: developers@raycast.com
- Include this repository: https://github.com/densign01/quickcapture

## Repository Structure
```
raycast-extension/
├── package.json          # Extension metadata
├── src/
│   ├── capture-article.tsx   # Main command
│   └── utils/
│       └── browser.ts        # Browser integration
├── assets/
│   └── command-icon.png      # Extension icon
└── README.md             # Documentation
```

## Testing
The extension has been tested locally and passes all Raycast validation:
- ✅ Package.json validation
- ✅ Icon validation  
- ✅ ESLint checks
- ✅ Prettier formatting
- ✅ TypeScript compilation

Ready for publication!