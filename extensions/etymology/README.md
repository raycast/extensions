# Etymology

Trace where a word comes from, one ancestor at a time.

An entry opens with what the word means, then where it came from:

> **quixotic**
>
> **Adjective**
> 1. Resembling or characteristic of the Spanish chivalric hero Don Quixote.
> 2. Overly optimistic and moralistic.
>
> | | | |
> | :-: | --- | --- |
> | ← | Spanish | **Quixote** |
>
> Also from English **-ic**

Press enter on any ancestor to open it as its own entry and keep going.
Borrowings are marked apart from inheritances, compounds name their parts, and a
word with two unrelated etymologies shows both.

Deep trees are not expanded in place. `computer` reaches nine levels down to
Proto-Indo-European, most of it the private history of the suffix `-er`, so the
main line of descent is shown and the branches are named. Following one opens it
as its own entry.

## Commands

| Command | What it does |
| --- | --- |
| Search Etymology | Look up a word and walk its chain of ancestors |
| Look up Selection | Show the etymology of the currently selected text |
| Show Random Etymology | Open a random word that has a full etymology tree |

An AI tool, **Get Etymology**, exposes the same data to Raycast AI.

## Actions

`Follow Ancestor`, `Show Tree` / `Show Prose`, `Copy Chain`, `Copy as Markdown`,
`Copy Etymology`, `Copy Wiktionary Link`, `Open in Wiktionary`,
`Open in Etymonline`, `Pin to Favorites`, `Refresh from Wiktionary`.

`Copy Chain` gives one line, oldest first:

```
Proto-Indo-European *wódr̥ > Proto-Germanic *watōr > Proto-West Germanic *watar >
Old English wæter > Middle English water > English water
```

`Copy as Markdown` runs through the **Markdown Template** preference, so the
output can be shaped for whatever you paste into. Placeholders: `{term}`,
`{language}`, `{chain}`, `{tree}`, `{prose}`, `{url}`, `{attribution}`.

## Where the data comes from

English Wiktionary, through the public MediaWiki API. Definitions and etymology
come out of the same request, so showing what a word means costs nothing extra.
Ancestry is read two ways:

- Entries using `{{etymon|tree=1}}` carry a machine-readable ancestor tree in the
  rendered page, assembled by Wiktionary from each ancestor's own entry. Around
  46,000 English entries have one, and it reaches much deeper than any single
  page states.
- Everything else is read from the derivation templates in the wikitext
  (`{{inh}}`, `{{bor}}`, `{{der}}`, `{{affix}}`, and the rest).

Results are cached for 30 days. No account, no API key, no tracking.

Etymonline has no public API and its entries are copyrighted prose, so this
extension links to it and never reproduces it.

## Install from source

Needs [just](https://github.com/casey/just), or run the commands under each
recipe by hand.

```
just setup       npm install
just register    tell Raycast the extension exists — once per machine
just install     build into Raycast and restart it
```

`register` runs `ray develop`; press Ctrl-C once it prints "built successfully".
Registration outlives the watcher, so this is a one-time step. `ray build` alone
never tells Raycast anything, which is why a freshly built extension that has
never been registered does not appear in root search.

After that:

| Change | Command |
| --- | --- |
| Code only | `just build` — live as soon as it compiles |
| Manifest (new command, title, preference, AI tool) | `just install` — Raycast caches `package.json` and only rereads it on launch |
| Extension vanished from root search | `just register` |

`just check` runs the typechecker, the linter, and the parsers against live
Wiktionary before you commit. `just` on its own lists everything.

## Attribution

Etymology text and structure come from [English Wiktionary](https://en.wiktionary.org),
licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
Every entry links back to its source page.
