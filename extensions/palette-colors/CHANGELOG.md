# Color Palette Manager Changelog

## [Reimagined as Color Palette Manager] - {PR_MERGE_DATE}

This extension has been reimagined as **Color Palette Manager** — a library for building and organizing your own color palettes, rather than a one-shot random palette generator. Thanks to [@douglas-pires](https://github.com/douglas-pires), the original creator, for supporting the handover.

### Added

- **Save Color Palette** — create and save a custom palette with up to 15 hex colors, a name, an optional description, a light/dark mode tag, and reusable keywords.
- **Manage Color Palettes** — browse and search saved palettes; edit, duplicate, or delete them; copy a palette as JSON, CSS classes, CSS variables, or plain text; copy a shareable Coolors.co link.
- **Import Color Palette** — bulk-import a palette by pasting a separator-delimited list of hex colors. The separator defaults to `;` to match the Color Picker extension's multi-select copy format; line breaks are always treated as separators, and invalid entries are skipped.
- **Create Colors with AI** — generate a color set from a text prompt with adjustable creativity, preview the swatches, and save the selection as a new palette. Requires a Raycast Pro subscription.

### Removed

- The original algorithmic random-palette generation (Mono / Contrast / Tetrade / Analogic schemes) and its `color-scheme` and `@adobe/leonardo-contrast-colors` dependencies.

## [Initial Version] - 2022-10-07

### Added

- Add integration with `@adobe/leonardo-contrast-colors` package
- Add integration with `@color-scheme` package
