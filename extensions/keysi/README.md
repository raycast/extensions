# Keysi for Raycast

Search Keysi's cheat sheets from Raycast, and drive Keysi's panel without
reaching for its hotkey.

## Commands

| Command | What it does |
| --- | --- |
| **Search Cheat Sheets** | Searches Vim, tmux, Figma, Slack and anything you wrote yourself. Works with Keysi closed. |
| **Show Shortcuts** | Opens Keysi's panel for the app you were in before Raycast. |
| **Practice Shortcuts** | Opens Practice Mode. Keysi Pro. |

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

`metadata/` is empty, and the store will not take the extension until it
isn't. Screenshots cannot be generated from a script — they have to be taken
against a running Raycast with this extension loaded, which also means a
machine with Keysi actually installed, since `Search Cheat Sheets` reads the
bundled sheets out of `Keysi.app` and shows its empty state without them.

What the store expects, as of the checks run on 2026-09-11:

- **2000 × 1250 px**, 16:10 landscape, PNG. No dark-mode variant.
- Between three and six of them. Six is the maximum.
- The same background across all of them, nothing else on screen, no other
  app visible, no real licence keys or personal paths in frame.

Raycast's own `Window Capture` command saves at the right size into
`metadata/` — run it with the extension open in Raycast rather than
screenshotting by hand, which gets the dimensions wrong.

Three worth taking, one per command: `Search Cheat Sheets` with a query that
spans two sheets (`split` hits both Vim and tmux), the locked state that
non-Pro users see first, and Keysi's panel after `Show Shortcuts`.

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
