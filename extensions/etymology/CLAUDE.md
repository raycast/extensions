# raycast-etymology

A public Raycast Store extension. Parent context (style, user profile, host
conventions) lives at `~/programming/CLAUDE.md` and is already loaded.

Deliberately **not** in `~/programming/raycast`. That monorepo is npm-workspace
based with a shared `@nate/raycast-lib` full of machine-local concerns (paths.env,
kitty sockets, yabai), and it has no publish step. A store extension has to be
self-contained, with its own `package-lock.json`, so it lives alone here.

## Layout

```
src/
├── model.ts        EtymNode, Entry, spine(), ancestors()
├── entry.ts        cache in front of the network; commands call this
├── cache.ts        Raycast Cache, 30-day TTL
├── render.ts       EtymNode -> markdown, one-line chain, {placeholder} template
├── langcodes.ts    code -> canonical name, read from assets at runtime
├── favorites.ts    LocalStorage pins
├── preferences.ts  typed prefs, declared rather than taken from raycast-env.d.ts
├── shortcuts.ts    the per-platform shortcuts Keyboard.Shortcut.Common lacks
├── hooks.ts        useDebouncedValue, so list browsing costs one request
├── sources/        the only place that knows Wiktionary exists
│   ├── index.ts      the resolution ladder
│   ├── client.ts     User-Agent, timeout, 429 backoff, NotFoundError
│   ├── wikitext.ts   section slicing, template scanner, senses, prose
│   ├── templates.ts  derivation templates -> tree
│   ├── tree.ts       data-ety-tree-json -> tree
│   ├── relations.ts  both Wiktionary relation vocabularies -> one Relation
│   └── search.ts     title autocomplete
├── components/     EntryDetail (pushed recursively), EntryActions
└── tools/          get-etymology, the AI tool
```

## Verified API facts

Re-derived once, 2026-09-14. Do not re-research these.

- `action=parse&prop=wikitext&page=<w>` returns 4-32 KB in ~0.7s. Etymology
  templates are literal: `From {{inh|en|enm|water}}, from {{inh|en|ang|wæter|t=water}}, ...`
- `action=parse&prop=text&page=<w>` returns 28-343 KB. Entries using
  `{{etymon|tree=1}}` embed `<ul class="etymonid" data-ety-tree-json="...">`, a
  nested tree of `{term, lang, lang_name, keyword, status, children}` where
  `children` is a list of *groups* (`{terms, keyword, keyword_label}`), not nodes.
  Present for 6 of 9 sampled words; `Category:English entries with etymology
  trees` holds ~46,000. `term` can be null and `status` can be an object.
- Language names need **three** modules, merged by `scripts/build-langcodes.mjs`:
  `Module:languages/code_to_canonical_name.json` (already code -> name),
  `Module:etymology_languages/canonical_names.json` and
  `Module:families/canonical_names.json` (both name -> code, invert them).
  Only the first has `la`; `la-med`, `xno` and `la-new` come from the second.
  10,210 codes, 191 KB.
- `action=expandtemplates` with
  `{{#invoke:languages/templates|getByCode|<code>|getCanonicalName}}` resolves a
  single code. Fallback for codes newer than the bundled snapshot.
- `rest.php/v1/search/title?q=&limit=` for autocomplete.
- `Special:RandomInCategory/<category>` answers 302; take the title from the
  resolved URL, not the body.
- Wikimedia User-Agent policy requires `<client>/<version> (<contact>)` and the
  word `bot`. Generic agents are blocked without notice.
- etymonline.com `robots.txt` allows `/word/` and `/search` for `*`, disallows
  `/api/`. Content is copyrighted authored prose. Link out, never render.

## Two branches

```
main    what gets published. Carries nothing it cannot ship.
local   main plus personal additions that are not part of the extension.
```

All work happens on `main`. `just local` rebases the personal branch onto main and
installs it; `just public` installs main; `just publish` refuses to run off main.
The additions and the notes explaining them live on `local`, so `main` has no
notion of them at all — which is the point, since the published diff is read by
people reviewing the extension.

Keeping them as a *single* commit is what makes the rebase cheap, and it makes
`git log main..local` a complete audit of the difference.

If `local` ever ends up with zero commits of its own, `git rebase main`
fast-forwards it and those additions vanish from the tip — still in history,
recoverable with `git revert --no-commit <the commit that removed them>`. `just
local` checks before rebasing, because it happened once.

## Rules

- `src/sources/` is the only place that knows Wiktionary exists. Everything else
  speaks `EtymNode` from `src/model.ts`. A bundled offline source (kaikki.org
  wiktextract dumps) must drop in without touching a view.
- Nothing machine-specific ships. No vault paths, no shell-outs, no
  `~/.config/paths.env`. If it would not work on a stranger's Mac, it does not
  belong here.
- Every rendered entry carries the CC BY-SA attribution and a link back.
- `ray lint` is the arbiter of manifest shape, titles and shortcuts. Keep clean.

## Working here

`just` is the task surface; `just` alone lists it. The recipes that matter:

```
just setup        npm install
just register     ray develop — teaches Raycast the extension exists
just build        code change; live as soon as it compiles
just install      build + restart; needed for any manifest change
just check        types + lint + parsers
just local        rebase the personal branch onto main and install it
just public       install main, the publishable version
```

`register` is the non-obvious one. `ray build` writes into
`~/.config/raycast/extensions/etymology/` but never tells the app anything, so a
never-registered extension does not appear in root search however many times it
is built. `ray develop` registers it; the registration outlives the watcher
(observed 2026-09-16: killed the watcher, it kept working across restarts).

`just parsers` is the check that matters. Typechecking cannot see that Wiktionary
moved a template argument or renamed an HTML attribute; that script asks for eight
words whose ancestry is not in dispute and fails when an answer stops coming back.
Run it before any release.

The install workflow lives in README.md too. Remember what the README is: the
store listing, read by whoever reviews the extension. Keep it about the extension.

## Publishing

`npm run publish` authenticates via GitHub and opens the PR against
`raycast/extensions` itself. No local fork needed. Before republishing after
community edits, run `npx @raycast/api@latest pull-contributions`.

Author field is `zak_katz`, matching the other extensions. `metadata/` still
needs 2000x1250 screenshots before the first PR.
