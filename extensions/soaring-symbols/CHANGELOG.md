# Soaring Symbols Changelog

## [Red-Eye] - {PR_MERGE_DATE}

- In dark mode, logos and icons switch to their version for dark backgrounds, so navy and black lettering stays readable: the airline's own where it has one (Air Canada, Vietnam Airlines), else the mark in white.
- The assets grid has a section for each mark (logo, stacked logo, icon, tail) with its color, monochrome and, in dark mode, dark background files, as on the website; in light mode, copy the dark background file from the color tile's actions. Stacked logos, with the name under the mark, are new (Japan Airlines, Vietnam Airlines).
- Earlier logos move to a dropdown in the assets grid's search bar.
- Airlines go by their full names, such as Swiss International Air Lines, and search still finds them by shorter ones like SWISS or THAI, which Airline Information lists as "Also Known As".
- Cargo airlines, starting with Cargolux, are marked "Cargo" in the grid and in Airline Information, and searching "cargo" lists them.
- New airlines and logos keep arriving after the Soaring Symbols 0.5 release.

## [Codeshare] - 2026-11-15

- New Browse Alliances command: oneworld, SkyTeam, Star Alliance and disbanded alliances, with their marks to copy or download and the airlines that fly, or flew, in each.
- The alliance filter lists every alliance with its mark, disbanded ones included: Value Alliance finds Scoot.
- Airline Information shows the alliance's mark, the alliances an airline has left, and its country by flag and name (🇸🇪 Sweden).
- Scandinavian Airlines is listed under Sweden and, as their joint flag carrier, shows the flags of Denmark, Norway and Sweden.
- New airlines and logos keep arriving after the Soaring Symbols 0.4 release.

## [Boarding Pass] - 2026-11-12

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
