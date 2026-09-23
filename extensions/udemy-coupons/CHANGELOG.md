# Udemy Coupons Changelog

## [Update] - 2026-08-04

### Added
- "Most Enrolled" sort option in the grid.
- Language, course length, and enrollments shown in course detail.
- Favorites now always resolve against the full catalogue, so saved courses show up even when they fall outside the currently loaded pages.
- "Highest Rated", "Most Enrolled", and "Title" sorts are applied across the entire result set instead of only the loaded pages.

### Changed
- Search and category filtering run server-side; the full filtered result set is loaded so sorting and favorites are accurate across the whole catalogue.
- The category dropdown now uses the canonical category list instead of deriving it from a truncated request.
- Validated the Udemy enrollment URL to ensure it always points to `udemy.com`.
- Grid subtitles now show rating and enrollment counts alongside recency.
- Split the command into focused modules (CourseGrid, CourseDetail, api, types, utils, favorites) for maintainability.
- Dropped the unrelated "Communication" store category.

## [Store Listing Optimization] - 2025-11-07
- Enhanced extension title and description for better visibility in Raycast Store
- Added SEO-optimized keywords including "Free", "Premium", "Verified Coupons"
- Expanded categories to include "Education" and "Productivity" for broader reach
- Improved command description with specific course categories and update frequency
- Added comprehensive README with detailed features, usage instructions, and benefits
- Included system requirements and additional resources for users
- Added disclaimer about coupon availability for transparency

## [Initial Version] - 2025-11-06
- Initial release of Udemy Coupons extension
- Browse and search for free Udemy courses with verified coupons
- Filter courses by category
- View detailed course information including ratings and instructor details
- One-click enrollment with free coupon codes
- Hourly updates with fresh course deals
