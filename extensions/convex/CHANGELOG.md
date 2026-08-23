# Convex Changelog

## [Endpoint Fixes, Deployment Health & Modernization] - 2026-08-12

### Fixes

- Fix "BigBrain API error: 404" when listing deployments: the internal dashboard endpoint was removed by Convex; deployments are now fetched from the public Management API
- Fix all deployment API calls for newer deployments on region-scoped domains (e.g. `name.eu-west-1.convex.cloud`), where the previously constructed `name.convex.cloud` URL no longer resolves: the actual deployment URL is now stored with the selected context and used for data, logs, and function calls
- Fix "Configure Deploy Key" command: keys saved through the command were stored in LocalStorage but never read by other commands, so deploy key mode only worked when configured via preferences
- Fix stale deployment context after switching teams or projects: cleared selections are now removed from storage instead of silently kept
- Fix "Open Dashboard" and "Copy Deployment URL" showing "Not signed in" in deploy key mode
- Fix "Run Function" in deploy key mode: no more failing management API calls, function execution now uses deploy key authentication
- Detect deployment type (dev/prod/preview) from the deploy key prefix instead of always assuming prod
- Fix "Switch Deployment" not updating the deployment type of the selected context
- Keep "Manage Projects" working when the profile endpoint rejects the token (profile display degrades gracefully instead of failing)

### New

- Add "Show Deployment Health" command: dashboard-style live charts for function calls, failure rate, cache hit rate, scheduler lag, and function concurrency (top functions per metric, auto-refreshing every 10 seconds like the Convex dashboard)
- Add cron jobs and scheduled functions overview with next-run times and last-run status
- Add deployment status view with document count and running/paused state
- Add "Deployment Status in Menu Bar" command (disabled by default): live call volume, failure alerts, and scheduler lag in the menu bar with background refresh

### Maintenance

- Update @raycast/utils to 2.x, @raycast/api to the latest version, and ESLint to 9.x
- Re-enable type checking in the build script (was skipped via --skip-types) and fix newly surfaced type errors
- Remove unused legacy command variants and components, stray metadata screenshots, and debug output
- Fix action titles to follow Title Case convention and remove a reserved ⌘, shortcut that Raycast ignored

## [Security Maintenance] - 2026-05-21

- Updated the extension to address security advisories.

## [Fix TypeError Crashes] - 2026-01-26

- Fix TypeError crashes when API returns non-array responses
- Add defensive Array.isArray checks in data hooks and components
- Ensure useTeams, useProjects, and useDeployments always return arrays

## [Deploy Key Authentication] - 2026-01-21

- Add deploy key authentication as alternative to OAuth login
- Add "Configure Deploy Key" command for easy setup with validation
- Add extension preferences for deploy key and deployment URL
- Support both OAuth and deploy key modes across all commands
- Improve error handling for authentication modes

## [Enhanced Logs, Data & Documentation] - 2026-01-15

- Add documentation browser with 60+ Convex docs organized by category
- Add component browser with 30+ components, install commands, and npm stats
- Add function call tree visualization in logs showing parent-child relationships
- Add collapsible console output in logs (toggle with Command+L)
- Add request-level filtering to view all executions in a request
- Add enhanced metadata showing execution environment, caller, and identity
- Add copy execution ID action in logs
- Add improved document detail view with metadata panel
- Add collapsible raw JSON view in data browser (toggle with Command+J)
- Improve field value formatting for timestamps, objects, and arrays
- Update log display to match Convex dashboard styling

## [Initial Version] - 2026-01-15

- Add project switcher to navigate between teams, projects, and deployments
- Add function runner to execute queries, mutations, and actions with arguments
- Add table browser to view and search documents
- Add log viewer to stream real-time function execution logs
- Add OAuth authentication with Convex
