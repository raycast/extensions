# Rust Documentation

Search and browse the Rust Standard Library documentation directly from Raycast.

## How to Use

1. Open Raycast and type "Search Standard Library" or just start typing to search
2. Search for any Rust item (functions, structs, traits, macros, etc.)
3. Press `↵` to view detailed documentation with formatted Markdown
4. Available actions:
   - View full documentation inline
   - Open in browser
   - Copy item path or URL

## What's Included

Search across the entire Rust Standard Library:
- **std** - Standard library items
- **core** - Core library primitives  
- **alloc** - Allocation and collections

## Features

- **Smart Search** - Results ranked by relevance with exact and prefix matches prioritized
- **Visual Type Indicators** - Color-coded icons for different types:
  - Structs (Blue) • Enums (Orange) • Functions (Green)
  - Traits (Magenta) • Macros (Purple) • Modules (Yellow)
  - Plus: primitives, constants, keywords, type aliases, unions, and more
- **Inline Docs** - Read formatted documentation without leaving Raycast
- **Fast & Cached** - Documentation is cached for instant subsequent searches

## No Setup Required

This extension works out of the box. Just install and start searching!

---

## For Developers

### Contributing

Contributions welcome! See the [GitHub repository](https://github.com/patrick-ehimen/raycast-rust-extension) to submit issues or pull requests.

### Technical Details

- Fetches docs from official Rust documentation (doc.rust-lang.org)
- Parses HTML with Cheerio and converts to Markdown
- Uses Raycast's caching API for performance
- Built with TypeScript and React

---

MIT License • Built with ❤️ for the Rust community
