# TODO

---

## BRANCH 1: `refactor/code-organization-and-logging`

Focus: Refactor codebase structure, integrate logging, fix critical bugs, and improve code quality before implementing new features.

---

## 🔧 Logging & Debugging

- [x] Integrate `@chrismessina/raycast-logger` for verbose logging
  - [x] Add `verboseLogging` preference to `package.json`
  - [x] Create `src/logger.ts` to initialize and export logger instance
  - [x] Replace all `console.log` calls with `logger.log()` (in `utils.ts`, `brew.ts`)
  - [x] Replace all `console.error` calls with `logger.error()`
  - [x] Create child loggers for different modules (e.g., `[Brew]`, `[Cache]`, `[Actions]`)
  - [x] Add logging for key operations: fetch, install, uninstall, upgrade, cleanup
- [x] Improve error handling with better user feedback
  - [x] Add more descriptive error messages in `showFailureToast`
  - [x] Add error context (command, parameters) to error logs
  - [x] Consider adding retry logic for transient network errors in `fetchRemote`
  - [x] Create granular error types (network, parsing, brew command, etc.)
  - [x] Show retry options in UI for network failures
  - [x] Add React error boundaries for component-level error handling

## 🧪 Code Quality & Testing

- [x] Enable stricter TypeScript settings
  - [x] Remove `any` types where possible
  - [x] Add explicit return types to functions

## 🐛 Bug Fixes

- [x] Handle "another brew process is already running" lock errors gracefully
  - [x] Create `BrewLockError` error type for concurrent process detection
  - [x] Detect lock errors from brew stderr output (`lockf: already locked`, etc.)
  - [x] Show user-friendly "Brew is Busy" message instead of raw error
  - [x] Add retry action for lock errors (they are recoverable)
  - [x] Log lock errors with context for debugging
- [x] Fix issue with the `--[no-]quarantine` switch being deprecated in Homebrew 4.7.0+
  - [x] Remove `quarantine` preference from `package.json`
  - [x] Remove `brewQuarantineOption()` function from `brew.ts`
  - [x] Remove quarantine option from install/upgrade commands
  - [x] See: https://github.com/Homebrew/brew/pull/20929
- [x] Fix typo: `pinned_vesion` should be `pinned_version` in `OutdatedFormula` interface

## 🏗️ Code Organization

- [x] Restructure codebase for better organization using the following directory structure:
  - `src/components/` - React components (action panels, info panels, list items)
  - `src/docs/` - Documentation and guides
  - `src/hooks/` - Custom React hooks for data fetching and state management
  - `src/tools/` - AI tools for Raycast
  - `src/utils/` - Utility functions and helpers
  - `src/views/` - Top-level view components (search, installed, outdated, etc.)

- [x] Create `src/utils/types.ts`
  - [x] Move all type definitions from `brew.ts` (Cask, Formula, OutdatedFormula, etc.)
  - [x] Move `Remote` interface from `utils.ts`

- [x] Create `src/utils/brew/` module structure:
  - [x] `src/utils/brew/commands.ts` - brew command execution (`execBrew`, `execBrewEnv`)
  - [x] `src/utils/brew/paths.ts` - path utilities (`brewPrefix`, `brewPath`, `brewExecutable`)
  - [x] `src/utils/brew/fetch.ts` - data fetching logic (`brewFetchInstalled`, `brewFetchOutdated`)
  - [x] `src/utils/brew/search.ts` - search functionality (`brewSearch`, `brewFetchFormulae`, `brewFetchCasks`)
  - [x] `src/utils/brew/actions.ts` - install/uninstall/upgrade actions
  - [x] `src/utils/brew/helpers.ts` - utility functions (`brewName`, `brewIdentifier`, `brewIsInstalled`, etc.)
  - [x] `src/utils/brew/index.ts` - re-export all brew utilities

- [x] Refactor `src/utils/` utilities:
  - [x] Move `utils.ts` → `src/utils/cache.ts` (cache-related functions)
  - [x] Create `src/utils/toast.ts` - toast utilities (`showActionToast`, `showFailureToast`)
  - [x] Create `src/utils/array.ts` - array utilities (replace global prototype extensions with functions)
  - [x] Move `errors.ts` → `src/utils/errors.ts`
  - [x] Move `logger.ts` → `src/utils/logger.ts`
  - [x] Move `preferences.ts` → `src/utils/preferences.ts`
  - [x] Create `src/utils/index.ts` - re-export all utilities

