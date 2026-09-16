# Nihongo Typer

A Raycast extension that converts Romaji into Hiragana, Katakana, and common-word Kanji in real time, looks Kanji back up to its reading, and searches an English word straight to its Japanese equivalent — no need to switch your system keyboard layout to Japanese.

If you're learning Japanese, researching a trip, or looking up an authentic recipe, this lets you type a word the way you already type (Latin letters, or plain English) and get kana readings, likely Kanji spellings, and English matches instantly, ready to paste anywhere.

This is a quick lookup tool, not a full Japanese input method: Kanji suggestions come from a bundled dictionary of common single words, matched by exact reading, not from a grammar-aware conversion engine. It won't turn a full sentence into natural Kanji the way switching your OS to a Japanese IME would — for that, this is a shortcut for one word at a time, not a replacement.

## Commands

### Convert Romaji to Kana

Open the command and start typing a word using Latin letters.

- The **Hiragana** reading is listed first (e.g. `matcha` → `まっちゃ`).
- The **Katakana** reading is listed right below it (e.g. `matcha` → `マッチャ`).
- Press <kbd>Enter</kbd> on either result to run your configured primary action (see **Preferences** below).
- Open the action panel (<kbd>⌘</kbd><kbd>K</kbd>) for the other ways to use a result: copy without closing Raycast, or paste directly into the frontmost app.

Both results update on every keystroke, so you can see the conversion build up character by character as you type.

### Kanji suggestions

If the current Hiragana reading matches a common Japanese word, a **Kanji** section appears below with every known spelling for that word (e.g. `matcha` → `抹茶`), each with a short English gloss as its subtitle so you can tell homophones apart (e.g. `hashi` → `箸` "chopsticks" vs `橋` "bridge" vs `端` "edge"). Copy or paste any candidate the same way as a kana result.

Matching is exact-reading, single-word lookup against a bundled dictionary of ~17,000 common words — it won't segment or convert a multi-word phrase or full sentence into Kanji.

### Reverse lookup: Kana or Kanji to Romaji

Paste or type Hiragana or Katakana into the search bar and the command switches to a single **Romaji** result instead, so you can go the other direction without a separate command.

Pasting Kanji works too, but differently: `wanakana` has no built-in knowledge of Kanji readings (that requires a full morphological analyzer, e.g. MeCab/Kuromoji, which this extension deliberately doesn't depend on — see **Privacy**), so a pasted Kanji word is looked up in the same bundled dictionary used for Kanji suggestions. If the word is known, every possible reading is listed as **Readings** (e.g. `日本` → `にほん`/Nihon and `にっぽん`/Nippon, since it genuinely has two common readings); if it isn't in the dictionary, you'll see "No known reading for this Kanji" instead of a silently wrong result.

### English → Japanese search

Type an English word (or a short phrase, e.g. `green tea`) instead of Romaji, and an **English → Japanese** section appears below the usual Hiragana/Katakana/Kanji results with matching Japanese words — e.g. `bridge` → `橋` (はし). Each result shows its reading and gloss, and Kanji is offered as a separate copy action when the word has one.

This is a word-lookup, not a full thesaurus: matching is by whole word against a bundled index of ~22,000 common words' glosses, ranked so a word whose core meaning is the term you searched (e.g. 橋's gloss is literally "bridge") outranks one that merely mentions it in passing (e.g. a compound word whose gloss mentions "bridge" as an aside) — but with no real frequency data to draw on beyond JMdict's own common-word flag, ranking is a heuristic, not a guarantee the very first result is the best one for uncommon words.

### Recent conversions

By default, the last 10 romaji lookups are remembered and shown as a **Recent** list whenever the search bar is empty, so you can quickly re-copy a word without retyping it. Turn this off in **Preferences** if you'd rather nothing be remembered between searches.

## Conversion notes

- Conversion is powered by [wanakana](https://www.wanakana.com), the same rule set used by most browser-based Romaji-to-kana tools, so standard Hepburn spelling conventions apply (e.g. double consonants like `kk`, `ss`, `tt` produce the small `っ`/`ッ` sokuon, and `n` before `y` behaves as expected).
- As a convenience, `tch` is also treated as a sokuon trigger, so the common casual spelling `matcha` converts correctly instead of requiring the stricter `maccha`.
- Long vowels, youon (combined sounds like `kya`, `sha`, `cho`), and the particle-style `n` are all handled automatically.

## Preferences

- **Primary Action** — what pressing <kbd>Enter</kbd> on a result does: copy and close Raycast (default), copy only, or paste to the frontmost app.
- **Recent Conversions** — toggle whether recent conversions are remembered and shown when the search bar is empty. Enabled by default.
- **Pronunciation Voice** — which macOS system voice the Pronounce action uses: Kyoko (female, default), Otoya (male), or your system default.
- **Target Script** (Convert Clipboard) — whether Romaji in the clipboard becomes Hiragana (default) or Katakana.

## Pronunciation, furigana, and saved words

Any result can be spoken aloud with `⌘P`, using a macOS system voice (Kyoko or Otoya, selectable in preferences). Both are optional macOS downloads; if neither is installed the extension falls back to your default system voice.

Results that have a Kanji spelling can also be copied as furigana in three formats — `猫(ねこ)`, `猫[ねこ]` (Anki/Markdown), and `<ruby>猫<rt>ねこ</rt></ruby>`.

`⌘S` saves a word to **Saved Words**, which appears above Recent when the search bar is empty. `⌘I` toggles a detail pane showing the reading, Romaji, part of speech, and full meaning.

When the text you type isn't Romaji at all — an English word like `bridge` — the Hiragana and Katakana rows are hidden rather than showing a meaningless character-by-character transliteration, and only the dictionary results are listed.

## Convert Clipboard

A second, windowless command converts Romaji already in your clipboard and pastes the kana straight into the app you're typing in — no Raycast window opens. Assign it a hotkey and it works mid-sentence. Japanese in the clipboard is converted back to Romaji instead.

## Privacy

All conversion happens entirely locally, in-process. No network requests are made and no text you type ever leaves your machine. Recent conversions (when enabled) are stored only in Raycast's local, on-device storage for this extension — never synced or sent anywhere. Both the Kanji dictionary and the English search index are static files bundled with the extension, not a live lookup service.

## Dictionary data & attribution

Kanji suggestions, the Kanji-to-reading lookup, and English search are all generated ahead of time (see `scripts/build-kanji-dictionary.mjs`) from the `jmdict-eng-common` release of [jmdict-simplified](https://github.com/scriptin/jmdict-simplified), itself built from the **JMdict/EDICT** dictionary files.

This software uses the JMdict/EDICT dictionary files. These files are the property of the Electronic Dictionary Research and Development Group, and are used in conformance with the Group's licence.

The dictionary data (`src/data/kanji-dictionary.json`, `src/data/english-index.json`) is licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) by the EDRDG — this applies to those data files only; the extension's own source code is MIT licensed (see [License](#license)).

## Development

```bash
npm install
npm run dev     # run the extension locally in Raycast
npm run build   # type-check and build
npm run lint    # lint against Raycast's extension rules
```

To regenerate `src/data/kanji-dictionary.json` and `src/data/english-index.json` from a newer `jmdict-simplified` release, see the usage comment at the top of `scripts/build-kanji-dictionary.mjs`.

## License

Licensed under the MIT License. See [LICENSE](LICENSE).
