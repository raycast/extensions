# Rust Documentation Changelog

## [Fix Duplicate Search Results] - 2026-06-23

- Removed duplicate results for Rust items re-exported across `std`, `core`, and `alloc`
- Reduced startup memory usage while building the Rust documentation search index
- Improved reliability of saved favorites and recent search history
- Removed deprecated `node-fetch` usage to avoid `punycode` deprecation warnings

## [Initial Version] - 2026-01-07

Initial release of the Rust Documentation extension.

### Features

- Search across Rust Standard Library (`std`, `core`, and `alloc` crates)
- Smart search ranking with exact and prefix match prioritization
- Color-coded icons for different Rust types (structs, enums, traits, functions, etc.)
- Inline documentation viewing with formatted Markdown
- Quick actions to copy paths, URLs, or open in browser
- Support for all major Rust documentation types (structs, enums, functions, traits, macros, modules, keywords, primitives, unions, constants, type aliases, attributes, and derive macros)