- [x] Create `src/hooks/` for React hooks:
  - [x] `src/hooks/useBrewSearch.ts` - search hook with debouncing
  - [x] `src/hooks/useBrewInstalled.ts` - installed packages hook
  - [x] `src/hooks/useBrewOutdated.ts` - outdated packages hook
  - [ ] Consider using React Query or SWR for better data fetching patterns

- [x] Move view components to `src/views/`:
  - [x] `search.tsx` → `src/views/SearchView.tsx`
  - [x] `installed.tsx` → `src/views/InstalledView.tsx`
  - [x] `outdated.tsx` → `src/views/OutdatedView.tsx`
  - [x] `upgrade.tsx` → `src/views/UpgradeView.tsx`
  - [x] `clean-up.tsx` → `src/views/CleanUpView.tsx`

- [x] Organize `src/components/`:
  - [x] Keep existing components in place
  - [x] Move `runInTerminal.ts` → `src/utils/terminal.ts`

- [x] Additional refactoring:
  - [x] Break down long functions (e.g., `_fetchRemote`) into smaller, focused units
  - [x] Add React error boundaries for component-level error handling
    - [x] Created `ErrorBoundary` component with logger integration
    - [x] Wrapped all view components (SearchView, InstalledView, OutdatedView, UpgradeView)
    - [x] Integrated with centralized logging system for error tracking

## Add Support for Homebrew 5.0

- [x] See https://brew.sh/2025/11/12/homebrew-5.0.0/ and https://github.com/Homebrew/brew/pull/20951
- [x] Update brew command execution to handle new Homebrew 5.0 changes, including concurrency
  - [x] Added `HOMEBREW_DOWNLOAD_CONCURRENCY` environment variable support
  - [x] Added `HOMEBREW_USE_INTERNAL_API` environment variable support
  - [x] Added preferences to control these features
- [ ] Test compatibility with Homebrew 5.0 features
- [x] Update documentation for Homebrew 5.0
  - [x] Updated README.md with Homebrew 5.0 compatibility section
  - [x] Added code comments documenting Homebrew 5.0 changes
- [ ] Verify all existing functionality works with Homebrew 5.0

---

## BRANCH 2: `feat/ai-tools-and-ux`

Focus: Implement AI-powered features, improve user experience, and add advanced performance optimizations on top of the refactored codebase.

---

## 🤖 AI Tools

### Package Queries
- [ ] Add tool to ask about packages and casks
  - [ ] Allow getting current package version
  - [ ] Allow listing outdated packages
  - [ ] Allow updating outdated packages
  - [ ] Allow getting package homepage
  - [ ] Allow getting package dependencies
  - [ ] Allow getting package description
- [ ] Allow upgrading all packages at once

### Package Intelligence & Recommendations
- [ ] AI-powered package recommendations based on use case
  - [ ] Suggest packages similar to installed ones
  - [ ] Recommend packages for common workflows (web dev, data science, etc.)
  - [ ] Analyze dependencies to suggest complementary packages

### System Health & Optimization
- [ ] Generate `brew doctor` reports with AI explanations
  - [ ] Explain common brew issues in plain language
  - [ ] Suggest fixes for detected problems
  - [ ] Provide context about why issues matter
- [ ] AI-powered cleanup suggestions
  - [ ] Identify unused/orphaned packages
  - [ ] Suggest safe cleanup actions based on dependencies
  - [ ] Estimate disk space savings

### Documentation & Help
- [ ] Generate package documentation summaries
  - [ ] Fetch and summarize package READMEs
  - [ ] Extract key features and usage examples
  - [ ] Provide quick reference for common commands
- [ ] Create shell command suggestions
  - [ ] Generate brew commands based on natural language queries
  - [ ] Explain what a brew command does

### Maintenance & Monitoring
- [ ] Analyze security vulnerabilities (based on AI knowledge, not live CVE data)
  - [ ] Check for known CVEs in installed packages
  - [ ] Suggest security updates
  - [ ] Provide vulnerability severity context
- [ ] Generate upgrade impact analysis
  - [ ] Warn about breaking changes before upgrading
  - [ ] Suggest safe upgrade order for dependent packages
  - [ ] Estimate upgrade time/complexity

### Workflow Automation
- [ ] Generate setup scripts for new machines
  - [ ] Export current brew config as installable script
  - [ ] Create Brewfile with AI-optimized organization
