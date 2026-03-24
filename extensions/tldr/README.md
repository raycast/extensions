# TLDR Pages

A Raycast extension for searching and viewing TLDR command cheatsheets.

## About

This extension provides quick access to [TLDR pages](https://tldr.sh/) - a collection of simplified and community-driven man pages. TLDR pages are a community effort to simplify the beloved man pages with practical examples.

## Features

### 🔍 Search TLDR Pages

- Search across all TLDR command pages
- **Platform dropdown filter** - quickly filter by platform (All, common, linux, osx, etc.)
- **Progress indicators** - visual progress icons during cache loading
- Smart caching with 7-day expiration
- View command examples and descriptions
- Copy commands directly to clipboard
- Platform-specific variants support
- Multi-language support (13+ languages)
- Real-time platform counts in dropdown

## How It Works

This extension uses the **GitHub API approach** for fetching TLDR pages:

1. **Fetches from GitHub Contents API** to list all pages
2. **Downloads individual pages** from GitHub's raw content
3. **Caches locally** using Raycast's LocalStorage
4. **Progressive loading** - uses cached data while updating

### Advantages

- ✅ No large downloads - only fetches what you need
- ✅ Always fresh content from main branch
- ✅ Fast global CDN delivery
- ✅ Full language support
- ✅ Offline-capable with smart caching

## Installation

Install the extension from the [Raycast Store](https://www.raycast.com/pomdtr/tldr) or build it locally:

```bash
npm install
npm run dev
```

## Usage

### Search & Filter

1. Open Raycast
2. Search for "Search TLDR Pages"
3. Wait for initial cache build (~30-60 seconds with progress indicators)
4. Use the platform dropdown (⌘P) to filter by platform
5. Type to search commands
6. View examples with platform variants

## Commands

### Search TLDR Pages

Main search interface with platform filtering dropdown.

**Features:**

- **Platform Dropdown** - Filter by platform (⌘P to open dropdown)
- **Progress Icons** - Visual loading indicators during cache updates
- Smart search across all commands and content
- Platform-specific variants
- Quick copy of commands
- Cache management (update/clear)
- Multi-language support

**Keyboard Shortcuts:**

- `⌘P` - Open platform filter dropdown
- `⌘R` - Update cache
- `⌘⇧⌫` - Clear cache
- `⌘C` - Copy command name
- `⌘⇧C` - Copy all content

## Preferences

### Language

Choose from 13+ languages including:

- English (default), Spanish, Portuguese, French, German, Italian
- Japanese, Korean, Chinese, Hindi, Indonesian, Polish, Turkish

### Preferred Platform

Set your default platform when multiple versions exist:

- macOS (osx) - default
- Linux, Windows, Common
- Android, FreeBSD, NetBSD, OpenBSD, SunOS

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Fix linting issues
npm run fix-lint
```
