# Changelog

## [Initial Version] - {PR_MERGE_DATE}

### Added

- **Markdown Preview** - Render Markdown content with full formatting support
- **Mermaid Diagram Preview** - Render Mermaid diagrams via mermaid.ink API
- **Embedded Mermaid Support** - Automatically convert ` ```mermaid ` code blocks in Markdown to rendered diagrams
- **Auto Detection** - Automatically detect content type (Markdown/Mermaid) based on input
- **Type Mismatch Warning** - Show warning when selected type doesn't match detected content
- **Clipboard Integration** - Paste from clipboard with `Cmd+Shift+V` and auto-detect type
- **Quick Type Switch** - Switch content type with `Cmd+T` when mismatch is detected
- **Dark Theme** - Custom dark theme optimized for Raycast UI
  - Blue nodes (#3b82f6)
  - White text (#ffffff)
  - Dark background (#1a1a1a)

### Technical

- Built with Raycast API and React
- Mermaid rendering via mermaid.ink external service
- Base64 URL-safe encoding for diagram URLs
