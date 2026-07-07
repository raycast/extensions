# QuickForce Changelog

## [Store Release] - {PR_MERGE_DATE}

### Changed
- Renamed the extension from ForceCast to **QuickForce**.

### Added
- **Login as User** - Impersonate a user from Manage Users via Salesforce's `servlet.su` endpoint, routed through the authenticated frontdoor bridge. Available for active users only.
- **Org Limits in Menu Bar** - New opt-in menu bar command showing the default org's API and storage limits; disabled by default with no background refresh, so it only fetches when clicked or enabled.
- **Live Picklist Values** - Create Record now fetches real picklist values from the object's describe (cached 24h), falling back to the built-in defaults if unavailable.
- **CSV Export** - Run SOQL Query results can be exported to a CSV file in Downloads or copied to the clipboard as CSV, covering all returned records.

### Security
- Eliminated shell injection across `src/lib/sfdx.ts`: CLI calls now go through `execFile` with argument arrays instead of interpolated shell strings, so user input (search terms, record field values, org identifiers) can no longer be interpreted as shell metacharacters.
- Hardened the frontdoor.jsp POST bridge used to open orgs: HTML-escaped interpolated values, unique per-request temp filenames (`crypto.randomUUID()`), 0600 file permissions, and reliable cleanup even if the browser fails to open.
- Hardened SOQL construction in `searchUsers` (LIKE wildcard escaping) and `getUserLoginHistory` (record ID shape validation).

### Changed
- Replaced CLI spawns with the authenticated `@salesforce/core` `Connection` for all data access (SOQL, SOSL search, org limits, record create, password reset, freeze/unfreeze, scratch org expiration). Queries and searches are now noticeably faster and no longer capped by the CLI's JSON buffer or a temp-file workaround.
- Fixed the org list reshuffling on load; the list now renders fully sorted on first paint, with scratch org expiration dates loaded (and cached) in the background.
- Added cross-command actions: jump from an org in Manage Salesforce Orgs straight into Org Details, a pre-filled SOQL query, or a pre-scoped Setup page list.
- SOQL results now show a detail pane instead of pushing to a separate view; Search Records and Setup Quick Links support creating quicklinks; org dropdowns remember your last selection.
- Replaced the free-text hex color field for org customization with a preset color picker.
- Fixed several bugs: favorited SOQL queries losing their org, record links pointing at malformed URLs instead of the Lightning record view, and a duplicated `OrgMetadata` type.

## [1.0.0] - 2026-03-04

### Added
- **Manage Salesforce Orgs** - List all authenticated orgs with custom labels, colors, and sections. Recently used orgs float to the top.
- **Org Details** - Comprehensive org dashboard: API limits with color-coded usage indicators, current user context, installed packages, org edition and type.
- **Run SOQL Query** - Execute SOQL queries with full history and favorites management. Auto-saves last 50 queries, supports starring favorites and loading saved queries.
- **Search Records** - Global SOSL search across Accounts, Contacts, Opportunities, Leads, and Cases.
- **Manage Users** - Search and manage Salesforce users. View login history, reset passwords, freeze/unfreeze accounts.
- **Setup Quick Links** - Instantly navigate to 40+ Salesforce Setup pages. Pin favorites and track recently accessed pages.
- **Create Record** - Create Leads, Contacts, Accounts, Opportunities, Cases, and Tasks without opening a browser.