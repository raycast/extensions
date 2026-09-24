# Accent Letters

Two commands for people who write in more than one language.

## Remove Accents

Select text in any app, run **Remove Accents**, and it is pasted back without them.

```
Crème brûlée in São Paulo  →  Creme brulee in Sao Paulo
```

It also converts the letters Unicode cannot decompose — `ø ł đ ß æ œ þ ð` and Turkish dotless `ı` —
which a plain NFD normalisation silently leaves alone. It does nothing if there are no accents to
remove, rather than costing you an undo step, and tells you to select something if you have not.

## Search Accent Letters

682 accented letters, searchable by the things you actually remember:

| You type | You get |
| --- | --- |
| `polish` | ą ć ę ł ń ó ś ź ż |
| `two dots` | ä ë ï ö ü ÿ |
| `acute` | á é í ó ú ý … |
| `00e9` or `u+00e9` | é |
| `é` | é |

Enter pastes it into the app you came from. `⌘ .` copies it instead, and `⌘ ⇧ .` copies the HTML
entity.

Raycast's own Search Emoji & Symbols is excellent for finding a symbol by name. This is for the case
where you know the **language** or the **accent mark** but not the name — neither of which that
search indexes.

## Privacy

No network calls, no account, no telemetry. The 682 letters are a JSON file inside the extension,
generated from the Unicode Character Database 16.0.0 and CLDR 48.2.0 — the same data as the Accent
Letters website, apps and other add-ons, so a letter cannot strip one way here and another way
there.

More at [accentletters.wiki](https://accentletters.wiki/).
