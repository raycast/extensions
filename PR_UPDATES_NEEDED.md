# Files to Update in PR #22658

## 1. Add CHANGELOG.md

Create a new file `extensions/rg-adguard-links/CHANGELOG.md`:

```markdown
# RG Adguard Links Changelog

## [Initial Version] - 2025-11-04

### Added

- Initial release of RG Adguard Links extension
- Automatic generation of download links from Microsoft Store URLs, Product IDs, or app names
- Display of download files with metadata (file size, expiry date, SHA-1 checksum)
- Actions to open links in browser, copy URLs, or copy SHA-1 hashes
- URL validation for Microsoft Store links
- Paste action to quickly insert URLs from clipboard
- Integration with store.rg-adguard.net API for fetching download links
```

## 2. Ensure package.json has $schema

The package.json should start with:
```json
{
  "$schema": "https://www.raycast.com/schemas/extension.json",
  ...
}
```

These changes should fix:
- ✅ Changelog Enforcer check
- ✅ Extensions validation check
