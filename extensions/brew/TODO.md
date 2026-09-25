# Backlog

This is the small set of work that remains both useful to Brew users and realistic to ship. Released features belong in [CHANGELOG.md](CHANGELOG.md), not here.

## Next

### Import and export a Brewfile

Homebrew's own portability format, and the missing half of "set up a new Mac". `brew bundle dump --file=<path>` writes every installed formula, cask and tap; `brew bundle install --file=<path>` pours them back. Both already exist — the work is the UI around them, not the mechanism.

- **Export** what Homebrew manages to a file the user picks, defaulting to `~/Brewfile`. Say how many formulae, casks and taps were written; refuse to overwrite silently.
- **Import** from a chosen file. `brew bundle install` is long-running and installs arbitrary casks, so it needs the same treatment as any other bulk change: show what the file asks for before running anything, report progress per package rather than one animated toast for ten minutes, and keep it cancelable.
- **A Brewfile can add taps**, which is a trust decision rather than an install — the same consent problem as the tap manager below, and the two should use one pattern.

### Support third-party taps

The search index is `formulae.brew.sh/api/formula.json` and `cask.json`, which publish **homebrew/core and homebrew/cask only**. A package from a third-party tap is therefore invisible to Search even when it is installed and listed correctly in Show Installed, where its `tap` field reads e.g. `cameroncooke/axe`. Closing that gap is most of the work.

- **Manage Taps** command, alongside Manage Services: list installed taps (`brew tap`) with what each provides, add and remove them (`brew tap <user/repo>`, `brew untap`), and surface each tap's status — pinned, official or third-party. Confirm before untapping, which can orphan installed packages.
- **Adding a tap is a trust decision, not an install.** It means running code from an arbitrary third party, which is a different kind of choice from installing a reviewed core package. Study whatever consent flow Raycast already uses for adding an MCP server and follow that pattern rather than inventing one: name the tap's GitHub owner and repo, and make accepting deliberate rather than the default.
- **Make tapped packages searchable.** Neither source is sufficient alone: `brew search` covers taps but shells out, is slow, and returns bare names, while the JSON index is fast and complete but core/cask only. Likely both — index results first, tap results merged in behind them. Local tap formulae under `$(brew --repo)/Library/Taps/**/Formula/*.rb` can serve offline name matching, with descriptions needing `brew info`.
- **Include tapped casks in Adopt Apps.** Its index is built from the `homebrew/cask` catalog, so an app that only a tapped cask provides is never offered. Tapped entries merge into the same `AdoptIndex` without rework.
- **Attribute packages to their tap in the UI.** Show the tap on any row outside core/cask so a third-party package is identifiable at a glance, and allow filtering or grouping by tap in Search and Show Installed. The detail panel needs an honest empty state for Statistics: Homebrew publishes analytics for core and cask only, so a tapped package has no install counts rather than zero.
- **Install from a tap.** Support the fully-qualified form (`brew install user/repo/name`), including when the tap is not yet added — brew adds it implicitly, which the confirmation must say. Handle a name present in both core and a tap: brew resolves core first, so an unqualified install can silently fetch the wrong package.

### Keep cached search results trustworthy

The chunked index can promise a record that its chunk no longer supplies; `brewSearch` currently omits that record but still reports the index total. Treat an index/chunk disagreement as cache corruption: rebuild or surface a retryable cache error, never show a shortened page as complete.

Also replace the current recursive key filter in `src/utils/cache.ts` with exact top-level field selection. Its key-name matcher matches paths, not top-level keys, so a record keeps any subtree containing a whitelisted name. Casks no longer pay for this — `compactCaskArtifacts` deletes the two leaked keys along with the array it derives from — but that is a patch over the filter, not a fix, and the formula side still carries the same leak: on the 2026-09-18 snapshot, `variations` for 2,129 formulae plus `head_dependencies`, `service` and `post_install_steps`, together 560 KB that nothing reads. Preserve the fields the UI reads and add fixture coverage for both retained top-level fields and rejected nested fields.

### Give progress toasts an owner

Raycast's toast hide carries no toast id: it dismisses whichever toast is on screen. Anything holding an animated toast across an await can therefore dismiss a toast that now belongs to something else — most damagingly a failure toast, which silently swallows the error. `useDryRunPreview` and `useBrewDoctor` guard this with a per-run token, but the same shape is unguarded in `usePopularityRanks`, the Show Details lookup in `src/components/installPreview.tsx`, the lazy detail fetches in `caskInfo.tsx` and `formulaInfo.tsx`, and every holder of a `showActionToast` handle. Give the rule one implementation those call sites share, rather than repeating the token by hand.

### Avoid unnecessary global Homebrew updates

Replace the unconditional `brew update` used by the outdated refresh and Check for Updates with `brew update-if-needed`, while preserving cancellation, error reporting, and Homebrew-major-version invalidation when an update actually runs. Homebrew documents this command specifically as the fast no-op replacement for scripts. It reduces waiting and needless tap work without weakening freshness when an update is due.

### Do not report a no-op as a completed package change

Homebrew can exit successfully after declining work. Close the remaining gaps around install and uninstall: an already-installed cask can be a silent install no-op, and a package pinned after the extension's preflight can make uninstall exit 0. Confirm the resulting installed/pin state before showing a success HUD, and describe a refusal as skipped with the next action rather than as installed or uninstalled.

## Not planned

- Replace sliding-window search with Raycast `List` pagination. Native pagination retains every previous page and exceeds the command memory limit; the window deliberately drops the prior page.
- Add an AI assistant, recommendation engine, or generated package documentation. These are not needed to manage Homebrew reliably and have not justified their ongoing maintenance cost.
- Rewrite the data-fetching layer around a framework such as React Query or SWR. A large change with no concrete, user-facing problem behind it.
