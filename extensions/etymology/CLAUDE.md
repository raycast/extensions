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
│   ├── search.ts     title autocomplete
│   └── etymonline.ts LOCAL ONLY - see below, must not ship
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
local   main + one commit adding the Etymonline excerpt. Never merge it back.
```

All work happens on `main`. `just local` rebases the local branch onto main and
installs that; `just public` installs main. `just publish` refuses to run off
main, and `just store-check` fails on local and passes on main, so the two states
cannot be confused for one another.

Keeping the excerpt as a *single* commit on `local` is what makes the rebase
cheap: it touches four files (`src/sources/etymonline.ts`, `src/preferences.ts`,
`src/components/EntryDetail.tsx`, `package.json`) and conflicts only when those
same four move on main.

If `local` ever ends up with zero commits of its own, `git rebase main`
fast-forwards it and the excerpt disappears from the tip — it is still in history,
recoverable with `git revert --no-commit <the commit that removed it>`. `just
local` checks for this before rebasing, because it happened once.

## Why Etymonline is local only

`src/sources/etymonline.ts` fetches an excerpt from etymonline.com. It must never
reach the store.

Checked 2026-09-17: no public API; `robots.txt` allows `/word/` and `/search` for
`*` and disallows `/api/`; the terms at `etymonline.com/legal/terms` say nothing
about scraping or automated access but declare the content "the exclusive
property of Etymonline". Owned by Harper Family LLC, proprietary, no open licence.
A self-identifying User-Agent is served normally, so there is no need to pose as a
browser and the code does not.

Reading it yourself on your own machine is one thing; shipping an extension that
reproduces those entries for everyone is another. Hence: a preference off by
default, a capped excerpt rather than a mirror, and `npm run check-store-ready`,
which exits non-zero while the module, the preference or its use site exists.

The parser keys on a `<section>` whose class list contains `prose`. The page is
Tailwind utility classes with no embedded JSON, no semantic class and no
microdata, so that anchor will break on any restyle. It fails to `undefined` and
the pane falls back to the link.

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
just store-check  refuses to publish while Etymonline is present
```

**There is no private build and no public build.** There is one build. The
Etymonline excerpt is a preference that ships off; the only thing that differs at
publish time is that the module is deleted first. To use it locally: `just
install`, then Raycast → Extensions → Etymology → tick *Show Etymonline Excerpt*.

`register` is the non-obvious one. `ray build` writes into
`~/.config/raycast/extensions/etymology/` but never tells the app anything, so a
never-registered extension does not appear in root search however many times it
is built. `ray develop` registers it; the registration outlives the watcher
(observed 2026-09-16: killed the watcher, it kept working across restarts).

`just parsers` is the check that matters. Typechecking cannot see that Wiktionary
moved a template argument or renamed an HTML attribute; that script asks for eight
words whose ancestry is not in dispute and fails when an answer stops coming back.
Run it before any release.

The install workflow lives in README.md too, minus Etymonline. The README is the
store listing: a reviewer reads it, and it must not carry instructions for pulling
proprietary content.

## Publishing

`npm run publish` authenticates via GitHub and opens the PR against
`raycast/extensions` itself. No local fork needed. Before republishing after
community edits, run `npx @raycast/api@latest pull-contributions`.

Author field is `zak_katz`, matching the other extensions. `metadata/` still
needs 2000x1250 screenshots before the first PR.
