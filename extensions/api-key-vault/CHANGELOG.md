# Changelog

All notable changes to this extension will be documented in this file.

## [0.0.1] - {PR_MERGE_DATE}

### Added
- Create / Update / Find / Delete commands for managing API keys locally in Raycast.
- Find supports partial matching across key name, tags, application, and service; selecting an item copies the API key to the clipboard.
- Key name validation + normalization (kebab-case) with global uniqueness enforcement.
- Update flow supports masked API key display; stored secret only changes when a new value is entered.
