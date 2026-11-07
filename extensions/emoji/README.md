# Emoji Search

Find emojis by official name, shortcode, keyword, or everyday phrase, then paste or copy them.

## Recents and search

The command opens with **Recently Used** above **All Emojis** when there is history. Each successful copy or paste moves the emoji to the front of a 25-item, extension-local history. Existing history remains readable and is migrated automatically on the first successful history save; its original storage key is retained as a backup. This extension does not read macOS's system-wide emoji history.

Typing from the default view searches the full catalog. Clearing the query restores recents above the catalog, without duplicate rows. Choose a category in the dropdown to narrow browsing and searching.

Search ranks official names, curated aliases, shortcodes, and semantic keywords. Every query word must match, while punctuation-only emoticon keywords such as `:)` are matched exactly. All matching emojis remain available; broad searches such as `flag` are not truncated. Conservative typo correction runs only when ordinary matching finds no results; recency breaks equal-relevance ties. Try `roger that`, `laughing crying`, `chef's kiss`, or `low battery`.

The existing Unicode version, primary action, and shortcode preferences are retained. Shortcodes remain searchable even when their labels and copy action are hidden. The original yellow/base emoji catalog is unchanged.

## Offline data and development

Opening and searching makes no network requests. `npm run generate` builds bundled catalogs from the existing Unicode files in `assets/<version>/emoji-test.txt`, MIT-licensed [emojilib](https://github.com/muan/emojilib) keywords, and `data/github-shortcodes.json`. The checked-in shortcode snapshot records its source and retrieval date; refreshing it is an explicit maintenance step. Unicode source files retain their copyright and terms-of-use headers.

Generation runs automatically before `build` and `dev`. Run `npm install`, `npm run build`, `npm test`, `npm run typecheck`, and `npm run lint` to verify changes. `npm run build` writes to `dist` without replacing an installed extension; `npm run dev` imports the extension into Raycast for live testing.
