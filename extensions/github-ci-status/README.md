# GitHub CI Status

**Recent CI** shows recent GitHub Actions runs across repositories accessible to your GitHub OAuth sign-in. **Watch CI Notifications** checks individually tracked runs in the background and sends clickable macOS notifications when they finish.

## Run locally

Requires Node.js 22.22.2+ and Raycast on macOS.

```sh
npm install
npm run dev
```

Open **Recent CI** in Raycast and sign in through GitHub. No PAT or custom OAuth app is needed. Private repositories require the OAuth `repo` scope; organization policies may require approval for Raycast's OAuth app.

## Use

- The rolling lookback defaults to **1h**. Change **Lookback Period** in the extension's native preferences; supported durations include `30m`, `1h`, and `2d`.
- Passed runs are green, failures red, and queued/running runs yellow. Cancelled/skipped results have separate labels.
- **Enter** opens Workflow Options. **Open in Browser** is selected first; press **Enter** again to open the run on GitHub. Press **↓** to select **Track Notifications** / **Untrack Notifications**, then **Enter** to toggle notifications for that specific run.
- A bell marks runs with notifications enabled. Tracked runs remain accessible in a separate section after they leave the rolling lookback window, so you can still open or untrack them.
- **⌘R** refreshes results and repository discovery.
- **Configure Repositories** in the **Actions** menu (**⌘K**), also available via **⌘⇧R**, opens a searchable repository list. Press **Enter** to toggle tracking; changes save immediately. Press **Esc** to return to CI results.
- After searching repositories, use **Track Filtered Repositories** (**⌘⇧T**) or **Untrack Filtered Repositories** (**⌘⇧U**) in **Actions** to update all matches while keeping other repositories unchanged. Search matches repository names without regard to case.
- All repositories are tracked by default. After choosing specific repositories, only those repositories are queried for CI, with no full repository discovery during scans. Untracking all repositories pauses CI fetching. Use **Track All Repositories** in the configuration actions to restore automatic tracking of all accessible repositories.
- The main results refresh every 30 seconds while the command is open. **Watch CI Notifications** independently checks tracked runs approximately every minute, including when the main view is closed.
- Search by repository, workflow, branch, status, or commit SHA.

The time filter uses run creation time. Runs created before the cutoff are excluded from the main results even if still running; individually tracked runs are checked directly by ID regardless of age. This version covers GitHub Actions only.

## Notifications

Notifications work out of the box with a helper bundled inside this extension. No Homebrew package or separate Raycast extension is required. The bundled terminal-notifier 3.1.0 app supports Apple Silicon and Intel natively; the extension always uses its own copy.

After signing in through **Recent CI**, open **Watch CI Notifications** once and make sure **Background Refresh** is enabled for that command in Raycast Settings → Extensions → GitHub CI Status. Tracking a run also requests an immediate background check. Raycast controls scheduling, so checks may be delayed, especially on battery or while the computer is asleep. Background Refresh must remain enabled and Raycast must be running. If scheduled execution does not run for a development extension, use Raycast's **Run in Background** action to test it manually and check **Extension Diagnostics**.

Allow notifications for **terminal-notifier** (the bundled helper) in macOS System Settings → Notifications. macOS permission is still required even if you previously allowed a different installation. Focus and notification settings can suppress banners. This extension does not change those settings.

Notifications include the final result, repository, workflow, branch, commit title, short SHA, and attempt number. Clicking the notification opens that run on GitHub. Success, failure, timeout, and cancellation are supported; other completed results such as skipped are reported with a neutral icon. The notification describes the workflow result, not an individual failed job or log excerpt.

Tracking is per run, separate from the repository filter. A tracked run stays tracked until you untrack it, including for later attempts of that same run. It does not subscribe to future runs of the workflow. Each newly completed attempt sends one notification. Only runs that have not completed can be newly tracked. Completed runs hide Track Notifications; already tracked runs can still be untracked after completion. Delivery errors retain the pending result for a later retry. No GitHub authorization dialog is opened by background checks; sign in again through **Recent CI** if access expires or is revoked.

The monitor's command subtitle shows the last scan summary or an actionable error. A scan uses up to four concurrent requests and a 45-second request budget. It never requires full repository discovery, and an empty watch list makes no GitHub requests.

Repository discovery is cached for 15 minutes. Scans use four concurrent workers, pagination, request timeouts, and rate-limit handling. Partial failures are displayed; cached results are marked as potentially stale. GitHub limits filtered searches to 1,000 runs per repository, which produces a warning if reached.

## Checks

The helper app, license, and source attribution are committed under `assets/notification-helper`. Development and builds automatically verify its pinned binary checksum, app signature, and both CPU architectures without downloading anything. To regenerate it from the official, checksum-verified release on macOS, run `npm run setup:notifier`. This is a maintainer command; extension users do not need to run it.

```sh
npm run check:notifier
npm test
npm run typecheck
npm run lint
npm run build
```
