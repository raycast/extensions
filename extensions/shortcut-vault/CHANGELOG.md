# Changelog

## [Initial Release] - {PR_MERGE_DATE}

- Built the local-first Shortcut Vault Raycast extension.
- Added searchable bundled and custom shortcuts.
- Added custom shortcut creation, editing, duplication, and deletion.
- Added versioned JSON import and export.
- Added data-driven bundled shortcut databases.
- Added validation, focused tests, store-readiness documentation, and final pre-submission hardening.
- Expanded the bundled default shortcut library to 530 shortcuts across 18 owners.
- Made owner/app name tags visually consistent across search results.
- Capped broad search result rendering to keep large shortcut lists responsive.
- Pruned test-only files and placeholder/source-only assets from the production-ready tree.
- Updated TypeScript module resolution for the newer compiler deprecation behavior.
- Improved symbol-key search for punctuation-heavy shortcuts and arrow keys (`→`, `←`, `↑`, `↓`).
- Added key alias matching for `esc`/`escape`, `enter`/`return`, and `backspace`/`delete`.
- Passed 100% clean verification across ESLint, Prettier, TypeScript, unit tests, and Raycast production build.
- Immediately clears Add Shortcut with Raycast native field resets after saves so repeated entry works like reopening the command.
