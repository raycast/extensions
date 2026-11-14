# Compatibility and release checks

## Current evidence

| Environment               | Evidence                                                                                 | Remaining acceptance                                              |
| ------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| macOS 27.2, Apple Silicon | Local Raycast workflows and automated regression suite                                   | Clean user account and downloaded release installation            |
| Intel helper slices       | Cross-compilation, universal-binary architecture checks, code signature validation       | Execution on an Intel Mac                                         |
| Other macOS versions      | Helpers compile with a macOS 13.0 deployment target and guard newer activation APIs      | Full window/tab and permission workflows on each claimed version  |
| Firefox companion 1.0.1   | Live search/focus, restart, moved/closed-tab rejection, repair, removal/re-enable passed | Clean-account first installation; version upgrade                 |
| Zen companion 1.0.1       | Installed XPI hash matches pin; live URL search and restart/reconnection passed          | Clean-account first installation, version upgrade, repair/removal |
| Zen workspace bridge      | Zen 1.24.1b scratch-profile and daily-profile restart/cross-workspace switching passed   | Repeat after Zen updates; private-window acceptance               |
| Windows / Linux           | Not supported                                                                            | No support claimed                                                |

Raycast's own system requirement also applies and can be newer than the helpers' deployment target. Do not advertise a minimum supported macOS version based solely on a compiler target.

### Local browser acceptance, 2026-11-13

On macOS 27.2.1 (Apple Silicon), the working checkout based on `e6e2c2b`, including the uncommitted helper/browser refactors and single-command setup, was built and opened in Raycast. The current regression suite passed 153 tests; build, typecheck, lint, and `verify:store` passed. These results apply to this local working tree, not the committed Store preparation alone.

- Firefox 160.0: Raycast displayed **Connected — companion 1.0.1**. A unique fragment URL on a background test tab was searchable, and switching selected that tab among two identically titled test tabs. A normal quit/relaunch reconnected companion 1.0.1 without reinstallation. Firefox opened its home page on launch; **Restore Previous Session** restored the original two tabs. Their URL set matched the pre-restart snapshot.
- Zen 1.24.1b: the installed, active companion was version 1.0.1 with `signedState: 2`; its XPI SHA-256 matched `assets/companion-integration.json`. Normal quit/relaunch reconnected automatically and preserved the original four-tab URL set. A test tab in the existing second Zen workspace was searchable from the first workspace. App Hopper selected it and then switched back to a first-workspace tab in the reverse direction. This used the installed bridge and daily-use profile after restart, without loading a temporary add-on or Console script.
- All test tabs were closed. Final local IPC queries confirmed zero test URLs and the same original URL sets in both browsers. URL snapshots were compared using hashes; browsing URLs and profile data are not included in this record.

Firefox's profile files were protected by macOS privacy controls, so its installed XPI checksum was not independently read. Its live version and restart persistence were verified. See the follow-up below for additional Firefox checks. Clean-account first installation, version upgrades, private windows, and installation without developer tools remain separate release checks.

### Firefox follow-up, 2026-11-13

- Two normal Firefox windows contained identically titled **Example Domain** tabs with distinct fragment URLs. Searching each unique URL and selecting its result activated the correct window/tab.
- With an App Hopper result cached, Firefox's **Move Tab → Move to New Window** moved the target. The old result failed with **Firefox tab moved. Refresh the list.** Refreshing exposed the new target. Closing the target then made the cached result fail with **Invalid tab ID**; refreshing removed it and showed **No Results**.
- **Repair Local Helper** completed with **Local helper is ready**, and the existing connection remained available. This exercised repair of a healthy installation, not a deliberately corrupted helper.
- **Remove Local Integration** changed the UI to **Not enabled**. Read-only filesystem checks confirmed removal of the Firefox native manifest, bridge executables, and companion download cache. Three unrelated Firefox helper files retained their checksums, and Zen companion 1.0.1 remained connected.
- **Enable Firefox Integration** downloaded the pinned 1.0.1 XPI, restored the native host, and opened Firefox's installation confirmation. Firefox displayed **App Hopper Companion installed** after confirmation; private-window access stayed off. **Check Connection** returned **Connected — companion 1.0.1**. The downloaded XPI SHA-256 matched the release pin. This was reinstallation in the existing profile, not a clean-account first install or version upgrade.
- All temporary tabs/windows and the XPI handoff tab were closed. Final IPC snapshots showed Firefox's original one window/two tabs and Zen's one window/four tabs, with URL sets matching the pre-test snapshots. The unrelated helper files were still unchanged.

The follow-up exposed duplicate search rows when two windows each contained one identically titled tab: title-only native/companion reconciliation retained AX fallback rows. The URL-based fix below addresses that case when AX provides distinguishing URLs.

### Same-title window reconciliation fix, 2026-11-13

Reconciliation now uses known AX tab URLs in addition to the complete tab-title signature and requires a unique match in both directions. HTTP(S) schemes omitted by Firefox's address bar are handled while explicit schemes, paths, queries, and fragments remain significant. Companion session/tab IDs still control focus; native Space metadata is copied only after a unique match. Conflicting known URLs reject a match. Missing URLs remain unknown, so genuinely ambiguous or unconnected windows stay visible.

The new regression reproduced four rows for two same-title windows before the fix and two afterward, for both Firefox and Zen. Coverage also checks reversed native order, conflicting URLs, incomplete URL evidence, duplicate tab-title multiplicity, and ambiguous windows that must remain separate. All 159 tests, build, typecheck, lint, and Store verification passed.

