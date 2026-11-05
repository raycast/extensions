# Soaring Symbols Changelog

## [New Livery] - 2026-11-05

- New extension icon: the Soaring Symbols split-flap mark, matching the website.
- Fix the empty assets grid after the Soaring Symbols data update: tiles now come from the new `assets` field, and multi-color marks without a monochrome version no longer show a broken `-mono` tile.
- Show marks that only ship a monochrome file, such as the Qantas icon.
- Tint every monochrome version to match the Raycast theme.
- Load airlines and SVGs from the released Soaring Symbols package, so new airlines still arrive automatically but library changes can no longer break the extension.
- Fall back to the airline list bundled with the extension when the latest one can't be loaded, and show the last loaded list right away.

## [Departure] - 2026-06-03

- Initial release of Soaring Symbols.
