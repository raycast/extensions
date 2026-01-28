# Port from Project Name Changelog

## [Edit Port Feature] - 2025-12-03

- Add ability to manually edit ports to any value (1000-9999)
- Prevent duplicate port assignments with validation
- Automatically shift generated ports away from manually edited ports
- Protect edited ports from being overwritten by future generations

## [Initial Release] - 2025-11-17

Initial version with:
- Generate deterministic 4-digit ports from project names
- View and manage port generation history
- Copy ports to clipboard
- Search through port history