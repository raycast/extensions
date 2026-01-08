# Eurobuch Search for Raycast

> Search and compare book prices across multiple European platforms

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Raycast](https://img.shields.io/badge/Raycast-Extension-red.svg)](https://raycast.com)

## Features

- 🔍 **Smart Search** - Search by ISBN, author, or title
- 💰 **Price Comparison** - Compare prices from multiple European book platforms
- 🚚 **Total Cost** - See price + shipping costs at a glance
- ⚡ **Quick Access** - Auto-fill from clipboard or selected text
- 📊 **Price Trends** - Direct link to Eurobuch's price history
- 🔄 **ISBN Conversion** - Automatic ISBN-10 to ISBN-13 conversion
- 🎯 **Smart Sorting** - Results sorted by best total price

## Installation

### From Raycast Store (recommended)

1. Open Raycast
2. Search for "Eurobuch Search"
3. Click Install

### Manual Installation

```bash
git clone https://github.com/wdeu/eurobuch-search.git
cd eurobuch-search
npm install
npm run dev
```

## Quick Start

The extension works immediately with test credentials (`test`/`test`).

### Basic Usage

1. Open Raycast (`⌘ Space`)
2. Type "Search Books"
3. Enter ISBN, title, or author
4. Browse results sorted by price

### Pro Tips

**Fastest workflow:**
- Double-click an ISBN on any website
- Open Raycast → "Search Books"
- ISBN is automatically filled in ✨

**Alternative:**
- Copy ISBN to clipboard
- Open extension
- ISBN is auto-detected

## Configuration

Open Raycast Preferences → Extensions → Eurobuch Search

### Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Platform ID | `test` | Your Eurobuch platform identifier |
| Password | `test` | Your Eurobuch API password |
| Result Limit | `10` | Number of results (10, 20, or 30) |

### Get Your Own Credentials

For full access to all book platforms:

1. Visit [eurobuch.de](https://www.eurobuch.de)
2. Contact support for API access
3. Replace test credentials with your own

**Note:** Test credentials provide limited results but work immediately.

## Keyboard Shortcuts

| Action | Shortcut | Description |
|--------|----------|-------------|
| Open Eurobuch Overview | `Enter` | Price trends & all offers |
| Open Direct Offer | `⌘ O` | Jump to dealer's website |
| Copy Link | `⌘ C` | Copy offer URL |
| Copy ISBN | `⌘ I` | Copy book ISBN |
| Copy All Details | `⌘ ⇧ C` | Copy complete info |
| Show Actions | `⌘ K` | Actions menu |

## How It Works

### Smart ISBN Detection

The extension automatically:
- Reads selected text (highlighted ISBN)
- Checks clipboard for ISBN
- Converts ISBN-10 to ISBN-13
- Validates ISBN format

### Search Process

1. Extension queries Eurobuch API
2. Results are parsed and sorted
3. Cached for performance
4. Displayed with price + shipping

### Two Ways to View Offers

**API Results (Quick):**
- Shows 2-10 best offers
- Fast, direct access
- Sorted by price

**Eurobuch Website (Complete):**
- Shows all 35+ offers
- Price trends & history
- Press `Enter` on any result

## Examples

### Search by ISBN
```
9781068525728
or
1068525728X (auto-converts to ISBN-13)
```

### Search by Title
```
Harry Potter
Thinking Fast and Slow
```

### Search by Author
```
Rowling
Kahneman
```

## Development

### Prerequisites

- Node.js 18+
- Raycast app

### Setup

```bash
# Clone repository
git clone https://github.com/wdeu/eurobuch-search.git
cd eurobuch-search

# Install dependencies
npm install

# Run in development
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Project Structure

```
eurobuch-search/
├── src/
│   ├── __tests__/          # Test files
│   │   └── eurobuch-search.test.ts
│   └── eurobuch-search.tsx # Main extension
├── assets/
│   └── extension-icon.png  # Extension icon
├── metadata/               # Store screenshots
├── README.md
├── CHANGELOG.md
├── CONTRIBUTING.md
└── package.json
```

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Code Quality

```bash
# Lint code
npm run lint

# Auto-fix issues
npm run fix-lint
```

## Troubleshooting

### No Results Found

- Try the Eurobuch website link (press `Enter`)
- Check spelling of title/author
- Verify ISBN is correct
- Test credentials have limited access

### Search is Slow

- First search builds cache (slower)
- Subsequent searches are faster
- Check internet connection

### ISBN Not Recognized

- Ensure ISBN is 10 or 13 digits
- Remove any extra characters
- Try both ISBN-10 and ISBN-13 formats

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Quick Links

- [Report a Bug](https://github.com/wdeu/eurobuch-search/issues)
- [Request a Feature](https://github.com/wdeu/eurobuch-search/issues)
- [View Changelog](CHANGELOG.md)

## Roadmap

- [ ] Filter by book condition
- [ ] Sort options (title, author, platform)
- [ ] Save favorite searches
- [ ] Export results to CSV
- [ ] Multi-currency support
- [ ] Price alerts

## Credits

- **API**: [Eurobuch.de](https://www.eurobuch.de)
- **Platform**: [Raycast](https://www.raycast.com)
- **Author**: [wdeu](https://github.com/wdeu)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📧 [Open an Issue](https://github.com/wdeu/eurobuch-search/issues)
- 💬 [Discussions](https://github.com/wdeu/eurobuch-search/discussions)
- ⭐ Star the project if you find it useful!

---

Made with ❤️ for the Raycast community