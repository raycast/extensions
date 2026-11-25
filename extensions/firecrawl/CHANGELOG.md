# Firecrawl Changelog

## [Remove the Extract tool] - 2026-11-25

### Removed
- `extract` tool, because Firecrawl's Extract API (`/extract`) shuts down on December 10, 2026 ([migration guide](https://docs.firecrawl.dev/migrating-from-extract)). Use the `scrape` tool to read a page and pull out the details you need

### Changed
- Updated `@raycast/api` from `^1.99.4` to `^2.10.0` and `@raycast/utils` from `^1.17.0` to `^2.3.3`

## [Move Deep Research and LLMs.txt to the v2 API] - 2026-11-18

### Changed
- `deep-research` tool now runs on Firecrawl's Agent API (`/v2/agent`), because the Deep Research API (`/v1/deep-research`) shuts down on December 10, 2026 ([migration guide](https://docs.firecrawl.dev/migrating-from-deep-research))
- `Generate LLMs.txt` now builds llms.txt and llms-full.txt from Firecrawl's map and batch scrape APIs (`/v2/map`, `/v2/batch/scrape`), because the LLMs.txt API (`/v1/llmstxt`) shuts down the same day ([migration guide](https://docs.firecrawl.dev/migrating-from-llmstxt))
- Updated `@mendable/firecrawl-js` from `^4.3.4` to `^4.54.0`

### Added
- `Max Credits` preference (default 100), which caps Firecrawl agent credits per Deep Research run

### Removed
- `Max Depth` and `Time Limit` preferences, which the Agent API has no equivalent for

## [Major Update: Firecrawl SDK v4.3.4] - 2025-09-10

### Changed
- **BREAKING**: Updated `@mendable/firecrawl-js` from `^1.29.3` to `^4.3.4`
- Migrated all API calls to use new v2 API
- Some endpoints are still using old v1 API (`firecrawl.v1.*`) for backward compatibility (as we don't support these methods in the v2 API)
- Updated method calls across all tools:
  - `scrape.ts`: `firecrawl.scrapeUrl()` → `firecrawl.scrape()`
  - `deep-research.ts`: `firecrawl.__deepResearch()` → `firecrawl.v1.__deepResearch()`
  - `generate-llms-txt.tsx`: `firecrawl.generateLLMsText()` → `firecrawl.v1.generateLLMsText()`

### Fixed
- Resolved TypeScript compilation errors caused by API changes
- Fixed ESLint issues with explicit `any` types
- Maintained full backward compatibility with existing functionality

### Technical Notes
- All existing features continue to work without changes to user experience
- Extension now benefits from latest SDK improvements and bug fixes
- Uses legacy v1 API layer provided by the new SDK for seamless migration

## [Chore: Update version & Add integration parameter] - 2025-06-10
- Updated Firecrawl version
- Added integration parameter

## [Enhancement: Fixed capitalization & Improved descriptions] - 2025-03-31
- Fixed capitalization in `Generate LLMs.txt` command
- Updated extension and tool descriptions

## [Chore: Added metadata images] - 2025-03-18

## [Initial Version] - 2025-02-25
