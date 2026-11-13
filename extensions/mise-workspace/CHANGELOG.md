# Changelog

## [Maintenance] - 2026-08-12

- Fixed menu bar icon appearing black on dark menu bars (now tinted with the menu bar's own appearance)
- Made the extension public
- Updated all dependencies to latest (Raycast API, TypeScript 6, ESLint 10)
- Migrated to @raycast/eslint-config flat config
- Removed unused dependencies and dead feature-flag code
- Fixed stale README command list

## [Remove working on] - 2026-03-22

- Removed "Working On" feature (set/clear status, icon, menu items)
- Updated dependencies (typescript, @types/node, lucide-static)

## [Tweak task panel] - 2025-09-16

- Added support for subtasks display
- Reorganized field order to be consistent

## [Unify working status] - 2025-09-15

- Consolidated working status into `GET /api/tasks.my` response
- Removed client calls to `GET /api/tasks.working`
- Stabilized response shapes and added explicit, deterministic sorting
- Removed the option to hide the menu bar and instead use Raycast’s native functionality

## [Cache cleanup] - 2025-09-14

- Removed ETag/LocalStorage caching in the Raycast extension
- Rely exclusively on Convex query cache for freshness
- Dropped custom headers and 304 handling from tasks fetch

## [Manage Subtasks] - 2025-09-14

- Added subtask management
- Added option to show/hide subtasks in menu bar
- Tweaked task layout in views
- Componentized common patterns
- Added Working On status

## [Improve UI] - 2025-09-13

- Unified status color scheme as web app
- Fixed a bug base url API is not working
- Added shortcuts to menu bar
- Optimized Working on

## [Optimize performance] - 2025-09-13

- Unfied sorting and grouping of tasks
- Fixed delay of project and assignee
- Reduced API load by adding ETAG and Cache
- Added Create Task shortcut
