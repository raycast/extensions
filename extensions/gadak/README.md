# Gadak

Search the local gadak mirror of Jira and Confluence from Raycast and open a
hit in the Gadak app.

Each keystroke runs `gadak search --json --limit 20` against the on-disk
mirror. Results come in two sections: issues, then documents (Confluence
pages). Enter opens `gadak://view?issue=<KEY>` for an issue and
`gadak://view?doc=<ID>` for a document. When a profile preference is set,
the links gain a `/w/<profile>` segment.

## Zero-config

On a machine that installed gadak the documented way, this extension needs
no preferences. It resolves the binary in this order (first existing path
wins):

1. the **gadak binary** preference, if set
2. `/opt/homebrew/bin/gadak` (Homebrew, Apple silicon)
3. `/usr/local/bin/gadak` (Homebrew, Intel)
4. `/Applications/Gadak.app/Contents/Resources/bin/gadak` (the app bundle)

Raycast's Node process does not inherit the user's shell `PATH`, so a `gadak`
that only works in Terminal is not found that way.

## Requirements

- gadak installed — the [macOS app](https://github.com/midagedev/gadak#install)
  or `brew install midagedev/tap/gadak`
- a synced mirror (`gadak init && gadak sync`)

Without a binary, the command offers that install command and the install
guide. Search does not create a mirror.

## Preferences

| Preference | Default | What it does |
| --- | --- | --- |
| Gadak Binary | empty | Absolute path. Empty uses the discovery list above. |
| Profile | empty | Passed as `gadak --profile`. Empty uses gadak's default profile and a deeplink with no `/w/` segment. |
| Show search latency | off | When on, the results header includes the search time in milliseconds. |
