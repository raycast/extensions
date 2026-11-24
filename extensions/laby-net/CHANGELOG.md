# Laby.net Changelog

## [Windows Support and Enhancements] - {PR_MERGE_DATE}

- **Windows**: Now supports Windows platform
- **Search Skins and Search Capes**: Search Textures is now split into two separate commands
- **Profile Cloaks**: Cloak textures appear on profile details
- **Profile Details**: Skin and cape totals appear in their section headings
- **Search Results**: Failed searches surface errors, and profile loads can be retried
- **Search Profiles**: Short or overlong names no longer leave stale results, and special characters are encoded for API requests
- **Badge Icons**: Badge artwork loads from Laby's API icon endpoint

## [Maintenance] - 2026-03-16

- Update axios to ^0.30.3 to address CVE for denial of service via `__proto__` key in `mergeConfig`

## [API Adjustments] - 2024-10-14
- Adjust models to match the latest API changes
- Add icon and link to profile badges

## [Upgrade to v3 API] - 2023-12-19

- Update laby.net api to v3
- Remove accountType property which was removed from api
- Fix AxiosError: Request failed with status code 504

## [Initial Version] - 2022-12-06

- Added initial version of profile search & page
- Added basic texture search (skins & capes)
