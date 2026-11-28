# Capd for Raycast

Search and capture your [Capd](https://capd.jxd.dev) library without leaving Raycast.

Capd is a private, native macOS app for capturing web pages, selected text, links, notes, and
images, and finding them again with full-text search. No account, no subscription, no telemetry —
your library stays on your Mac, and so does this extension: it talks to the local `capd` command
and nothing else.

## Commands

**Search** — full-text search across titles, page text, selections, notes, and text recognized
inside images. The search bar accepts the same filters as the Capd app:

```text
swift concurrency site:swift.org tag:development after:2026-01-01
```

Leave the search bar empty to browse your most recent captures. Open a result in the browser,
copy it as a link or Markdown, or delete it.

**Capture** — save a link or a piece of text. Pass it as an argument, or leave the argument empty
to capture the current selection, falling back to the clipboard. Set it as a Raycast fallback
command to send anything you type in root search straight to Capd.

Re-capturing something you already saved updates the existing entry instead of creating a
duplicate, and the confirmation says so.

## Requirements

Capd 0.0.5 or later, on macOS 26 or later.

```sh
brew install jamiedavenport/tap/capd
```

The extension finds `capd` inside the installed `capd.app` bundle, so a `.dmg` install works
wherever you keep the app and no `PATH` setup is needed. If you keep `capd` somewhere unusual,
set its full path in the extension's preferences.

## Links

- [Documentation](https://capd.jxd.dev) · [Capture](https://capd.jxd.dev/capture) ·
  [Search](https://capd.jxd.dev/search) · [CLI and Raycast](https://capd.jxd.dev/cli)
- [Source and releases](https://github.com/jamiedavenport/capd)
- [Report an issue](https://github.com/jamiedavenport/capd/issues)
- [Privacy](https://capd.jxd.dev/privacy)
