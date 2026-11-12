# Soaring Symbols Changelog

## [Boarding Pass] - {PR_MERGE_DATE}

- Airline Information shows the callsign, hubs, founding year and former names, or the years flown for airlines that have ceased.
- Search both commands by callsign or former name: T'way Air finds Trinity Airways.
- Airlines that have ceased are marked with the year they stopped flying, and Airline Information shows each airline's status, flag carriers included.
- Jump between an airline, its group and the airlines it owns or once owned (AirAsia and Thai AirAsia), and between an airline and the one that carried it on (Jetstar Pacific and Pacific Airlines).
- The assets grid shows earlier logos below the current ones, with the years and name each was used under.
- Replaced logos appear as soon as the data updates, not up to a week later.

## [New Livery] - 2026-11-05

- New extension icon: the Soaring Symbols split-flap mark, matching the website.
- Fix the empty assets grid after the Soaring Symbols data update: tiles now come from the new `assets` field, and multi-color marks without a monochrome version no longer show a broken `-mono` tile.
- Show marks that only ship a monochrome file, such as the Qantas icon.
- Tint every monochrome version to match the Raycast theme.
- Load airlines and SVGs from the released Soaring Symbols package, so new airlines still arrive automatically but library changes can no longer break the extension.
- Fall back to the airline list bundled with the extension when the latest one can't be loaded, and show the last loaded list right away.

## [Departure] - 2026-06-03

- Initial release of Soaring Symbols.
