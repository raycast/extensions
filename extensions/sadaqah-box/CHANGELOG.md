# Changelog

All notable changes to the Sadaqah Box Raycast Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.1.3] - 2026-11-26

### Changed
- **Sum Multipliers Client-Side** – Preset quick-add and `AddSadaqahForm` now multiply `value * amount` cleanly into a single summed sadaqah entry instead of creating up to hundreds of individual rows per click

### Fixed
- **Amount Input Limit** – Added `LIMITS.SADAQAH_AMOUNT_MAX` (`1000`) validation to `addSadaqahSchema` and `presetFormSchema` so excessive multipliers (such as `10000`) are rejected in the form

## [1.1.2] - 2026-11-26

### Fixed
- **Preset & Add Sadaqah Value Multiplication** – Removed client-side `value * amount` pre-multiplication in preset quick-add and `AddSadaqahForm` so unit `value` and `amount` map accurately to the updated API contract
- **Stats, Pagination & Default Currency Alignment** – Aligned `StatsResponse` with `{ stats }` (`convertedTotal` / normalized `totalValue`), read top-level `total` on sadaqah and collection lists, and updated the default base currency label to `Gold (XAU)`

## [1.1.0] - 2026-11-26

### Fixed
- **Sadaqah Amount Multiplication** – Fixed `AddSadaqahForm` to multiply `value * amount` when both are provided, matching the backend API contract
- **HTTP Error Categorization** – Fixed `handleError` so `401`/`403`/`404`/`422`/`5xx` HTTP responses are properly categorized instead of falling back to generic unknown errors
- **Description Clearing** – Fixed `EditBoxForm` and `updateBoxSchema` so clearing an existing box description properly updates it on the server
- **Form Validation** – Separated `value` and `amount` field errors, enforced strict positive number parsing, and added inline `amount` errors on preset forms
- **Cache Key Scoping & Invalidation** – Scoped API cache keys by `apiHost` and query parameters, and added prefix invalidation on mutations
- **Safe Retries** – Restricted automatic retries to idempotent `GET` requests
- **Preset Reordering & Recovery** – Normalized missing `order` fields before reordering and validated stored presets on load
- **Box Detail Error Handling** – Added an error view with retry action when loading box details fails, and fixed stale box state after collection
- **Platform Shortcuts** – Added cross-platform macOS/Windows shortcuts and Raycast common shortcuts

### Changed
- Reorganized internal views (`src/views/`), shared hooks (`src/hooks/`), and local storage (`src/storage/`)
- Standardized package management on Bun and updated dependencies
- Updated README header and erklab sponsorship branding

## [Initial Version] - 2026-03-12

### Added

#### Box Management
- **Create Boxes** – Organize your sadaqahs into different boxes (e.g., "Ramadan Charity", "Daily Sadaqah")
- **Track Progress** – Monitor total value, count, and currency breakdown for each box
- **Multi-Currency Support** – Handle donations in different currencies with automatic conversion tracking
- **Edit Boxes** – Modify box details including name and description
- **Delete Boxes** – Remove boxes with confirmation to prevent accidental deletion
- **Box Details View** – Detailed view showing all sadaqahs in a box with sorting and filtering

#### Quick Actions & Presets
- **Preset Management** – Define preset amounts for quick donation recording (e.g., "Daily Sadaqah - 0.1g Gold")
- **Keyboard Shortcuts** – Quick access with `⌘⇧1-5` for instant preset actions
- **Default Preset** – Set a preset as default for one-click adding
- **Reorder Presets** – Organize presets with `⌘⇧↑/↓` keyboard shortcuts
- **Quick Add Sadaqah** – Fast entry form with support for all currencies and gold values

#### Statistics & Reporting
- **Dashboard Overview** – View total boxes, sadaqahs, and value across all boxes at a glance
- **Collection Receipts** – Generate beautiful markdown receipts when emptying boxes
- **Collection History** – Track all collections and their values over time
- **Currency Breakdown** – See distribution of donations across different currencies

#### Security & Performance
- **Input Validation** – All inputs validated with Zod schemas for data integrity
- **Request Timeouts** – 30-second timeout with automatic retry logic
- **API Response Caching** – Intelligent caching strategy to reduce API calls:
  - List Boxes: 5 minutes TTL
  - Box Details: 5 minutes TTL
  - Statistics: 2 minutes TTL
  - Currencies: 1 hour TTL
- **Secure Error Handling** – User-friendly error messages without exposing internal details
- **Cryptographically Secure IDs** – Using `crypto.randomUUID()` for all ID generation
- **API Key Authentication** – Secure authentication via `x-api-key` header with Better Auth

#### User Experience
- **Inspirational Quotes** – Display random Quranic verses and Hadith about charity/sadaqah
- **Empty States** – Helpful guidance when no boxes or presets exist
- **Toast Notifications** – Success and error feedback for all actions
- **Loading States** – Smooth loading indicators for async operations
- **Confirmation Dialogs** – Prevent accidental deletions and collections

#### Commands
- **`Dashboard`** – Main interface for viewing and managing all sadaqah boxes
- **`Manage Presets`** – Configure quick-add presets for faster donation recording

#### Configuration
- **API Host Preference** – Configurable base URL for SadaqahBox API
- **API Key Preference** – Secure password field for authentication credentials
