# Color Palette Manager Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Add **Save Color Palette** command to create and store custom palettes with up to 15 hex colors, name, description, light/dark mode tag, and reusable keywords.
- Add **Manage Color Palettes** command to browse, search, edit, duplicate, and delete saved palettes; copy any palette as JSON, CSS classes, CSS variables, or plain text; copy a shareable Coolors.co link.
- Add **Import Color Palette** command to bulk-import a palette by pasting a delimited list of hex colors. The separator defaults to `;` to match the Color Picker extension's multi-select copy format. Invalid entries are silently skipped.
- Add **Create Colors with AI** command to generate a color set from a text prompt with adjustable creativity, preview swatches, and save the selection as a new palette (requires Raycast Pro).
