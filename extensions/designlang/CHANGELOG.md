# Designlang Changelog

## [Initial Release] - {PR_MERGE_DATE}

- **Extract Design From URL** — runs `npx designlang <url>` and opens the output folder when ready. Optional "full" toggle pulls screenshots, responsive captures, and interaction states.
- **Score Website Design** — rates a site's design-system quality across 7 categories (color discipline, typography, spacing, shadows, radii, accessibility, tokenization) and reports an overall A–F grade.
- **Copy CLI Command For URL** — accepts a URL argument and copies `npx designlang <url>` to the clipboard.
- One preference: `outputDir` (default `~/designlang-output`).
