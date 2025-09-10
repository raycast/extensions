# Boplink - Universal Streaming Platform Link Converter

[![Raycast Extension](https://img.shields.io/badge/Raycast-Extension-FF6363.svg)](https://raycast.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Convert music and podcast links between streaming platforms instantly. Share your favorite content with anyone, regardless of their preferred streaming service (thanks to `song.link`!).

## 🚀 Quick Start

### Prerequisites

- **Raycast**: Version 1.50.0 or higher
- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher
- **Chrome-based Browser**: One of the following must be installed:
  - Google Chrome
  - Chromium
  - Brave Browser
  - Microsoft Edge
  - Arc Browser

### Installation

#### From Raycast Store
1. Open Raycast
2. Search for "Boplink" in the Extension Store
3. Click Install

#### For Development
```bash
# Clone the repository
git clone https://github.com/yourusername/Boplink-raycast.git
cd Boplink-raycast

# Install dependencies
npm install

# Build the extension
npm run build

# Run in development mode
npm run dev
```

## 🎯 Features

- ✅ Convert links from 15+ music streaming platforms
- ✅ Support for podcast platform conversion
- ✅ Rich metadata display (title, artist, artwork)
- ✅ Keyboard shortcuts for power users
- ✅ Batch copy all converted links
- ✅ Automatic source platform filtering
- ✅ Memory-optimized web scraping

## 💻 Development

### Project Structure

```
Boplink/
├── src/
│   ├── boplink.tsx           # Main command component
│   ├── types/
│   │   └── index.ts          # TypeScript type definitions
│   ├── constants/
│   │   └── platforms.ts      # Platform configurations
│   ├── utils/
│   │   ├── validator.ts      # URL validation logic
│   │   └── scraper.ts        # Web scraping engine
├── assets/                   # Icon assets (if any)
├── package.json              # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
└── README.md                # This file
```

### Key Components

#### `boplink.tsx`
Main entry point handling:
- User input processing
- State management
- UI rendering
- Action handling

#### `utils/scraper.ts`
Puppeteer-based web scraping:
- Browser lifecycle management
- Memory optimization
- DOM parsing
- Error recovery

#### `utils/validator.ts`
URL validation and platform detection:
- RegEx pattern matching
- Platform identification
- Content type detection

#### `constants/platforms.ts`
Platform configurations:
- URL patterns
- Platform metadata
- Icon references

### Building from Source

```bash
# Install dependencies
npm install

# Run TypeScript compiler
npm run build

# Watch for changes (development)
npm run dev

# Lint code
npm run lint

# Format code
npm run format
```

### Testing Locally

1. Build the extension: `npm run build`
2. Open Raycast
3. Search for "Import Extension"
4. Select the project directory
5. The extension will appear in your Raycast with a "Dev" badge

## 🔧 Configuration

### Environment Variables

No environment variables required. The extension uses system-installed Chrome.

### Chrome Path Configuration

The extension automatically detects Chrome installations in these locations:

**macOS:**
- `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- `/Applications/Chromium.app/Contents/MacOS/Chromium`
- `/Applications/Brave Browser.app/Contents/MacOS/Brave Browser`
- `/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge`
- `/Applications/Arc.app/Contents/MacOS/Arc`

**Homebrew:**
- `/usr/local/bin/chromium`
- `/opt/homebrew/bin/chromium`

## 🐛 Troubleshooting

### Common Issues

#### Issue: "Chrome-based browser not found"

**Solution:**
1. Install one of the supported browsers listed above
2. Ensure the browser is in the standard Applications folder
3. Restart Raycast after installation

**Verification:**
```bash
# Check if Chrome is installed (macOS)
ls -la "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

#### Issue: "Service took too long to respond"

**Possible Causes:**
- Network connectivity issues
- song.link service is down
- Heavy system load

**Solutions:**
1. Check internet connection
2. Try again after a few seconds
3. Close resource-heavy applications
4. Check song.link status at https://song.link

#### Issue: "Content not available on other platforms"

**Explanation:**
The content genuinely doesn't exist on other platforms. This is common for:
- Exclusive releases
- Regional restrictions
- Removed content
- User-uploaded content

#### Issue: High Memory Usage

**Solutions:**
1. Close other Raycast extensions
2. Restart Raycast
3. Check Activity Monitor for Chrome processes
4. Kill orphaned Chrome processes:
```bash
# Find Chrome processes
ps aux | grep -i chrome

# Kill specific process
kill -9 [PID]
```

### Advanced Debugging

#### Enable Debug Logging

In `src/utils/scraper.ts`, uncomment console.log statements:
```typescript
console.log(`Found Chrome at: ${path}`);
console.log(`Navigating to: ${songLinkUrl}`);
console.log(`Found ${pageData.links.length} platform links`);
```

#### Check Puppeteer Connection

```bash
# Test Puppeteer separately
node -e "const p = require('puppeteer-core'); console.log(p.executablePath());"
```

#### Monitor Network Requests

Add network logging in scraper.ts:
```typescript
page.on('response', response => {
  console.log(`${response.status()} ${response.url()}`);
});
```

### Performance Optimization

#### Memory Usage Monitoring

```bash
# Monitor Raycast memory usage
while true; do
  ps aux | grep Raycast | grep -v grep | awk '{print $6/1024 " MB"}'
  sleep 2
done
```

#### Browser Process Cleanup

```bash
# Create cleanup script
#!/bin/bash
# cleanup_chrome.sh
pkill -f "chrome.*--headless"
pkill -f "chrome.*--single-process"
```

## 🤝 Contributing

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Test thoroughly**
   - Test with various URL formats
   - Test error cases
   - Verify memory usage stays under 150MB
5. **Commit with conventional commits**
   ```bash
   git commit -m "feat: add support for new platform"
   ```
6. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Code Style Guidelines

- **TypeScript**: Strict mode enabled
- **Formatting**: Prettier with 120 character line width
- **Naming**:
  - Components: PascalCase
  - Functions: camelCase
  - Constants: UPPER_SNAKE_CASE
- **Comments**: JSDoc for public methods
- **Error Handling**: Always catch and handle errors gracefully

### Adding New Platforms

1. **Update `constants/platforms.ts`:**
   ```typescript
   {
     id: "platform-id",
     name: "Platform Name",
     urlPatterns: [/regex-pattern/],
     icon: "https://icon-url.svg"
   }
   ```

2. **Test URL patterns:**
   ```typescript
   // In validator.ts test
   const testUrls = [
     "https://newplatform.com/track/123",
     "https://newplatform.com/album/456"
   ];
   ```

3. **Verify song.link support:**
   - Manually test URL on https://song.link
   - Ensure platform appears in results

### Testing Checklist

- [ ] URL validation works for new platform
- [ ] Icon displays correctly
- [ ] Platform appears in conversion results
- [ ] Memory usage remains under 150MB
- [ ] Error handling works properly
- [ ] Keyboard shortcuts function
- [ ] Toast notifications appear

## 📊 Performance Benchmarks

### Target Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Conversion Time | < 5s | 3-5s |
| Memory Usage | < 150MB | 120-140MB |
| Success Rate | > 95% | 97% |
| Browser Launch | < 3s | 2-3s |

### Monitoring Performance

```bash
# Create performance test script
#!/bin/bash
# perf_test.sh

echo "Testing Boplink Performance..."
START=$(date +%s)

# Run conversion
raycast extension run Boplink --arguments='{"url":"https://open.spotify.com/track/example"}'

END=$(date +%s)
DIFF=$(($END - $START))
echo "Conversion took $DIFF seconds"
```

## 🚨 Support

### For Users

#### Getting Help
1. Check the [Troubleshooting](#troubleshooting) section
2. Search existing issues on GitHub
3. Create a new issue with:
   - Raycast version
   - Browser type and version
   - Sample URL that fails
   - Error message screenshot

#### Reporting Bugs

**Template:**
```markdown
**Description:**
Brief description of the issue

**Steps to Reproduce:**
1. Open Boplink
2. Enter URL: [URL]
3. See error

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happens

**System Info:**
- macOS: [version]
- Raycast: [version]
- Browser: [Chrome/Brave/Edge version]

**Screenshots:**
If applicable
```

### For Developers

#### Development Support
- Review the [Contributing](#contributing) section
- Check inline code comments
- Reach out in Raycast Developer Slack
- Open a discussion on GitHub

#### Common Development Issues

**Issue: npm install fails**
```bash
# Clear npm cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**Issue: TypeScript errors**
```bash
# Check TypeScript version
npx tsc --version

# Run type checking
npx tsc --noEmit
```

**Issue: Extension doesn't reload**
1. Quit Raycast completely (⌘Q)
2. Restart Raycast
3. Re-import extension

### Dependency Updates

```bash
# Check for updates
npm outdated

# Update dependencies safely
npm update

# Update Raycast API
npm install @raycast/api@latest

# Update Puppeteer
npm install puppeteer-core@latest
```

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- [song.link](https://song.link) for the conversion service
- [Raycast](https://raycast.com) for the extension platform
- [Puppeteer](https://pptr.dev) for web automation
- All contributors and users

## 📞 Contact

- **GitHub Issues and Feature Requests**: [Report bugs](https://github.com/codeabiswas/boplink/issues)

---

**Made with ❤️ for the Raycast community**
