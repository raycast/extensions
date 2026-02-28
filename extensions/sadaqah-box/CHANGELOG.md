# Changelog

All notable changes to the Sadaqah Box Raycast Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0] - 2026-02-28

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
