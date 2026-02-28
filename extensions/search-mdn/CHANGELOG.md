# Changelog

## Updated - {PR_MERGE_DATE}

- icons to better differentiate js, html, css, svg, http, ... features from MDN guides / tutorials
- metadata about browser compatibility using the _baseline_ nomenclature, and granular browser support data
- a new option to set the default action: "read document" (current) or "open in browser"

## Updated - 2024-09-06

- Fixing an issue with Markdown parser not handling `\u` characters properly ([#12921](https://github.com/raycast/extensions/issues/12921))

## Updated - 2024-09-02

- Feature: Support custom preferred action

## Updated - 2024-06-19

- Updated the command icon and snapshots
- Updated dependencies and removed critical security vulnerabilities

## Updated - 2024-02-03

- Updated dependencies
- Moved fetching to hooks, remove axios
- Proper formatting of pages, removing `{{<snippets>}}`
- Fixing inline links & images

## Updated - 2022-12-18

- Sync latest locale list with [MDN Web Docs Localization
  ](https://developer.mozilla.org/en-US/docs/MDN/Community/Contributing/Translated_content)

## Updated - 2022-10-05

- Support `Read Document` from GitHub
- Optimize locales with `List.Dropdown`
- Add extension categories
- Fix locale `zh-CN` to `zn-cn`
- Upgrade @raycast/api to 1.40.1
- Remove debug log

## [Added locale] - 2022-04-22

- Added so it’s possible to change locale in preferences
