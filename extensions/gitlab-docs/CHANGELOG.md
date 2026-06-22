# GitLab Docs Changelog

## [Add Detail View] - 2026-06-22

- Add a detail panel to Documentation, Handbook, and Design System results that renders the full page content
- Toggle the detail panel with "Show Details" / "Hide Details" (Cmd+D); open the page in the browser with Enter while the panel is open
- Match GitLab icons when searching with spaces or no separator (e.g. "chevron lg" finds "chevron-lg-left")

## [Fix Search Commands] - 2026-06-22

- Add a "Search Icons" command to browse and copy GitLab SVG icons from design.gitlab.com/svgs
- Migrate the "Search Documentation" command from the deprecated Algolia DocSearch API to the Elasticsearch backend used by docs.gitlab.com
- Migrate the "Search Handbook" command from the deprecated Swiftype API to the Algolia DocSearch backend used by handbook.gitlab.com
- Show default results in Documentation and Handbook when the search field is empty
- Display a content snippet and category for each Documentation and Handbook result
- Fix the design system command crashing with duplicate keys, hide the unnamed section, and show the page path per result
- Add a "Copy URL" action to the Handbook and Design System results
- Fix the "operation was aborted" error by replacing request cancellation with a stale-request guard
- Resize the Handbook command icon to 512x512

## [Update] - 2023-08-10

- Updates the API used for searching GitLab Documentation.

## [Initial Version] - 2022-07-12