In the rebuilt Raycast extension, two new Firefox windows each held one **Example Domain** tab at distinct `app-hopper-url-fix` fragment URLs. Searching the shared marker showed exactly two results, one per URL, and selecting the first activated its exact URL. Both test windows were removed afterward; the live companion again reported the original one window/two tabs with no test URLs. Zen shares this matching logic and has regression coverage; this fix was manually verified in Firefox.

### Opera acceptance, 2026-11-14

Opera 140.0 was checked in the rebuilt local Raycast extension on macOS 27.2.1 (Apple Silicon). App Hopper displayed all three tabs in one normal Opera window, found a background tab by its unique URL fragment, and selecting **Switch to Tab** changed Opera's selected tab and address bar to that exact URL. Both temporary test tabs were closed afterward, leaving the original Speed Dial tab.

Opera's AX tab strip requires deeper traversal than Chrome's, and its scripting tab class is `OpTb`. Native regressions cover both differences and exact retained-tab focus after same-title tabs reorder. URL enrichment continues to omit ambiguous same-title matches. Opera workspaces, private windows, multiple windows, and other Opera/macOS versions still require manual acceptance.

## Runtime behavior

### Store submission candidate, 2026-11-14

The current distribution build passed all 209 regression tests, typecheck, lint, and verification of six universal native helpers. In Raycast, refreshing and searching a unique fragment found a background Chrome tab. **Switch to Tab** selected that exact tab and URL, and the command returned to Raycast's root. The temporary tab was closed and the original selected tab restored afterward. This verifies the local distribution build; Store review and downloaded-install acceptance remain separate.

The Firefox/Zen companion download remains pinned to the published signed 1.0.1 XPI. Its background JavaScript matches the current companion build byte for byte; the source manifest's 1.0.2 version is from an earlier signing test. This submission does not publish or repin the companion.

### Loading behavior

Startup rendering was checked in the rebuilt Raycast extension: two consecutive launches with a cache showed the app list in the first observed frame, and manual refresh retained the list. The progressive-loading follow-up publishes fresh native/app data before slow tabs, retains valid enrichment, and holds existing row positions during selection or typing. New matches append; disappeared targets stay visible without focus actions until the layout is reset.

All 167 tests, build, typecheck, lint, and Store verification passed after the follow-up. Regression coverage includes deferred browser queries, repeated enrichment arrivals, closed/restarted native identities, held Space sections, AX index reuse, exact selected tab actions, failed/cancelled refreshes, and disabled cached-row actions during permission checks. Live Raycast checks covered two warm launches, Firefox search, refresh with results present, browser drill-down, and returning with the query/selection retained. Cold-cache, injected slow-query, and disappearing-target timing scenarios were tested automatically; the live checks did not clear the daily-use account's cache or permissions.

The browser-loading follow-up carries known root tabs into browser navigation, shares identical in-flight scans, and gives each browser its own helper queue. All 171 tests, build, typecheck, lint, and Store verification passed. Tests cover immediate seeded rendering during a pending query, completed empty responses, shared scans, live refreshes, retry after failure, and a slow browser timing out without expiring another browser's retained targets. In rebuilt Raycast, Safari's three tabs and Edge's four tabs were visible in the first observed frame after opening each browser.

A read-only local comparison changed only helper queue sharing against the same running browsers: total browser-query time was 324 ms with engine-shared queues versus 270 ms with separate queues on the first pass, then 112 ms versus 54 ms on the warm pass. These are query timings, excluding native discovery and Raycast rendering. Earlier standalone first-run Safari/Edge queries timed out after 10 seconds; that timeout did not recur in the paired comparison, so its removal is not claimed as a measured speedup.

- Each command launch checks setup again. A previous successful permission check is not cached as authorization for a later launch.
- Missing Accessibility access opens a concise setup screen. Window discovery stays disabled until the user grants access and rechecks.
- Packaged helpers are selected by the hash of their Swift sources and verified against the bundled binary checksum. Corrupt packages show a recovery screen rather than silently compiling replacement code.
- A development checkout may compile missing helpers when developer tools are installed. An unprepared checkout without those tools shows the installation command; App Hopper never installs tools automatically.
- The Firefox native host is copied into its per-user directory from the bundled helper when available. The optional companion still requires Mozilla signing and its own configured download.
- Unknown Space values remain hidden. Space discovery and some AX window discovery use private macOS APIs, so compatibility must be checked after macOS/browser updates. Full-screen windows and multiple displays require explicit acceptance checks.
- Chromium title decoration decoding currently recognizes verified English and Traditional Chinese labels. Other formats retain their original title and do not affect tab identity or activation.

## Before claiming a supported environment

Use a clean user account or another Mac; do not copy this developer account's permissions or helper caches.

1. Install the actual downloaded release with no Command Line Tools installed. Confirm startup makes no compiler request and every bundled helper can run under the system's normal trust policy.
2. Test missing Accessibility permission, user-granted permission, **Check Again**, and reopening the command. Check Automation prompts for the System Events and browser fallbacks.
3. Test running, minimized, hidden, and windowless apps; single and multiple windows; duplicate-title tabs; moved/closed tabs; and helper/session expiry.
4. Verify single-window app Space labels, multi-window app omission, per-window/tab labels, and unknown Spaces across multiple displays and full-screen windows.
5. Install a supported browser outside `/Applications` and verify its icons, navigation, and exact tab focus.
6. Repeat on each claimed macOS version and on both Intel and Apple Silicon hardware. Rosetta execution alone is not Intel hardware acceptance.
7. Verify the helpers included in the actual Store download and confirm their execution under the system's normal trust policy. Store submission checks source hashes, checksums, both architectures, and code signatures; it does not establish Gatekeeper acceptance. If distributing a separate Developer ID-signed archive, complete its notarization and downloaded-artifact acceptance independently.

Reference: [Apple's notarization workflow](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution).
