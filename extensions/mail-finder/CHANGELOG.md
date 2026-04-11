# Mail Finder Changelog

## [Backend Migration] - {PR_MERGE_DATE}

- Migrate backend from Supabase to the real dedicated API at api.mail-finder.org 

## [Refactor & Bug Fixes] - {PR_MERGE_DATE}

TL;DR
Removed duplicate code (DRY), made things simpler, fixed naming confusion, better icon loading on history, bugs removed.

- Fix infinite loading when revealing an email from Company Employees (React Strict Mode double-mount)
- Fix duplicate history entries caused by double API call on auto-submit
- Extract shared types (EnrichedData, JobHistory, FundingEvent, CachedEmployee) into a single types.ts
- Centralise error handling via getErrorMessage utility
- Move mapEnrichResponseToData and getApiKey to backend.ts, removing duplicate implementations
- Unify CompanySearch into a single render-prop component
- Simplify pagination state: replace totalPages number with hasMorePages boolean
- Fix reserved Raycast shortcut warning by replacing Cmd+W with Cmd+B on the Close action

## [Initial Release] - {PR_MERGE_DATE}

- Mail Finder: Search for verified professional emails by name and domain
- Company Employees: Browse and filter employees by company domain
- Search History: View and manage past searches
