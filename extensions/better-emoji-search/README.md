# Better Emoji Search

A Raycast emoji picker with accurate recently used history and natural-language search. It is an independent fork of the open-source [Emoji Search extension](https://www.raycast.com/FezVrasta/emoji).

## Features

Whenever an emoji is pasted or copied through this extension, it is moved to the front of **Recently Used**. The list keeps the 25 most recently used unique emojis.

The command opens with **Recently Used** at the top and **All Emojis** underneath when there is history. Recent emojis are omitted from the lower section to avoid duplicate rows. Typing in the search field searches all emojis, and clearing it returns to the two-section view. The category menu also lets you choose **All Emojis** or another category. On first use, before any emoji has been selected, the command opens on **All Emojis**.

Search prioritizes exact emoji names, complete name tokens, aliases, shortcodes, and then semantic keywords. Every query word must match. Typo correction runs only when ordinary matching finds no results, so searches such as `mind blown` and `thumbs up` no longer include unrelated fuzzy matches. Recent usage breaks ties between equally relevant matches. The curated alias list in `src/aliases.ts` adds more than 850 everyday phrases and alternate names for 280+ emojis, including `laughing crying`, `roger that`, `low battery`, `boba`, and `do not disturb`.

Search fields are prepared once, on the first search. Recents render independently of the full catalog using a small bundled label index. Emoji data and shortcodes are bundled; opening and searching the command makes no network requests. Shortcodes remain searchable when **Show Shortcodes** is off.

Copy and paste actions await their history save and report save failures. History stores at most 25 emoji identifiers. Existing history is migrated automatically, with the original storage key retained as a backup.

Unicode version preferences and configurable paste/copy actions remain available.

Recents are local to this extension. It does not read or modify macOS's system-wide emoji history. The original extension's yellow/base emoji behavior is intentionally retained.

## Use

Open **Search Emoji** under **Better Emoji Search**. Press Return to paste the selected emoji into the active app, or use the action panel to copy it instead. You can change the primary action in the extension's preferences.

## Develop locally

1. Run `npm install` in this directory.
2. Run `npm run dev`.
3. Open **Search Emoji** under **Better Emoji Search** in Raycast.

The fork uses a distinct package name and subtitle, so it can be tested alongside the original extension. If both commands are installed, you can disable the original **Search Emoji** command and assign its hotkey to the one under **Better Emoji Search**.

If Raycast loses the compiled command after an update, run `npm run build` here to restore it. The build does not require a continuously running development process.

## Data and verification

`npm run generate` prepares the catalogs from the vendored [Unicode emoji test data](https://www.unicode.org/emoji/charts/emoji-test.txt) in `data/unicode`, the MIT-licensed [emojilib](https://github.com/muan/emojilib) keyword data, and the checked-in GitHub shortcode snapshot in `data/github-shortcodes.json`. The Unicode files retain their copyright and terms-of-use headers. Generation runs automatically before `build` and `dev` and requires no network access. The shortcode snapshot records its source and retrieval date; refreshing it is an explicit maintenance step. GitHub's image filenames omit some joiners and variation selectors, so aliases are matched to canonical Unicode entries.

Run `npm test` for ranking, typo exclusion, offline data, migration, concurrent history saves, and storage-error coverage. Run `npm run lint` and `npm run build` before installing an update.

## Attribution

Derived from `extensions/emoji` in the MIT-licensed [Raycast Extensions repository](https://github.com/raycast/extensions), authored by Federico Zivolo (`FezVrasta`) with contributions from `sxn`, `maxdavid`, `sinasab`, and `pernielsentikaer`. The upstream source snapshot is [commit `8a4409d`](https://github.com/raycast/extensions/commit/8a4409d03a593ea0b69b825b525c80753102a379). The original MIT license and copyright notice are retained in `LICENSE`.
