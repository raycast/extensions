# Defuddle Changelog

## [AI Tool and Browser Inputs] - {PR_MERGE_DATE}

- Add an Extract Markdown AI tool that returns page content and metadata without clipboard, export, or history writes.
- Suggest active browser tab URLs on macOS when the Raycast Browser Extension is available.
- Add a 30-second extraction timeout, URL validation, and network cancellation when leaving the detail view.
- Update Defuddle to a patched release addressing unescaped attribute interpolation in site extractors.
- Add focused regression tests and document browser support, AI usage, and timeout behavior.

## [Initial Version] - 2026-05-18

- Extract readable Markdown from typed, selected, or clipboard URLs.
- Browse local extraction history, copy Markdown, export to Downloads, and view page metadata.