- [ ] Suggest tap additions based on installed packages
  - [ ] Recommend useful taps for your workflow
  - [ ] Explain what each tap provides

## 🗂️ Caching & Performance

- [ ] Implement proper caching for brew data
  - [ ] Add cache TTL configuration option
  - [ ] Add manual cache invalidation action
  - [ ] Consider using SQLite for faster queries (noted in `utils.ts` comments)
  - [ ] Add cache size monitoring/cleanup
  - [ ] Simplify cache invalidation logic
- [ ] Optimize search performance
  - [ ] Pre-compute lowercase names for faster filtering
  - [ ] Consider indexing for large formula/cask lists
  - [ ] Increase search results limit (currently capped at 200)
  - [ ] Add search debouncing to reduce unnecessary filtering

## 🎨 UI/UX Improvements

- [ ] Refactor `formulaInfo.tsx` and `caskInfo.tsx` to reduce duplication
  - [ ] Create `usePackageInfo<T>()` hook for shared lazy-loading logic
  - [ ] Extract common patterns: `hasMinimalData()`, loading state, toast handling
  - [ ] Keep type-specific metadata rendering in separate components
  - [ ] Consider a shared `PackageInfoDetail` wrapper component
- [ ] Add more detailed cask information panels
  - [ ] Show download URL and size (from `url` field)
  - [ ] Show installation date/time (from `installed_time` field)
  - [ ] Show SHA256 checksum (from `sha256` field)
  - [ ] Show bundle version info (`bundle_version`, `bundle_short_version`)
  - [ ] Show app artifacts (what gets installed: `.app`, binaries, etc.)
  - [ ] Show zap paths (files removed on full uninstall)
  - [ ] Show deprecation/disabled status with reason and replacement
  - [ ] Show old tokens/aliases (from `old_tokens` field)
  - [ ] Show supported languages (from `languages` field)
  - [ ] Add app icon from installed `.app` bundle
- [ ] Add more detailed formula information panels
  - [ ] Show installation date/time (from `installed[].time` - Unix timestamp)
  - [ ] Show bottle info (pre-built binary availability per architecture)
  - [ ] Show if poured from bottle vs built from source
  - [ ] Show runtime dependencies with versions (richer than just names)
  - [ ] Show test dependencies
  - [ ] Show `uses_from_macos` system dependencies
  - [ ] Show deprecation/disabled status with reason and replacement
  - [ ] Show if formula has post-install script (`post_install_defined`)
  - [ ] Show service info if formula provides a service
  - [ ] Show link overwrite paths
  - [ ] Show conflicts with reasons (not just names)
- [ ] Improve icons for outdated packages
  - [ ] Use distinct icons for outdated vs up-to-date (currently both use `CheckCircle`)
  - [ ] Add visual indicator for pinned packages in list view
  - [ ] Consider using `Icon.ArrowUp` or `Icon.ExclamationMark` for outdated items
- [ ] Implement search filtering by category/type
  - [ ] Add filter for taps
  - [ ] Add filter by license type
  - [ ] Add filter for keg-only formulae
- [ ] Add filter for New and Updated packages
  - [ ] Track package update dates
  - [ ] Add "Recently Added" section
  - [ ] Add "Recently Updated" section
- [ ] To Show Installed, show available updates
  - [ ] Add action to update individual package
  - [ ] Add action to update all packages at once
- [ ] Add download progress HUD to show download % complete
- [ ] Improve keyboard shortcuts for Actions
- [ ] Improve loading states with more informative messages
- [ ] Add helpful empty states with actionable suggestions
  - [ ] Look into why EmptyView doesn't appear on first cold start of SearchViewContent

## 📚 Documentation

- [ ] Improve README documentation
  - [ ] Add screenshots of all commands
  - [ ] Document all preferences
  - [ ] Add troubleshooting section
  - [ ] Add contribution guidelines
  - [ ] Document keyboard shortcuts

## 🔮 Future Enhancements

- [ ] Add "brew doctor" command integration
  - [ ] Show health check results in a dedicated view
  - [ ] Add quick-fix actions for common issues
- [ ] Add tap management
  - [ ] List installed taps
  - [ ] Add/remove taps
- [ ] Add formula/cask analytics
  - [ ] Show install counts from Homebrew analytics
  - [ ] Show popularity ranking
- [ ] Add batch operations
  - [ ] Select multiple packages for install/uninstall
  - [ ] Bulk upgrade selected packages
