# Brreg Search Changelog

## [Quality & Testing Sweep] - [PR_MERGE_DATE]

- Added Vitest infrastructure with Raycast API mocks
- Added smoke tests for core utilities and Brreg API mapping
- Added TTL cache for API responses to reduce redundant network calls
- Debounced search input for snappier typing
- Shortcut help labels derived from shared constants — single source of truth
- Copy shortcuts normalised to `⌘⇧` combinations for consistency
- Improved favourites responsiveness and toast feedback
- Centralised constants and map URL logic in details view
- Extracted shared VAT copy utility
- Extracted and tested format helpers (`formatCurrency`, `formatDate`, etc.)
- Removed dead types and unused settings hook
- Fixed dependabot security alerts by updating vulnerable transitive deps
- Upgraded ESLint to v9 with flat config
- Added DRY search favicon strategy: top-3 hydration, debounced updates, and bounded in-memory cache

## [Documentation Update] - 2026-01-22

- Updated README to reflect current functionality
- Added privacy and networking section
- Normalised changelog format

## [Keyboard Shortcuts for Financial Data] - 2025-08-25

- Added keyboard shortcuts for copying revenue (`⌘⇧R`) and net result (`⌘⇧N`)
- Refactored all shortcuts to use centralised constants

## [Favourites & UX Polish] - 2025-08-25

- Welcome message and keyboard shortcuts help on all views
- Add/remove favourites from detail view (`⌘F` / `⌘⇧F`)
- Favourites hidden while typing
- Metadata tag for favourite status
- Removed unnecessary settings view
- Fixed broken links

## [Major Refactoring] - 2025-08-19

- Broke monolithic component into focused, reusable pieces
- Extracted business logic into custom hooks
- Added React.memo, error boundaries, strict TypeScript throughout
- Welcome messages, keyboard shortcuts help, improved empty states

## [Initial Enhancement] - 2025-08-19

- Corrected English name of Brønnøysundregistrene
- Added favourites, company details, financial info, map integration

## [Initial Release] - 2025-02-25

- Search Norwegian companies by name or organisation number
- Company details and financial information
- Copy actions and external links
