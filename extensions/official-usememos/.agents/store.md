# Store

Raycast's [Prepare an Extension for Store](https://developers.raycast.com/basics/prepare-an-extension-for-store)
is the review gate. These are its requirements as rules. Run `pnpm store-check`
after touching `package.json`, `assets/`, `metadata/`, `CHANGELOG.md` or
`README.md`; it reports everything below that a machine can see.
`tools/store-check/baseline.json` lists the gaps we've accepted for now, each
with a reason and an owner. Never add an entry to silence your own change —
the baseline is for pre-existing debt. `pnpm store-check --submission` ignores
it entirely, which is the bar the submission PR has to clear.

## Manifest

- **`author` is the Raycast account username**, `license` is `MIT`, and
  `platforms` lists only what the extension actually supports.
- **`@raycast/api` is on the latest version.** Bump it with
  `pnpm up --latest @raycast/api` before a submission.
- **At least one `categories` entry**, spelled exactly as Raycast spells it:
  Applications, Communication, Data, Documentation, Design Tools, Developer
  Tools, Finance, Fun, Media, News, Productivity, Security, System, Web, Other.
- **The extension `description` is one sentence**, short and descriptive.

## Naming

See [naming.md](naming.md) for the title case rules. The store-specific parts:

- **The extension title says what it does**, not just the service name. One
  command means the title tracks that command.
- **Command titles are `<verb> <noun>` or `<noun>`**, never articles:
  `Search Memos`, not `Search the Memos`.
- **A subtitle adds context, usually the service name.** It is not a
  description, it never repeats a word from its own title, and it is omitted
  when it adds nothing — which is the normal case here, because "Memos" is
  already in the extension title.

## Icon and assets

- **`assets/` holds only what the extension loads at runtime.** `ray lint`
  validates the icon is a 512x512 PNG; delete anything unreferenced.
- **The icon must read in both light and dark themes.** Check it in Raycast
  Preferences → Appearance.
- **README media goes in a top-level `media/` folder**, never `assets/`.

## Store artifacts

- **`metadata/` holds three to six screenshots**, each 2000x1250 PNG. Capture
  them with Raycast's Window Capture (`Save to Metadata` ticked), one
  consistent background, no other apps, no real tokens or private memos.
- **`CHANGELOG.md` entries are `## [Title] - {PR_MERGE_DATE}`.** Newest first.
  Only the unreleased entry uses `{PR_MERGE_DATE}`; merged ones carry a date.
- **`README.md` explains the access token setup**, because the extension needs
  one. `help.md` is the alternative when the instructions belong beside the
  preferences form rather than behind "About This Extension".

## Code

`ray lint` enforces Title Case actions, submenu ellipses and shortcut choice.
These are the rules it can't:

- **Never set `navigationTitle` on a root command view.** Raycast sets it to
  the command name. Nested screens only, and keep them short.
- **Never build a command that configures the extension.** Configuration is
  the preferences API. Setup Memos is allowed because it only reads and
  verifies; the moment it writes a setting it becomes a rejection.
- **Never render an empty list before data arrives.** Pass `isLoading`; the
  "No results" flicker is a named review failure.
- **No external analytics, no Keychain access.** Keychain is an automatic
  rejection with no appeal short of emailing Raycast.
- **No bundled binaries.** Don't add executables to `assets/`, don't download
  them from a server we control, and don't bundle anything heavy. Calling a
  known system binary is the only easy case.
- **US English spelling**, and no custom localization. If locale changes
  behaviour, that's a preference.

## Submitting

- **Keep `package-lock.json` current.** Raycast's CI runs npm, so the submission
  PR carries one. Regenerate it with `pnpm lockfile` — never `npm install`
  directly, which crashes on pnpm's `node_modules`. Drop `pnpm-lock.yaml` from
  the submission commit: `ray publish` rejects it. Day-to-day work stays on
  pnpm — see [workflow.md](workflow.md).
- **Run the distribution build** (`pnpm build`) and open the extension in
  Raycast to check it against the optimized bundle, not just `pnpm dev`.
- **Read the [Extension Guidelines](https://manual.raycast.com/extensions-guidelines)**
  and the terms of service of the Memos instance APIs the change touches.

## Known review risks

- **Setup Memos looks like a configuration command.** It isn't: it reads
  preferences, calls `GET /api/v1/auth/me` and links to
  `openExtensionPreferences`. Keep it that way, and keep the README saying so.
- **Six commands share one service name.** Every subtitle currently repeats
  the title; `pnpm store-check` lists them. The fix is to remove them, not to
  reword them.
