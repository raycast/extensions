# Project Description

## Rust Documentation - Raycast Extension

A Raycast extension that brings the entire Rust Standard Library documentation to your fingertips. Search and browse Rust docs without leaving your keyboard or opening a browser.

### What is it?

This extension integrates Rust's official documentation (`std`, `core`, and `alloc` crates) directly into Raycast, enabling developers to quickly search for and view documentation for any Rust type, function, trait, macro, or module.

### Key Capabilities

- **Instant Search**: Type to search across thousands of Rust standard library items
- **Smart Ranking**: Results are intelligently ranked, prioritizing exact matches and items that start with your query
- **Rich Visuals**: Each item type (struct, enum, trait, etc.) has a unique color-coded icon for quick identification
- **Detailed Views**: View full documentation with syntax highlighting and formatted Markdown
- **Quick Actions**: Copy paths/URLs or open full documentation in your browser with keyboard shortcuts

### Technical Implementation

- Built with TypeScript and the Raycast API
- Fetches documentation from `doc.rust-lang.org` and caches it for performance
- Uses Cheerio for HTML parsing and converts documentation to Markdown
- Implements intelligent client-side filtering and ranking algorithms
- Supports all major Rust documentation types (structs, enums, functions, traits, macros, modules, etc.)

### Use Cases

- **Quick Reference**: Instantly look up function signatures or trait definitions while coding
- **API Discovery**: Explore the standard library to find the right tool for your task
- **Learning Rust**: Browse documentation as you learn without context switching
- **Offline-First**: Documentation is cached after first load for faster subsequent searches

### Target Audience

Rust developers who use Raycast and want faster access to standard library documentation without interrupting their workflow.
