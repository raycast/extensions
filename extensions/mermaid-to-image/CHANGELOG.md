# Mermaid to Image Changelog

## [Hybrid Renderer & Raycast Preview Improvements] - 2026-03-10

### Added

- Hybrid renderer selection with `Auto`, `Beautiful`, and `Compatible` modes
- `beautiful-mermaid` integration for supported SVG diagram types
- `Beautiful Theme` preference for `beautiful-mermaid`
- `Custom beautiful-mermaid Path` preference with local-over-bundled resolution
- `Copy SVG Code` action for SVG output
- ASCII preview item for supported `beautiful-mermaid` syntax in the manual result screen
- Quick Look support with `cmd+y` for wide diagrams
- Managed browser bootstrap flow for compatible rendering, stored under Raycast support storage
- Vitest coverage for renderer selection, fallback behavior, SVG preview, and raster strategy

### Changed

- `generateMermaidDiagram()` now returns structured renderer results, including the actual engine used
- SVG preview now uses a dedicated raster pipeline for reliable Raycast rendering
- SVG `Copy Image` now copies a high-resolution raster image that matches the preview instead of copying raw SVG markup
- Manual command execution flow is now separated from view code via `manual-command-service`
- `mmdc` compatible rendering is explicitly Chromium-only; Safari is unsupported
- `beautiful-mermaid` source resolution now prefers custom path, then global npm install, then bundled dependency
- AI tool now uses hybrid rendering, saving SVG for supported syntax and falling back to compatible PNG when needed
- AI tool now fails with an explicit bootstrap instruction when compatible rendering is needed but no browser has been approved yet
- Browser setup prompts now also cover SVG preview and `Copy Image` cases that require browser-backed raster fidelity
- Manual command defaults now favor `SVG + Auto (Hybrid)`
- Preference labels were clarified so `Compatible Theme` and `Compatible Scale` clearly map to `mmdc`-only rendering
- Command input resolution, preview actions, and executable lookup were refactored into smaller internal services
- Compatible rendering now prefers user-installed browsers and otherwise offers a manual `Download Browser` flow instead of requiring a separate shell command
- Development `docs/` content is now local-only and ignored from the publish branch
- README and extension metadata were updated to reflect the hybrid renderer workflow and managed-browser requirements
- README, CHANGELOG, and Raycast metadata now use consistent wording for `beautiful-mermaid`, `Compatible (mmdc)`, browser-backed rasterization, and `Download Browser`

### Improved

- Better preview fidelity for `beautiful-mermaid` SVG output, including colored arrows and clearer supersampled previews
- Better fidelity for `sequenceDiagram` preview and SVG image copy by routing browser-sensitive SVGs away from the macOS raster path
- Better UX for wide diagrams by exposing Quick Look directly from the result screen
- Better terminal-oriented inspection by exposing pure ASCII preview for supported diagrams
- Clearer `mmdc` error messages when Chrome/Chromium is missing
- Higher default compatible raster scale for sharper PNG output and fallback previews
- Full preference coverage for all 15 built-in `beautiful-mermaid` themes
- Documentation updated to note the local-only `docs/` handling and explicit browser compatibility rules
- Added a release checklist covering clean git state, metadata/doc sync, verification commands, and Raycast smoke tests
- Safer operational logging with Mermaid payloads removed from debug output
- Explicit Node development guidance via `.nvmrc` and `engines`

### Fixed

- Fixed blank or raw-text SVG previews inside Raycast
- Fixed dark or incorrect colors in rasterized SVG previews
- Fixed SVG clipboard copies losing arrows or dropping to low resolution
- Fixed tall or narrow `classDiagram` previews being truncated by incorrect thumbnail rasterization
- Fixed bundled `beautiful-mermaid` labels incorrectly showing `vunknown` in ASCII preview metadata
- Removed duplicated SVG raster configuration between image render and copy paths by reusing `renderDefaultSvgPreviewRaster`
- Fixed flowchart `linkStyle` preview and copied image arrowheads by routing custom-marker flowcharts to browser-backed rasterization when the macOS SVG raster path drops colored arrowheads
- Fixed `xychart-beta` preview and copied image colors so the default series line keeps the intended blue fallback
- Fixed `xychart-beta` line preview and copied image output by routing affected line charts to browser-backed rasterization when the macOS SVG raster path drops connecting lines
- Fixed `sequenceDiagram` preview and copied image arrowheads by using browser-backed rasterization when macOS SVG rasterization is known to fail

## [AI Tool Output & Preferences Update] - 2026-01-21

### Added

- Scale preference dropdown for AI-generated images

### Changed

- AI tool response format now returns a minimal success message with a Preview link instead of inline markdown image rendering
- AI tool parameter schema was updated to ensure `mermaidSyntax` is passed correctly
- AI generation uses the user-selected scale with default `2`

## [AI Chat Integration Enhancement] - 2026-01-17

### Added

- Raycast AI tool integration for Mermaid diagram generation
- Permanent storage for AI-generated diagrams in `~/Downloads/MermaidDiagrams/`
- Automatic cleanup of old temporary files for manual mode

### Changed

- Manual mode uses Raycast support storage for temporary files
- AI mode uses persistent files in the Downloads folder
- AI mode renders PNG output for chat-friendly sharing
- Error handling throws explicit errors instead of returning failure strings

## [Add Selected Text Support] - 2025-08-05

### Added

- Selected text support with clipboard fallback
- Input priority: selected text first, clipboard second
- A clipboard-only generation action for apps that do not expose selected text

### Improved

- Better user messaging when input cannot be read
- Better validation for multi-line Mermaid syntax

## [Add Support for AI Extension] - 2024-05-09

### Added

- Background AI tool for Mermaid diagram generation and clipboard copying
- Tool instructions and evals in `package.json`
- Raycast AI integration examples

## [Initial Version] - 2025-03-14

### Added

- Initial Raycast command for converting Mermaid syntax to images
- PNG and SVG output support
- Theme selection, clipboard copy, save, open-in-default-app, and temporary file cleanup
