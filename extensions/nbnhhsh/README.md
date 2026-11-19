# Nbnhhsh – Chinese Abbreviations

Look up Chinese internet abbreviations in Raycast using
[能不能好好说话](https://github.com/itorr/nbnhhsh).

## Usage

Find **Explain Chinese Abbreviations** in Raycast by searching for `nbnhhsh`,
`缩写`, `拼音`, or `slang`. Open it and type or paste an abbreviation such as `yyds`,
`nsdd`, or `awsl`. Separate multiple abbreviations with spaces, commas, or other
punctuation. Uppercase input works too.

Results are grouped by abbreviation. The service may return several possible
meanings; their order is supplied by nbnhhsh and does not represent a confidence
score. Fallback suggestions are marked **Tentative**. Source notes are preserved.

| Action                                           | Shortcut |
| ------------------------------------------------ | -------- |
| Copy the selected meaning                        | Enter    |
| Paste the selected meaning into the previous app | ⌘Enter   |
| Retry the current lookup                         | ⌘R       |
| Open the selected abbreviation on nbnhhsh        | ⌘O       |

Unknown abbreviations show a no-results message. Network failures offer a retry
and a link to the website. An internet connection is required. There are no
preferences, accounts, or API keys to configure.

## Privacy

The extension sends extracted letter/digit tokens of at least two characters to
`https://lab.magiconch.com/api/nbnhhsh/guess` after you pause typing. Surrounding
Chinese text and punctuation are removed locally; Latin words and numbers in
pasted text can still be sent. Submit only text you intend to share with that
service. No clipboard or selected text is read automatically.

Repeated lookups are cached in memory for five minutes, with at most 50 cached
queries. Retry bypasses the cache. The extension writes no search history to
disk and adds no analytics. Copy and paste occur only when you choose those
actions. Opening the website passes the abbreviation in its URL fragment.

## Attribution

Powered by [itorr/nbnhhsh](https://github.com/itorr/nbnhhsh) and its
[hosted service](https://lab.magiconch.com/nbnhhsh/). This is an unofficial,
independently written client. Lookup content belongs to its respective
contributors; meanings may be ambiguous, inaccurate, or contain slang.

The extension code and original speech-bubble icon are MIT licensed. No upstream
userscript code or artwork is bundled.
