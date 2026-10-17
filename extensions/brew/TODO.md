# Backlog

This is the small set of work that remains both useful to Brew users and realistic to ship. Released features belong in [CHANGELOG.md](CHANGELOG.md), not here.

## Next

### Finish action toasts in place again

Next, once the Remove Tap fix (#31853) merges. A finished install can be left showing its progress toast: "Installing Tinycast / Operation completed successfully" with a live Cancel button, instead of "Installed Tinycast" (seen 2026-10-02).

The likely cause is a choice brew made. Raycast's convention is to finish a toast in place (`toast.style = Toast.Style.Success`), and a Sourcegraph search of `raycast/extensions` on 2026-10-02 found 212 extensions doing exactly that and none with any toast queue or controller. Brew did too until `5c5526d` (2026-09-06), which switched `settle` in `src/utils/toast.ts` to replacing the toast with `showToast`, so that a stale Cancel could not survive. That puts two kinds of request in flight together, the `updateToast` a progress setter sends and the `showToast` that finishes, and those two were seen to apply out of order. Nothing shows that updates to the same toast reorder; that part is inferred.

- **Finish in place.** In `settle`, set `style`, `title`, `message = undefined`, `primaryAction = undefined` and `secondaryAction = undefined` on the toast itself, with no replacing `showToast`. Keep the `hide()` only on the Close After Action path.
- **Confirm it before calling it fixed**, two ways: install a tapped cask (the case that reproduced it) and check the toast ends on "Installed …" with no Cancel; and a throwaway dev command that sets a progress message and finishes in place in the same tick, a few hundred times, checking the toast never ends animated with Cancel.
- **If it still sticks,** write up the Raycast behavior with that repro before trying anything broader. A timing-based fix (hold the final toast until the last update is 250 ms old) was built and pulled from #31853 after four review rounds kept finding new late hides; it is not the way back in.

### Import and export a Brewfile

Homebrew's own portability format, and the missing half of "set up a new Mac". `brew bundle dump --file=<path>` writes every installed formula, cask and tap; `brew bundle install --file=<path>` pours them back. Both already exist — the work is the UI around them, not the mechanism.

- **Export** what Homebrew manages to a file the user picks, defaulting to `~/Brewfile`. Say how many formulae, casks and taps were written; refuse to overwrite silently.
- **Import** from a chosen file. `brew bundle install` is long-running and installs arbitrary casks, so it needs the same treatment as any other bulk change: show what the file asks for before running anything, report progress per package rather than one animated toast for ten minutes, and keep it cancelable.
- **A Brewfile can add taps**, which is a trust decision rather than an install — the same `brew trust` confirmation Manage Taps uses (`trustTap` in `src/manage-taps.tsx`), and the two should share it.

### Finish third-party taps

Manage Taps (one section per tap, trust, add, remove) and installing a pasted `user/repo/name` from Search are built; `AGENTS.md` ("Third-party taps and trust") records the Homebrew behavior they rest on. What remains:

- **Make tapped packages searchable.** Search's index is `formulae.brew.sh/api/formula.json` and `cask.json`, which publish **homebrew/core and homebrew/cask only**, so a tapped package is invisible to Search unless its qualified name is pasted. Neither source is sufficient alone: `brew search` covers taps but shells out, is slow, and returns bare names, while the JSON index is fast and complete but core/cask only. Likely both — index results first, tap results merged in behind them. Manage Taps already holds full records for every tapped package, which may be the cheaper source.
- **Include tapped casks in Adopt Apps.** Its index is built from the `homebrew/cask` catalog, so an app that only a tapped cask provides is never offered. Tapped entries merge into the same `AdoptIndex` without rework.
- **Attribute packages to their tap in Search and Show Installed.** Show the tap on any row outside core/cask so a third-party package is identifiable at a glance, and allow filtering by tap there as Manage Taps does.
- **Gate an outdated cask's upgrade on trust.** `brew outdated --json=v2` gives a cask no `tap` and an unqualified token, so `ensureTrusted` cannot tell which tap it comes from and lets its upgrade through ungated. Formulae are covered, because their outdated names are qualified.

### Let long-running brew work outlive the Raycast window

Picked up after third-party taps ship. Closing the Raycast window mid-install ends the extension's process, and brew goes down with it: brew is a piped child of that process, so it dies with it or on its next write. Seen twice on 2026-09-28 installing `jundot/omlx/omlx`: the dev log stopped at the moment the window closed (21:00:30, the second the install began), brew's own logs under `~/Library/Logs/Homebrew/omlx/` ran four minutes further, and the keg was rolled back. No extension code survives, so nothing reports it — Raycast's documented `showToast` → `showHUD` fallback never gets the chance to run. This affects every install, upgrade and uninstall, not just taps.

- **Run brew detached**, in `execBrewWithProgress` (`src/utils/brew/progress.ts`) and in the paths that still use the buffered `execBrew` for long work — uninstall (`brewUninstall`) and Upgrade All (`brewUpgradeAll`) in `src/utils/brew/actions.ts` — or move those onto it: its own process group, output to a log file instead of pipes. While the extension is alive it reads that file for the progress toast; cancel kills the process group.
- **Report the result with a native macOS notification when nobody else does.** A small shell wrapper records brew's exit code; the extension, if still running, shows its usual toast or HUD and marks the result handled; if nothing has marked it shortly after brew exits, the wrapper posts "Installed omlx" / "Failed to install omlx" itself. raycast-downloader does exactly this (`/Users/messina/Developer/GitHub/chrismessina/raycast-downloader/src/runner.ts:683`, `osascript display notification`), and it reads well in Notification Center.
- **Show progress through brew's quiet stretches.** The omlx install that did finish went 3.5 minutes (23:31:31 → 23:35:00) with the toast frozen on "Auto-updating Homebrew…": brew prints nothing while pip builds from source, because pip writes to per-step files under `~/Library/Logs/Homebrew/<name>/` (`02.pip.log`, `03.pip.log`, …). Add an elapsed clock to the message (Adopt's `adoptProgressText` already ticks one), and consider tailing the newest of those files for the current step. Log each step as it starts, so a stall is attributable afterwards.
- **Revisit the 5-minute stale watchdog** once output arrives via a file: a quiet source build can legitimately run longer than that without a line of output.

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
