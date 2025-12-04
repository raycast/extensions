# DevDocs Extension

## [Changes] - 2025-02-26

- Add support for search aliases (filtering on exact match)

## [Fix] - 2024-10-02

- Account for settings file imports with multiple preferences set

## [Changes] - 2024-10-01

- Add new command to import enabled documentations from DevDocs.io
- Split documentations into two sections: "preferred" (imported from DevDocs website); remaining sets show as "available"
- Update documentation icon fetching to pull from DevDocs GitHub repo (instead of favicon) to use higher resolution and better quality images

## [New Preference] - 2024-08-16

- Add preference to indicate which "open" action should appear first in action panel

## [Changes] - 2024-07-27

- Update list item icon
- Add `entry.type` as a tag in the list to make it more clear where the entry is coming from
- Update screenshots

## [Changes] - 2024-07-21

- Update icon and include dark mode version
- Update command name and copy to match "documentations" terminology for consistency with DevDocs
- Bump Raycast API and utils
- Add shortcut to create Quicklink
- Add action to copy documentation slug to clipboard
- Clarify default Quicklink name
- Add navigation reference to current documentation

## [Fix] - 2023-03-14

- Fixed wrong link in `Open in DevDocs`

## [Deeplinks] - 2023-02-07

- Add deeplinks support

## [Dropdown Support] - 2022-09-16

- Use a single view instead of two thanks to the new dropdown component
