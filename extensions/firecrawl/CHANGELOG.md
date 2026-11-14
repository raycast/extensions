# Firecrawl Changelog

## [Move Deep Research to the Agent API] - {PR_MERGE_DATE}

### Changed
- `deep-research` tool now runs on Firecrawl's Agent API (`/v2/agent`), because the Deep Research API (`/v1/deep-research`) shuts down on December 10, 2026 ([migration guide](https://docs.firecrawl.dev/migrating-from-deep-research))
- Updated `@mendable/firecrawl-js` from `^4.3.4` to `^4.9.0`

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
