# Google Chrome Changelog

## [Fix Search Bookmarks] - 2025-09-20

- Fix the "Search Bookmarks" command returning an error when the hard-coded default profile directory does not exist.

## [Update the dependencies to fix search history and find tab] - 2025-09-03

## [Chore: Updated contributors] - 2025-09-03

## [Add Refresh Tab Command] - 2025-08-25

- Add Reload Tab action to refresh a selected tab in the Search Tab command.

## [Fix New Tab Command React Hooks Violation] - 2025-05-27

- Fix React Rules of Hooks violation causing TypeError when opening new tabs.
- Improve error handling for profile and history data loading.

## [Add Omnibox-like search behavior for New Tab] - 2025-05-07

- Add support for entering URLs or search terms in a single input field, mimicking Chrome's Omnibox behavior.

## [Add Copy Title action for Search Tab] - 2025-04-22
- Add the ability to create new incognito window.

## [Add Copy Title action for Search Tab] - 2025-02-11
- Add Copy Title action for Search Tab command.

## [Add AI Tools] - 2025-02-21

## [Allow to configure profile path] - 2025-01-18
- The path for your profile can be configured in the settings. This allows you to use a different profile than the default one.

## [Fix] - 2025-01-09

- Fix Search Tabs command when "Extract the favicon from every open tab" is enabled.
- Fix bookmark list in the Search All command.

## [Add Search All Command] - 2024-08-01

- Add Google Chrome tabs and history, bookmarks search.

## [Fix Search History window] - 2023-12-19

- Fix Search History window not opening when the app is open but no window is opened.

## [Multi-word tab search enhancements and vulnerability fixes] - 2023-12-08

- Order-insensitivity: search "foo bar" now works with title/url "bar foo" or "foo bar".
- Spacing-insensitivity: search "foo bar" and "foo bar" now work with title/url "foo bar".
- URL-title-insensitivity: search "foo bar" now works for title "bar" on url "foo.com"
- Updated dependent packages to resolve vulnerabilities listed in npm audit

## [New shortcut] - 2023-09-18

- Add shortcut for make quick quicklinks when searching tabs.

## [New shortcut] - 2023-08-21

- Changed shortcut for Close Tab in the Search Tab command.

## [Added better debug] - 2023-04-25

- Increase exception message to diagnose issues

## [Search url] - 2023-04-01

- Added support to match url in bookmark and history search

## [New Window] - 2023-03-22

- Add the ability to create new window

## [Tab closing] - 2023-03-10

- Add the ability to close tabs

## [Performances improve] - 2023-01-26

- Improved getting open tabs speed

## [Profiles support] - 2023-01-24

- Added support for profiles across all commands
- Added support for opening tabs in different profiles

## [Search Bookmarks action] - 2022-12-17

- Added search bookmarks action
- Refactored code to use new useSQL hook

## [Open Tab feature] - 2021-11-08

- Add Open Tab action to action panel

## [History] - 2021-10-26

- Add Google Chrome history search

## [Initial Version] - 2021-10-20

- Add Google Chrome extension
