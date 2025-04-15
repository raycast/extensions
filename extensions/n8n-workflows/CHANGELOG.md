# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- (Add future changes here)

## [1.0.0] - 2025-04-15

### Added
- Initial release for the Raycast Store.
- **Search Workflows** command: Search, filter by tags, activate/deactivate workflows, view details, and open in n8n instance.
- **Search Triggerable Webhooks** command: Find active workflows with webhook triggers, filter by tags, and trigger them with custom data (body, query, headers).
- **Save Command** feature: Save webhook trigger configurations as reusable commands.
- **Run Saved n8n Command**: Execute previously saved webhook trigger configurations.
- **Reset n8n Extension Storage** command: Clear local extension data for troubleshooting.
- Preferences for n8n Instance URL and API Key.
- Preference to remember the tag filter selection in "Search Workflows".
- Uses n8n API for all interactions, removing dependency on the deprecated n8n Desktop App.

*(Note: Previous entries have been consolidated into this initial release description as the extension is being prepared for its first official store version.)*
