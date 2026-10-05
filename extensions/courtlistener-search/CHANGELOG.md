# CourtListener Search Changelog

## [Initial Version] - 2026-09-02

- Search CourtListener's case law database from Raycast
- Semantic search on `⌘⇧M`, ranking by what a query means rather than which of its words appear
- Citation-shaped queries are resolved through CourtListener's citation endpoint, so `410 U.S. 113` returns the one case
- Detail pane leading with the court's own summary of the case, where there is one, then the matching passage, alongside court, dates, docket, judges, parallel citations, and citation count
- Filter by court (Supreme Court, federal circuits, state courts of last resort) and by how far back to look
- Save cases, and a search history that filters as you type
- Rate-limit handling that reports your token's actual limits
