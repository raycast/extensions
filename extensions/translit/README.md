# Translit - Latin to Cyrillic Converter

Convert Latin characters to Russian Cyrillic using phonetic transliteration
rules. This Raycast extension makes it easy to transliterate text on the fly,
perfect for when you need to write in Russian but are using a Latin keyboard.

## Features

- Real-time transliteration from Latin to Russian Cyrillic characters
- Clean, intuitive interface
- Copy transliterated text with a single click
- Supports standard Russian phonetic transliteration rules, including the most
  common alternative spellings (`shch`/`shh` for `щ`, `yo`/`jo`/`ö` for `ё`, and
  more)
- All-caps aware: uppercase input produces uppercase Cyrillic, including the
  hard and soft signs (`OB#EKT` → `ОБЪЕКТ`)

## Note

This initial release supports only Russian Cyrillic alphabet transliteration.
Support for other Cyrillic alphabets (Ukrainian, Bulgarian, Serbian, etc.) may
be added in future releases.

## Installation

1. Make sure you have [Raycast](https://raycast.com/) installed
2. Install the extension from the Raycast Store

## Usage

1. Open Raycast (default shortcut: ⌘+Space)
2. Type "Latin to Cyrillic", "Translit", or any of the keywords (translit,
   transliterate, cyrillic, russian, транслит)
3. Enter your Latin text in the input field
4. Preview of the Russian Cyrillic phonetic transliteration will appear
   automatically
5. Use the "Copy" action (⌘+Enter) to copy the transliterated text into your
   clipboard

## Transliteration scheme

| Cyrillic | Latin variants                     |
| -------- | ---------------------------------- |
| а        | a                                  |
| б        | b                                  |
| в        | v                                  |
| г        | g                                  |
| д        | d                                  |
| е        | e                                  |
| ё        | yo, jo, ö                          |
| ж        | zh                                 |
| з        | z                                  |
| и        | i                                  |
| й        | j                                  |
| к        | k                                  |
| л        | l                                  |
| м        | m                                  |
| н        | n                                  |
| о        | o                                  |
| п        | p                                  |
| р        | r                                  |
| с        | s                                  |
| т        | t                                  |
| у        | u                                  |
| ф        | f                                  |
| х        | h, x                               |
| ц        | c                                  |
| ч        | ch                                 |
| ш        | sh                                 |
| щ        | shch, shh, w                       |
| ъ        | # (or ## in caps), tvz              |
| ы        | y                                  |
| ь        | ' (or '' in caps), mjz              |
| э        | je, ä                              |
| ю        | yu, ju, ü                          |
| я        | ya, ja, q                          |

Case rules: capital input yields capital Cyrillic. For the sign markers `#` and
`'` the case is taken from the surrounding letters, so `Ob'ekt` → `Объект` and
`OB#EKT` → `ОБЪЕКТ`; explicit uppercase markers are `##` → `Ъ` and `''` → `Ь`.
Any character not in the table (digits, punctuation, emoji, other scripts) is
passed through unchanged.

### Known collisions

Because the scheme is unambiguous in one direction only, some Latin letter
combinations that are not intended as transliteration still get converted.
These collisions are expected behavior of a phonetic scheme:

| Latin input | Result | Intended                |
| ----------- | ------ | ----------------------- |
| `it's`      | итьс   | English "it's"          |
| `#tag`      | ътаг   | hashtag / markdown note |
| `tvzor`     | ъор    | a word containing `tvz` |

Similarly, `shch` greedily maps to `щ`, which is wrong for the (rare in
Russian) sequence `шч`. If a literal Latin fragment must survive untouched,
transliterate the Russian parts around it and type the fragment afterwards.

## Examples

| Latin Input | Russian Cyrillic |
| ----------- | ----------------- |
| Privet      | Привет            |
| Zhenya      | Женя              |
| dobryj den' | добрый день       |
| shhuka      | щука              |
| shchuka     | щука              |
| Ob'ekt      | Объект            |
| OB#EKT      | ОБЪЕКТ            |

## Development

Run the unit tests for the transliteration module with the built-in Node test
runner:

```
npm test
```

## Credits

Created by [tsibog](https://github.com/tsibog)
