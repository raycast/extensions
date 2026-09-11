# Keysi for Raycast

Search Keysi's cheat sheets from Raycast, and drive Keysi's panel without
reaching for its hotkey.

## Commands

| Command | What it does |
| --- | --- |
| **Search Cheat Sheets** | Searches Vim, tmux, Figma, Slack and anything you wrote yourself. Takes an optional query as an argument. Works with Keysi closed. |
| **Show Shortcuts** | Opens Keysi's panel for the app you were in before Raycast. An optional argument opens it with the search already typed. |
| **Practice Shortcuts** | Opens Practice Mode. |
| **Show Progress** | Opens Keysi's recap of the shortcuts you've learned. |

All four are part of Keysi Pro. Every install of Keysi includes 14 days of
it, and Keysi itself — the hold-⌘ overlay, click-to-run, custom sheets,
search — stays free with or without this extension. See
[Why the commands are Pro](#why-the-commands-are-pro).

## Searching

Rows are grouped by sheet. Two things reorder them:

- **The app you were just in floats to the top.** A sheet declares the apps
  it is about (`match.bundleIDs`, `match.processNames`), and the section for
  a matching sheet is first, labelled with why. Keysi does the same thing in
  its overlay, with one advantage this cannot have: it reads the processes
  running *inside* the frontmost terminal, which is how its Vim and tmux
  sheets appear when you're in Ghostty. An extension can only see the app
  itself, so those two only float when the app is literally named `vim` or
  `nvim`.
- **Recently used rows come first, until you type.** Copying a row's keys or
  opening it in Keysi remembers it on this Mac. Once there is a query, the
  section goes away rather than showing the same row twice.

Each row can copy its keys (↵), copy the command name (⌘⇧N), copy the pair as
a Markdown bullet (⌘⇧C), open the row in Keysi's panel (so you can *run* it),
or reveal the sheet file that produced it (⌘⇧F) — which is the fastest way to
fix a sheet you wrote.

## Why it's split in two

Raycast extensions cannot read the Accessibility API — no extension can —
so anything about the **live menu bar of the frontmost app** has to be asked
of Keysi, which already holds that permission. That goes over Keysi's
`keysi://` URL scheme, which carries actions only and never returns data.

**Cheat sheets are the opposite.** They are static JSON files on disk, they
are the half of Keysi that needs no special permission, and they cover the
tools whose shortcuts live nowhere the system can see them. So this
extension reads them directly, which means Search Cheat Sheets works whether
or not Keysi is running.

## The frontmost-app problem

Opening Raycast makes Raycast the active application. It is an `LSUIElement`
agent, which sounds like it should be invisible to that — it is not. So
"show me the shortcuts for the app I'm in" would reliably show you Raycast's
own near-empty menu bar.

Keysi handles this on its side: `TargetAppFilter` excludes Raycast, Alfred
and LaunchBar from the app it targets, so by the time a command runs, "what
was the user in?" has already ignored the launcher used to get here. This
extension does not need to do anything about it, but it only works because
that exists.

## Requirements

[Keysi](https://keysi.io) installed, for everything except Search Cheat
Sheets. Built-in sheets are read from the app bundle in `/Applications` or
`~/Applications`; your own sheets come from
`~/Library/Application Support/Keysi/Sheets`.

If Keysi lives somewhere else — it is a direct download, so plenty of people
put it anywhere — point the **Keysi Application** preference at the bundle.
The two usual locations are still searched behind it, so setting it wrong
cannot break a working install.

## Why the commands are Pro

Reaching Keysi from *somewhere else* — a launcher, a Shortcuts workflow, an
automation — is what Keysi Pro buys. Nothing that was free became paid to
make room for it; see `ProFeature.integrations` in the app for the same
statement in the place that enforces it.

How that is enforced is worth being exact about, because this extension is
open source and anything it checks is visible and removable:

- **The three commands that drive the app are refused by the app.** Keysi
  checks the entitlement itself when it handles `keysi://`, so the check in
  here is the *explanation*, not the lock — without it the only feedback
  would be Keysi's Settings window appearing for no stated reason.
- **Search Cheat Sheets is the exception, and is a hint.** It never talks to
  Keysi — that is what makes it work with the app closed — so Keysi has no
  opportunity to refuse it. It reads
  `~/Library/Application Support/Keysi/integration-tier.json`, which Keysi
  writes at launch and on every tier change. Editing that file buys you
  offline search over JSON already on your own disk.
- **The file carries a deadline.** Keysi is a menu-bar agent that can be left
  quit for weeks, and it only rewrites that file while it runs. `proUntil` is
  its statement of when Pro lapses, so a trial that ran out in the meantime
  expires here too rather than reading as unlocked forever. A perpetual
  license has no deadline and carries none.

## Development

```bash
npm install
npm run dev     # live-reload into Raycast
npm test        # node --test, run against the repo's real sheet files
npm run lint
```

The tests deliberately run against `Keysi/Resources/BuiltinSheets` rather
than fixtures: the sheet format is defined by Keysi's Swift side, and these
exist to catch it drifting away from what this extension expects.

## Publishing

`metadata/` holds the store's screenshots — two of them, both of Search
Cheat Sheets. They cannot be generated from a script: they have to be taken
against a running Raycast with this extension loaded, which also means a
machine with Keysi actually installed, since `Search Cheat Sheets` reads the
bundled sheets out of `Keysi.app` and shows its empty state without them.
The other three commands are `no-view` and have no Raycast UI to capture.

What the store expects, as of the checks run on 2026-09-11:

- **2000 × 1250 px**, 16:10 landscape, PNG. No dark-mode variant.
- Between three and six of them. Six is the maximum.
- The same background across all of them, nothing else on screen, no other
  app visible, no real licence keys or personal paths in frame.

Raycast's own `Window Capture` command saves at the right size into
`metadata/` — run it with the extension open in Raycast rather than
screenshotting by hand, which gets the dimensions wrong.

Three is Raycast's recommendation rather than a minimum, and `ray lint`
passes with two. What is worth capturing is `Search Cheat Sheets` doing the
thing that justifies the extension — a query that spans two sheets (`split`
hits both Vim and tmux) — and the locked state that non-Pro users see first.
Anything showing Raycast's root list will draw a review note: the
suggestions underneath are other people's apps, which the guidelines
prohibit.

Do not confuse `metadata/` with `media/`. `media/` is for images linked from
this README; `metadata/` is the store's screenshots. Only the second one is
required.

Then, from this directory and signed in to the Raycast account that owns the
`noloman` handle:

```bash
npm run build     # validates without publishing
npm run publish   # authenticates with GitHub, opens a PR on raycast/extensions
```

`npm run publish` is not a local operation: it squashes the commits and opens
a pull request against `raycast/extensions` under whoever authenticates, and
the extension goes live when Raycast merges it.
