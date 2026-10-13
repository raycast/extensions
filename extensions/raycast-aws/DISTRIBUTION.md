# Distributing this extension

There are three options, depending on who needs it.

## 1. Just for yourself, on other Macs

No publishing needed.

1. Push this repo to a git remote (personal GitHub/GitLab).
2. On each machine: `git clone`, `npm install`, `npx ray build` (or `npx ray develop` once).
3. In Raycast, run **Import Extension** and point it at the folder.

Granted (and Node, for building) still need to be installed on each machine.

## 2. Share privately with your team

Best fit for an internal tool like this one. Requires a Raycast for Teams/organization account.

1. Set `"owner": "<your-org-handle>"` in `package.json`. Find your handle via the **Manage
   Organization** command → **Copy Organization Handle**.
2. Run `npm run publish` from the extension folder (already wired up in `package.json`'s scripts —
   it wraps `npx @raycast/api@latest publish`).
3. This verifies, builds, and publishes to your org's private store, and copies a share link to
   your clipboard.
4. Teammates need to be logged in (`npx ray login`) and part of your organization to install it.

## 3. Public Raycast Store

Possible, but this extension currently has org-specific assumptions (default region
`eu-west-1`, iTerm as the default terminal, etc.) that would be worth genericizing first. Full
requirements are in Raycast's own
[Prepare an Extension for Store](https://developers.raycast.com/basics/prepare-an-extension-for-store)
guide, but at a minimum you'll need:

- A real, registered Raycast username in the `author` field (already set).
- `README.md` (done) and ideally a `CHANGELOG.md`.
- 3–6 screenshots (2000×1250 PNG, light or dark — not both).
- A review pass against the store's naming/UX guidelines.
- Publish via `npm run publish` once `owner` is **not** set (public store is the default target
  when there's no `owner` field).
