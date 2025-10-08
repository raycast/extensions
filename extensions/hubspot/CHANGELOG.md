# HubSpot Changelog

## [Tasks Management] - 2025-10-08

- Added "Search Tasks" command to search and list HubSpot tasks
  - Filter to show only incomplete tasks, sorted by due date (earliest first)
  - Owner dropdown filter to view tasks by assigned user
  - Color-coded priority tags (high=red, medium=orange, low=blue) and status tags (completed=green, incomplete=red)
  - Toggle between compact list view and detailed view
  - Display task associations (contacts, companies, deals) with clickable links to HubSpot
  - Actions to mark tasks as complete/incomplete
  - Copy task ID to clipboard
  - Keyboard shortcuts: Enter=toggle details, Cmd+O=open in HubSpot, Cmd+Shift+E=mark complete, Cmd+Shift+C=copy ID
- Added "Create Task" command to create new HubSpot tasks
  - Set title, notes, due date (defaults to 2 days from now), owner, priority, and type
  - Searchable dropdowns to associate tasks with contacts, companies, and deals
  - Form-based interface for easy task creation

## [Copy Contact Properties] - 2025-06-10

- You can now `copy` some properties of a Contact through new "Copy to Clipboard..." submenu (ref: [Issue #19583](https://github.com/raycast/extensions/issues/19583))
- Add placeholder to AccessToken Preference
- Modernize extension to use latest Raycast config

## [Updates] - 2025-03-12
- Added option in settings to choose custom company properties to display in company search
- Added option to choose how to format said properties, eg currency, percentage

## [Updates] - 2024-07-23

- Update dependencies, linting code
- Add search through descriptions for companies ([#13602](https://github.com/raycast/extensions/issues/13602))

## [Added new commands] - 2024-02-02
- Search Companies

## [Fix] - 2023-10-03

- Fixed a bug that caused the extension to crash.

## [Enhancements] - 2022-02-27

- Added a call to fetch account info (portalId, uiDomain) to open contact and deal URLs in the browser.
- Keeping previous detail toggle action as an option.
- Display a link to open in browser.

## [Added new commands] - 2022-12-10

- Ability to View Calls
- Ability to View Communications

## [Initial Version] - 2022-12-09

- Ability to Search for Deals
- Ability to Search for Contacts
