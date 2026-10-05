# PR4 brief: store readiness

Base: the top of the stack at the time (expected `capture-selection`). Branch `store-ready`.

For the user: the extension can be submitted to the Raycast store. For the maintainer: CI proves every PR, and the changelog is the release note.

1. `package.json`: `platforms: ["macOS"]`, `keywords` on each command (obsidian, capture, note, template, macro), confirm `author` is the Raycast username the user publishes under (ask in the report if `christian` is not it; do not guess), `categories` unchanged.
2. `CHANGELOG.md` in the store format (`## [Initial Version] - {PR_MERGE_DATE}`) listing the user-facing capabilities: run any choice with prompts answered in Raycast, Quick Capture, Capture Selection, `[[` and `#` completion, Quicklinks, vault detection and launch, "Run in Obsidian".
3. `metadata/` screenshots (store requires 2000x1250 PNGs, at least one, typically three): the choice list, a one-page form with a TagPicker and a note picker, the `[[` picker. Capture them with `screencapture` from the real Raycast window against the e2e vault using the deeplink-plus-`vaultPath` method and the keystroke guard from the PR2 brief; then crop/scale to the store size with `sips`. Inspect each with the Read tool.
4. GitHub Actions workflow `.github/workflows/ci.yml`: on push and PR, `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm test`, `npx tsc --noEmit`, `pnpm build`. Use the pnpm version from the lockfile. Confirm it runs green on the PR (read the run with `gh run view`).
5. README: an Install section (store link placeholder plus `git clone && pnpm install && pnpm dev`), a Requirements table (Obsidian 1.12+ with the CLI enabled, QuickAdd minimum per feature), and a Limitations list that is honest: Templater's own prompts open in Obsidian; `{{selected}}` inside a choice reads Obsidian's editor (use Capture Selection for the Mac selection).

Discipline as in the other briefs. No em dashes. Report what you could not verify.

## Setup as of now (read first)

- Base: `main` at 81406f4 (six PRs merged today). Create your worktree: `git worktree add ../raycast-quickadd-wt/pr4 -b store-ready main`.
- pnpm via the vite-plus shim is blocked; use `~/.vite-plus/package_manager/pnpm/10.32.1/pnpm/bin/pnpm`. Run `pnpm install` in the worktree (Prettier must be present so `pnpm lint` checks formatting).
- The registered `e2e-vault` in Obsidian is `/Users/christian/Developer/raycast-quickadd/e2e-vault` (the MAIN checkout, not your worktree), open, with a QuickAdd master bundle that has `quickadd:suggest`. Use it for every Raycast run via deeplinks carrying `context={"vaultPath":"/Users/christian/Developer/raycast-quickadd/e2e-vault", ...}`. Do not register another vault with that name. You have full authority over anything named e2e-vault; the user's other vaults (notes, worknotes, dev) are off limits.
- Raycast: `ray develop` from your worktree installs your build; the user's other Raycast work is unaffected. At the end re-run `ray develop` briefly from `/Users/christian/Developer/raycast-quickadd` (main) so main's build is installed, and say so.
- Keystroke guard, non-negotiable: before every keystroke, `osascript -e 'tell application "System Events" to (count of windows of process "Raycast") > 0'` must print `true`, and send it as `tell application "System Events" to tell process "Raycast" to keystroke ...`. Never `tell application "Finder"` or any other app (it raised a macOS permission dialog last time). Read screen size with an AppKit call or `system_profiler`, not AppleScript to another app. Keep the capture stretch short and report the time window; the user is at the keyboard and a Raycast window steals typing.
- For CI: the lockfile is `pnpm-lock.yaml`; pin the pnpm version from it (`packageManager` field or `pnpm/action-setup` with `version`). The repo has no `.github/` yet.

## Hands-on checks that are still owed (capture in the same Raycast session, report each as seen or not)

Deeplinks: `raycast://extensions/christian/quickadd/run-choice?context=<urlencoded JSON>`; choice ids in the e2e vault: e2e-text, e2e-select, e2e-multi, e2e-custom, e2e-number, e2e-date, e2e-picker, e2e-runtime, e2e-template, e2e-macro, e2e-slow (check `obsidian vault=e2e-vault quickadd:list` for the exact id of the Slow macro).

1. Inline Required error: open e2e-text, submit with cmd+return on an empty field, screenshot the red "Required" under the field.
2. Number error: open e2e-number, type `9`, submit, screenshot the range error text.
3. Time picker: open e2e-date, focus the date field, screenshot the DateTime picker open.
4. Cancel Run: open the Slow macro, wait for "Starting..." with the Templater hint, press cmd+shift+backspace (Cancel Run), screenshot the "Cancelled" toast, and prove with `obsidian vault=e2e-vault` reads of the macro's marker file that the run aborted (see e2e-vault/scripts/slow.js for what it writes).
5. Escape: open the Slow macro again, press Escape while it is working, prove via the marker file that the run aborted (the view's unmount sends /abort).
6. Recent section: run e2e-text once to completion, reopen the list through the plain deeplink, screenshot the "Recent" section at the top.
7. Finish wording: after a completed capture, screenshot the "Added to Output/Inbox.md" toast.

Save to `/tmp/pr4/<slug>.png`, inspect each with the Read tool, and describe what each shows. Anything not seen is reported as not verified, never as passed.
