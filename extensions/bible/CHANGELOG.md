# Bible Search Changelog

## [New option, bug fix] - 2025-10-14

- Add option to show passages as separate list items
- Clarify copyright option wording
- Fix bug in searching with selected text when launched via a hotkey
- Simplify README, remove fluff
- Update screenshots

## [Windows support and enhancements] - 2025-10-13

- Support for Windows
- Remove "Press Enter to search" option. Searches are now always triggered on query change.
- Update bible versions data
- Don't include copyright in copied text
- Bug fixes in the React component causing undesired re-renders
- Upgrade to latest Raycast API and dependencies
- Remove dependency on `axios` (use native fetch) and unused `node-html-parser`
- Decouple parsing from display formatting

## [Search via selection] - 2023-12-23

- Search the bible using the selected text of the foreground application.
  Pro tip: Assign a keyboard shortcut to the command (like Ctrl+Cmd+Option + B)
  to easily trigger the look up of selected references.
- Add default bible version extension setting
- Add optional reference and version arguments to the Bible Search command
- Update to latest raycast tooling and API

## [Update available bible versions] - 2023-12-02

- Update the list of available bible translations using `scripts/updateBibleVersions.js`

## [Options for results and copied text] - 2023-10-04

- Add options to disable references and copyright in the search results and copied results

## [Enhancements] - 2022-12-15

- Fix issue with search not working smoothly.
- Update supported bible versions data

## [Initial Version] - 2022-04-24

- Search the bible by entering passage references
- Copy passages to your clipboard, or paste them into the foreground app
