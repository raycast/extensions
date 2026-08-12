# theSVG Raycast Extension Changelog

## [1.1.0] - 2026-04-12

### Fixed

- Resolved 404 API error caused by static export migration (switched to static JSON + direct SVG fetching)

### Added

- Copy as JSX React component (`Cmd+Shift+J`)
- Copy as HTML `<img>` tag (`Cmd+Shift+H`)
- Copy as Data URI for inline embedding (`Cmd+Shift+D`)
- Copy hex brand color (`Cmd+Shift+X`)
- Alias-based search (e.g. search "Toutiao" finds "Jinritoutiao")

### Updated

- Icon count updated to 5,600+ (from 4,000+)
- Category count updated to 100+ (from 56)
- Client-side search and filtering with registry caching

## [Initial Version] - 2026-03-09

- Search 4,000+ brand SVG icons with category filtering
- Copy SVG markup to clipboard with one shortcut
- Quick copy command (no-view) for instant access
- Preview icon details with variant list and SVG source
- Copy CDN and jsDelivr URLs
- Configurable default variant (brand color, mono, light, dark)
