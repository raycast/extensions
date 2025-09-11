# Firecrawl Changelog

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
