# GitHub Release

Cut a GitHub release without leaving Raycast. Pick a repo, choose patch, minor, or major, and the extension works out the next semver tag from your latest release and creates it with auto-generated notes.

## Setup

This extension drives the [GitHub CLI](https://cli.github.com), so you need it installed and signed in:

```sh
brew install gh
gh auth login
```

It reuses whatever credentials `gh` already holds and stores no tokens of its own, so repo access matches what you get from `gh` in a terminal. Private repos work if your `gh` login can see them.

## Preferences

**GitHub Owner** — a user or organization whose repos you want listed. Leave it blank to list your own. Archived repos are always excluded, and the list is capped at 100 repos, most recently pushed first.

## How the next tag is picked

The extension reads the latest published release, then increments it:

| Latest release | Patch    | Minor    | Major    |
| -------------- | -------- | -------- | -------- |
| `v1.4.2`       | `v1.4.3` | `v1.5.0` | `v2.0.0` |
| `1.4.2`        | `1.4.3`  | `1.5.0`  | `2.0.0`  |
| none yet       | `v0.0.1` | `v0.0.1` | `v0.0.1` |

Whatever prefix convention your last tag used is preserved, so a repo on `v1.4.2` keeps the `v` and a repo on `1.4.2` stays bare.

If the latest release is tagged with something that isn't semver — `nightly`, `release-2024`, a date — the extension refuses and tells you to tag that one by hand. It won't guess, because guessing would mean proposing a tag that looks like the version went backwards.

## Releasing

Hit Enter on a repo for a patch release, or use `⌘⇧M` for minor and `⌘⇧J` for major. Every release is confirmed before anything is created, and the confirmation shows both the tag about to be created and the previous one. Notes come from GitHub's own release-notes generator, the same as `gh release create --generate-notes`.
