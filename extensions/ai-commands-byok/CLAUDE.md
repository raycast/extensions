# Contributing to AI Commands (Bring Your Own Key)

Raycast extension. Runs AI on selected text with the user's own OpenAI or
Anthropic key. Owner: Bhanu (`bhanu1776` on the Raycast Store, `Bhanu1776` on
GitHub). Read `ROADMAP.md` before starting feature work.

## Layout

```
src/search-commands.tsx   list of commands; also the deeplink target ({"id"} in launchContext)
src/create-command.tsx    the form, standalone
src/<preset>.tsx          one file per preset root command, all render <Preset id>
src/components/           RunView (result screen), CommandForm, ImportForm, Preset, icons
src/lib/ai.ts             provider calls, streaming, placeholder expansion, output tidy
src/lib/store.ts          LocalStorage CRUD, preset seeding, normalize, restore
src/lib/presets.ts        the shipped commands; ids are stable, hotkeys depend on them
src/lib/diff.ts           word-level LCS and bold rendering of changed words
src/lib/rayconfig.ts      decrypt + parse a Raycast .rayconfig export
src/lib/input.ts          selection first, clipboard fallback with a reason
metadata/                 store screenshots, 2000x1250, numbered in display order
```

## Verify before claiming done

```
npm run typecheck && npm run lint && npm run build
```

`ray lint` runs ESLint and Prettier and validates the manifest, icon and
screenshots. `npm run fix-lint` formats. To try it in Raycast: `npm run dev`,
then stop it (⌃C). While the dev server runs, Raycast pins the extension under
a "Development" section at the top of root search; after stopping, it ranks
normally and stays installed.

## Rules

- **Store review is the priority.** While a Raycast PR is open, do not push
  feature work to `main`. Reviewer fixes go to the PR branch.
- **Squash try-and-revert work** before pushing. One commit per shipped thing.
  The owner dislikes noisy history.
- **Commits from a non-interactive shell need `--no-gpg-sign`**; GPG cannot
  prompt for the passphrase there.
- **Changing `name` or `author` in package.json** registers the dev extension
  again in Raycast and leaves the old copy behind. Avoid; if unavoidable, tell
  the owner to remove the stale one in Raycast Settings → Extensions.
- **Presets are user data after first run.** They are copied into
  `LocalStorage`; editing `presets.ts` only affects new installs and "Reset to
  Default". Keep preset ids stable.
- **Pasting always uses plain text.** Any decoration (bold changes) is
  display-only. Never auto-paste clipboard-sourced input.
- **Keys stay in preferences.** Never log them, never send text anywhere but
  the provider chosen for that command.
- Raycast markdown cannot color text or render HTML. Do not retry the SVG or
  ```diff approaches; see ROADMAP.md.

## Publishing

`npm run publish` validates, builds, pushes to a fork of `raycast/extensions`
and opens or updates the PR. The tree must be clean (`.DS_Store` counts).
Bump the version in `CHANGELOG.md` for every store update.
