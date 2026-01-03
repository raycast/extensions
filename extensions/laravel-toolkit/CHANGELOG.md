# Changelog

## [Initial Release] - {PR_MERGE_DATE}

### Added

- **Project Management:**
  - `manage-projects` command to track and open local projects.
  - Import existing projects from any directory.
  - "Open in Editor" with strict path configuration.
  - "Open External Terminal" to launch PowerShell/Terminal at project path with auto-focus.
- **Project Creation:**
  - `create-project` wizard with support for Breeze, Jetstream, and custom stacks.
  - Support for SQLite, MySQL, PostgreSQL, MariaDB, SQL Server.
  - Testing framework selection (Pest/PHPUnit).
  - One-click setup for Sail, Telescope, Horizon, Pulse.
- **Custom Packages:**
  - `manage-custom-packages` command to create reusable package presets.
  - Support for saving both Composer and NPM packages.
  - Integrated into project creation flow.
- **Documentation & Snippets:**
  - Comprehensive documentation search for all Laravel versions.
  - Collection of common code snippets (Routes, Models, etc.).
  - Artisan command reference with search.
- **Internal Tools:**
  - Robust `exec`-based editor launching for Windows reliability.
  - LocalStorage persistence for projects and packages.
