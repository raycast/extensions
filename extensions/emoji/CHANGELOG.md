# Emoji Changelog

## [Improve Recents and Search] - {PR_MERGE_DATE}

- Keep 25 unique recent emojis and move reused emojis to the front after every copy or paste.
- Preserve existing recent history automatically and show recents above the full catalog.
- Rank searches across official names, shortcodes, keywords, and curated everyday aliases, with conservative typo correction.
- Keep all matching results available and support exact punctuation-only emoticon keywords such as `:)`.
- Bundle catalogs and shortcodes for offline use; display recents without waiting for the full catalog.
- Await recent-history saves and report clipboard, catalog, and storage failures.

## [Update] - 2024-06-25

- Updates the default Unicode version to Unicode 15.1.

## [Update] - 2023-05-19

- Updates the default Unicode version to Unicode 15.0.

## [Fixes] - 2022-12-20

Vendor [Generate Emoji List](https://github.com/leodr/generate-emoji-list) and emoji data to not rely on unicode.org, as [it is currently down](https://home.unicode.org/technical-alert-unicode-technical-website-down/).

## [Improvements] - 2022-07-27

- Upgrade default Unicode version to 14.0;
- Add Copy Shortcode action;
- Add View on Emojipedia Action;
- Add preference for Primary action

## [Fix] - 2022-04-26

- Disables recently used emojis while searching

## [Fuzzy Search and Categories Dropdown] - 2022-03-21

- New extension icon;
- More easily find emojis thanks to more keywords and fuzzy search;
- Emojis categories have been moved to a dropdown;

## [Add preferences] - 2022-02-11

- Added in functionality to take user back to root search after copying an emoji.

## [Add preferences] - 2021-11-17

- Add preferences to Emoji, and print nicer names

## [Fixed typo] - 2021-11-16

- Fix Emoji extension PasteAction title typo

## [Fix] - 2021-10-15

- Fix typo.

## [Add Extension] - 2021-10-15

- Add Emoji extension
