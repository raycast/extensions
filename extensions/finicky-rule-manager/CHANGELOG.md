# Finicky Rule Manager Changelog

## [Browser Detection and Reassign Browser] - {PR_MERGE_DATE}

- Detect every installed app that can open web links (Dia, Helium, Zen, beta and nightly builds, and more) instead of a fixed list
- Keep a rule's browser selected when editing, even if that browser isn't detected, instead of silently switching to the first one
- Group rules by browser and flag browsers that aren't installed
- Add Reassign Browser to move every rule from one browser to another, with an option to update the default browser
- Add a Reassign Browser AI tool
- Fix importing configs whose comments contain quotes or brackets, which could make the whole file import as zero rules
- Read rule names from the `// Rule:` comment instead of from the URL, and repair names like `example.com/*"` left by earlier imports
- Read regex rules written as `/.../.test(urlString)`, including ones with escaped slashes
- Refuse to overwrite a config that has rules Raycast hasn't imported yet, and offer to import them instead

## [Require Config Path Preference] - 2026-05-05

- Make the Finicky config path a required preference with a default of `~/.finicky.js`

## [Initial Version] - 2026-05-05

- Manage Finicky browser routing rules from a Raycast list view (create, edit, enable/disable, delete)
- Guided URL pattern builder and manual wildcards/regex input
- Import existing rules from a `.finicky.js` config file
- Create rules directly from open browser tabs via the Raycast Browser Extension
- Change the default browser from a detected list of installed browsers
- AI tools for listing, creating, updating, deleting, and finding conflicts in rules
