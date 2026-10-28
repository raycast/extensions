# Mermaid to Image Changelog

## [Ondine Experimental Renderer & SVG Fidelity Fixes] - 2026-10-28

### Added

- `Ondine Experimental (SVG Only)` mode for manual SVG generation with bundled `ondine` version `0.0.3`
- `Use Ondine in Auto` preference, disabled by default, for eligible SVG and PNG diagrams in the manual command
- Ondine renderer version, bundled theme, and theme-directive warnings in the manual result screen
- Ondine syntax and semantic diagnostics in the manual error screen without exposing diagram source in operational logs or failure toasts
- Regression coverage for Ondine runtime initialization, theme materialization, Auto fallback, PNG validation, and post-render action isolation

### Changed

- Opt-in Auto routing now tries Ondine for reviewed diagram families outside the existing Beautiful route, falling back once to `Compatible (mmdc)` on Ondine rendering failure
- Existing Beautiful SVG routing and its families' compatible PNG routing remain unchanged; the AI tool does not use the Ondine opt-in
- Auto bypasses Ondine when the original or cleaned diagram source contains embedded directives or frontmatter configuration
- Ondine reuses bundled colors from the existing `Beautiful Theme` preference; explicit Ondine mode warns when embedded theme settings may not be honored
- Ondine SVG preview, `Copy Image`, and Auto PNG output use Chrome/Chromium-backed rasterization without silently falling back to the native macOS rasterizer
- Ondine Auto PNG output uses 3× rasterization with a 4096 px longest-edge limit, independently of `Compatible Scale`, and reuses the generated PNG for preview and copying
- Explicit Ondine mode remains SVG-only and reports errors directly without compatible fallback

### Improved

- Bounded Ondine CSS variable and color materialization preserves bundled theme colors, font settings, and explicit SVG styles
- Ondine Auto PNG generation validates the PNG header and expected dimensions, applies the configured browser subprocess timeout, and cleans temporary or partial output on failure
- Source-free Auto fallback logging records only renderer identifiers, reviewed diagram family, and bounded error codes

### Fixed

- Fixed npm installation conflicts with Vite 8 and Vitest 5 by aligning the development esbuild and Node.js type dependencies
- Fixed compatible SVG previews and copied images showing displaced Chinese labels, black fills, or incorrect colors in affected diagrams by using browser-backed rasterization without changing the original SVG
- Prevented browser-required SVG previews from silently falling back to raw SVG when rasterization fails
- Prevented `Copy Image`, `Save Image`, or `Open in Default App` failures after successful rendering from triggering a render fallback or repeating the action

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
