# Gadak

Search the local gadak mirror of Jira and Confluence from Raycast and open a
hit in the Gadak app.

Each keystroke runs `gadak search --json --limit 20` against the on-disk
mirror. Results come in two sections: issues, then documents (Confluence
pages). Enter opens `gadak://view?issue=<KEY>` for an issue and
`gadak://view?doc=<ID>` for a document. When a profile preference is set,
the links gain a `/w/<profile>` segment.

## How this differs from the API-based Jira extensions

Extensions like Jira Search talk to the Atlassian REST API, so each
keystroke is a network round-trip and needs Atlassian credentials stored in
Raycast. This extension searches a **local SQLite mirror** maintained by
the [Gadak app](https://github.com/midagedev/gadak) instead:

- results are instant (~20 ms) and work **offline**
- one search covers **Jira issues and Confluence pages** together
- no Atlassian credentials in Raycast — the mirror on disk is the source
- Enter lands in the Gadak app (full detail, comments, transitions), not a
  browser tab

The trade-off is the requirement: it only makes sense if you use Gadak,
and results are as fresh as the mirror's last sync (about a minute behind
Jira in normal use). If you want to query Jira's API directly from Raycast
without the app, the existing Jira extensions are the right tool.

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

| Preference          | Default | What it does                                                                                          |
| ------------------- | ------- | ----------------------------------------------------------------------------------------------------- |
| Gadak Binary        | empty   | Absolute path. Empty uses the discovery list above.                                                   |
| Profile             | empty   | Passed as `gadak --profile`. Empty uses gadak's default profile and a deeplink with no `/w/` segment. |
| Show search latency | off     | When on, the results header includes the search time in milliseconds.                                 |
