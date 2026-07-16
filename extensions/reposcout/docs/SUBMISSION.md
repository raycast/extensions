# Raycast Store Submission

How to publish RepoScout to the [Raycast Store](https://raycast.com/store). The
store publish flow is a **pull request to the `raycast/extensions` monorepo**
(opened for you by `ray publish`), not `npm publish`.

## Status

`npx ray build` succeeds and `npx ray lint` **passes with no errors**. The repo
is code-complete for the store; only screenshots and running `ray publish` remain
(both need the live Raycast app).

### Done (in the repo)

- ✅ `package.json` manifest: `author` set to the Raycast handle `gmcmanus`
  (validated by `ray lint`), title, description, icon, categories
  (`Developer Tools`, `Productivity`), MIT license, two commands, preferences.
- ✅ Icon at `assets/command-icon.png` — 512×512 PNG (validated by `ray lint`).
- ✅ Root `CHANGELOG.md` in Raycast format (`## [Initial Version] -
{PR_MERGE_DATE}`). The CI replaces `{PR_MERGE_DATE}` with the merge date.
- ✅ `metadata/` folder scaffolded for store screenshots.
- ✅ `.gitignore` excludes `node_modules/`, `dist/`, `coverage/`, and the
  generated `raycast-env.d.ts`; **`package-lock.json` is committed** (required).
- ✅ Builds for the store: `npx ray build -e dist` is clean (type-checked).
- ✅ `README.md` for the store listing.

## Before you submit — manual steps

### 1. Author handle — ✅ done

`"author": "gmcmanus"` is set and validated by `ray lint`. (If you ever publish
under a different Raycast account, update this to that exact handle.)

### 2. Add store screenshots

The store listing needs 3–6 screenshots. Capture them with the extension running:

```bash
npm run dev        # ray develop
```

Use Raycast's built-in **"Take Screenshot"** action (available in the Action
Panel while developing an extension) — it saves correctly-sized PNGs
(2000×1250, 16:10) straight into `metadata/`. Name them `reposcout-1.png`,
`reposcout-2.png`, … Then delete `metadata/README.md` (it's only a placeholder).

Good shots: the search results list, the "choose folders" empty state, the
folder picker, and a repo's action panel.

### 3. Final checks and publish

```bash
npm run check      # our gate: typecheck + lint + tests
npx ray lint       # store gate — must be clean
npx ray build -e dist
npx ray publish    # authenticates with GitHub, opens the PR
```

`ray publish` squashes your commits and opens a PR against `raycast/extensions`.
A Raycast reviewer then goes through it before it goes live.

## Notes

- **ESLint config (ADR-006):** we use a modern flat config, not
  `@raycast/eslint-config`. `ray lint` runs its own ESLint/Prettier pass and it
  passes, so this is fine for the store.
- **Do not commit** `dist/` or `raycast-env.d.ts` — both are build artifacts and
  already git-ignored. `ray build`/`ray publish` regenerate them.
- **Node engine:** developed on Node 22; the store CI uses npm + the committed
  `package-lock.json` for a reproducible install.
