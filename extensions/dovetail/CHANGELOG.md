# Dovetail Changelog

## [Fix store build] - 2026-08-31

- Pin `react`/`@types/react` to the exact versions `@raycast/api` nests internally, fixing a TypeScript type-checking failure in the automated store build caused by two incompatible copies of React's type definitions

## [Workspace search, projects, and AI tools] - 2026-08-28

- Migrate the insights search command to the `/v1/docs` endpoint (renamed to "Search Docs"); `/v1/insights` is deprecated
- Add "Search Projects" command
- Add "Search Workspace" command powered by `/v2/search`, covering docs, data, projects, highlights, tags, channels, themes, dashboards, folders, and contacts in one place
- Add AI tools (`search-workspace`, `get-content`, `summarize`) so Raycast AI can search the workspace, read doc/data content, and generate Dovetail's Magic Summarize output
- Add "Browse Folders" command for file-explorer-style navigation through folders, projects, docs, and channels, with type-count pills on each folder row
- Add project drill-down: search or browse into a project to see its docs, data, highlights, and tags, then push into full detail views
- Add channel drill-down: browse a channel's AI-generated themes and recent data points with sentiment
- Add "Create Data Entry" command with a form to add new data to a project
- Add copy-link and open-in-Dovetail actions with consistent keyboard shortcuts across search commands, with an in-app detail view as the primary action wherever one exists
- Add error toasts everywhere API calls can fail, instead of failing silently
- Add an optional detail pane (⌘D) to Search Workspace showing preview text and metadata for the selected result

## [Search with pagination] - 2025-05-20

- Add pagination to the search data, insights, and contacts actions

## [Search contacts and view data] - 2025-05-12

- Switch to new `/v1/data`, `/v1/insights`, and `/v1/contacts` endpoints for improved reliability
- Add new contact search and display experience
- Show detail view for data items with clean markdown and metadata
- Add action to open data items directly in Dovetail
- Remove deprecated notes endpoints

## [Initial Version] - 2025-01-10

- Add data and insight search ability
