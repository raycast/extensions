# Convex Changelog

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
