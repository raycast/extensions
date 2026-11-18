# Changesets

This project uses [Changesets](https://github.com/changesets/changesets) to version releases and update `CHANGELOG.md`.

Common commands (from the repo root):

- `npm run changeset` — add a changeset after you implement a user-facing change (pick semver bump and write a short summary).
- `npm run version-packages` — apply pending changesets: bumps `version` in `package.json` and merges entries into `CHANGELOG.md`. Commit the result when you are ready to cut a release.

Raycast Store submissions still use `npm run publish` (opens the extensions repo PR); run `version-packages` before that when you want a new semver for the Store.
