# Roam Research Changelog

## [v2] - 2026-04-15

### New Features
- **Capture Template System** -- Create reusable capture presets per graph with customizable page, nesting, tags, and content template. Manage via the "Manage Capture Templates" command. Includes a global default template that can be customized. Subsumes the old TODO Quick Capture request.
- **Instant Capture** -- New no-view command for zero-UI capture using your designated Instant Capture template. No graph picker, no form — just type and go.
- **Graph Reordering** -- Explicit Move Up/Down ordering controls which graph appears first across all commands. Replaces the old "default graph" concept.
- **Instant Capture Designation** -- Designate one graph-specific template as the Instant Capture template, used by the no-view command and `⌘⇧↵` shortcut in Quick Capture.
- **Capability Detection** -- On graph setup, the extension probes your token's permissions (read, append, edit) and shows capability indicators in the graph list. No more guessing what your token can do.
- **Template Variables** -- `{content}`, `{time}`, `{today}`, `{tags}` for flexible capture templates. Legacy `{date}` and `{date:FORMAT}` still supported for backward compatibility.
- **Capture Outbox** -- Every capture is logged with history. Retryable failures (rate limits, server errors, network issues) are queued and automatically retried every 10 minutes. Browse capture history, retry failed items, and never lose a capture again.
- **Windows Support** -- Extension now runs on both macOS and Windows.

### Improvements
- **Append API Migration** -- Quick Capture now uses Roam's Append API, enabling encrypted graph support and fixing indentation and tag-stripping bugs.
- **Type-First Capture** -- Quick Capture accepts a command argument so you can type your note before selecting a graph.
- **Backend API Proxy** -- Switched to `proxy.api.roamresearch.com`, improving connection reliability.
- **Token Validation** -- Graph setup validates token format (`roam-graph-token-` prefix) and shows inline errors.
- **Regex-safe Search Highlighting** -- Search terms with special characters (`(`, `[`, `*`, etc.) no longer crash the detail view.
- **Search Error Reporting** -- Failed searches now show a toast instead of silently displaying stale results.
- **Linked References Refresh** -- Linked references list now updates correctly when data loads asynchronously.

### Bug Fixes
- Fixed indentation not working in Quick Capture (#19646)
- Fixed #tags being stripped from capture templates (#7979)
- Fixed graph credentials accepted without validation (#5550)
- Fixed `usePersistentState` re-render bug by migrating to `useLocalStorage`
- Fixed stale closure in config setters that could lose writes during rapid operations
- Fixed trailing spaces in navigation titles and missing space in "Show Linked References" action

### Infrastructure
- Migrated from `usePersistentState` to `useLocalStorage` from `@raycast/utils`
- Removed unused dependencies (`querystring`, `@roam-research/roam-api-sdk`)
- Added comprehensive documentation suite (API reference, patterns, gotchas, how-to guides)

## [Major update] - 2023-08-09

- Renamed command "Append to Daily Note" to "Quick Capture" since you can use it to append to other pages in the graph too
- Supports searching across all graphs at once
- Adds a new command "Create Graph Quicklink" which can be used to create quick ways to open graphs or specific pages in a graph
- Optimizations and fixes

## [Initial Version] - 2023-02-20
