# Firefox integration

App Hopper can optionally use a Firefox companion to list current tab titles and URLs and focus an exact tab. Without it, the existing Accessibility adapter remains available. No session-restore files or browsing-history databases are read.

## User setup

1. Open **App Hopper**, select Firefox, then press **⌘K** and choose **Set up Firefox Integration**.
2. Choose **Enable Firefox Integration**. App Hopper downloads the companion, verifies its pinned SHA-256 and manifest identity/version, sets up the per-user native helper, and opens the downloaded `.xpi` in Firefox.
3. Confirm installation in Firefox. Firefox verifies Mozilla's signature; App Hopper cannot bypass that check or the confirmation prompt. Return to Raycast and choose **Check Connection**, then refresh the App Hopper list to load current URLs.

This is a self-distributed XPI flow. A public Mozilla Add-ons listing is not required. Every released XPI must be Mozilla-signed using the **unlisted** distribution channel.

The shared Mozilla-signed XPI 1.0.1 is published in the [GitHub Release](https://github.com/chenghsj/app-hopper/releases/tag/companion-v1.0.1). `assets/companion-integration.json` pins its public download URL and SHA-256 for both Firefox and Zen. The unsigned build ZIP is for signing, not end-user installation.

Packaged builds copy the bundled native host into the current user's helper directory, preserving its code signature. No compiler is needed on the user's Mac. A source checkout without prepared helpers can compile the reviewable Swift source using `/usr/bin/swiftc`; that development fallback requires Command Line Tools. The integration uses per-user locations, without administrator privileges, login items, launch agents, or a TCP listener.

## Downloads

Each App Hopper build pins `{ version, xpiUrl, sha256 }` in `assets/companion-integration.json`. The URL points directly to a hosted signed `.xpi`, rather than a store page. Downloads require HTTPS, including redirects, and are limited to 10 MiB, five redirects, and a 30-second network deadline. The companion's ID and version must match the pinned release. Firefox remains the cryptographic signature verifier.

A verified package is cached locally, and checked again before reuse. Failed downloads do not replace an existing cache entry or open Firefox. Temporary files are removed after failure. This companion package directory contains installation packages. Separately, Raycast caches the latest search snapshot, including tab titles and URLs, locally to populate the next launch. Refresh checks live targets.

## Updates and repair

**Check Connection** reads connected companion versions from Firefox. When a newer companion is pinned in an App Hopper update, **Update Firefox Companion** downloads that version and opens it in Firefox for installation. The same verified download flow handles installation and reinstallation. Higher connected versions are not described as needing an update. This design does not promise independent background XPI updates; publishing a new companion requires updating the pinned release in App Hopper.

**Repair Local Helper** restores only the helper and native manifest; it does not download or reinstall the companion. After repair, click the companion's toolbar button or restart Firefox to reconnect to the new helper. Missing-host connections retry with backoff, capped at 30 seconds.

Firefox and Raycast releases have independent version numbers. Retain the bridge protocol when updating either component. Helpers use source-hashed binary paths; old binaries remain available to existing Firefox processes until local integration is removed.

## Removal

**Remove Local Integration** asks for confirmation, removes App Hopper's native manifest, requests shutdown of connected helpers, and removes its helper binaries, Swift module cache, and downloaded XPIs. It preserves Accessibility helpers, other native manifests, and unrelated files. If a legacy helper cannot be stopped, restart Firefox and retry removal.

The companion is a separately installed Firefox add-on. **Manage Firefox Companion** opens Firefox's Add-ons Manager to remove it, including from other profiles. Removing the Raycast extension alone cannot uninstall the Firefox companion or automatically clean up these external per-user files.

## Files and process lifetime

- Native manifest: `~/Library/Application Support/Mozilla/NativeMessagingHosts/app_hopper.firefox.json`.
- Helper: `~/Library/Application Support/raycast-yabai-firefox/firefox-bridge-<source hash>`.
- Swift module cache: `~/Library/Application Support/raycast-yabai-firefox/module-cache/`.
- Verified XPI cache: `~/Library/Application Support/raycast-yabai-firefox/companion/`.
- Per-connection socket: the same helper directory, with a random 16-character session name and `.sock` suffix. This directory name retains compatibility with the existing adapter.

The directory is restricted to the current user, the manifest and sockets to owner read/write, and the helper to owner execution. The native manifest allows only `app-hopper-firefox@chenghsj`. Firefox starts the helper with `runtime.connectNative()` and owns its lifetime. EOF, SIGTERM, and requested shutdown remove that session's socket. A forced kill may leave an inert socket; the adapter ignores failed connections and falls back to Accessibility when no companion responds.

Tab data is requested on list refresh and sent over local IPC only, without storing it or contacting a server. The companion requests only `tabs` and `nativeMessaging`; private-window access is controlled by Firefox. Each Firefox profile has a separate connection session, preventing numeric tab IDs from crossing profiles.

## Release preparation

Companion 1.0.1 is already published and pinned for both browsers. The signing and hosting steps below apply to future companion versions; reuse the existing signed XPI for installation and acceptance of 1.0.1.

1. Run `npm test`, `npm run lint`, and `npm run build`.
2. Run `npm run package:firefox`. It writes the shared **unsigned** `app-hopper-companion-<version>.zip` under `dist/companion/` for signing, with `manifest.json` and `background.js` at the archive root.
3. Validate with Mozilla's `web-ext lint --source-dir dist/companion/extension --warnings-as-errors`.
4. Obtain a Mozilla-signed XPI using the **unlisted / self-distributed** channel, retaining the manifest's add-on ID. For example, `web-ext sign --channel unlisted --source-dir dist/companion/extension --artifacts-dir dist/companion` uses the publisher's Mozilla signing credentials. Keep credentials out of the repository, extension, and command history. The publisher must review Mozilla's agreement and submission disclosures.
5. Host the signed XPI at a stable HTTPS download URL. No public AMO listing is needed. Hosting is separate from this local implementation; do not deploy a placeholder ZIP or rename an unsigned ZIP to `.xpi`.
6. Run `npm run configure:firefox-release -- --xpi /path/to/signed.xpi --url https://your-release-host/path/signed.xpi`. This checks identity/version and the presence of signature files, computes the exact SHA-256, and updates the bundled configuration. Signature-file presence is not cryptographic validation; Firefox performs that during installation.
7. Rebuild App Hopper. Verify the regular Firefox flow on a clean installation: explicit enable, completed download, Firefox confirmation, connection, background URL refresh, exact focus in two windows, moved/closed tabs, restart, update, repair, and removal. Verify private windows only if the user explicitly permits access. The local-XPI handoff via Firefox must be accepted on supported Firefox/macOS versions before shipping.

For development only, run `npm run build:firefox`, then use Firefox's `about:debugging` to temporarily load `dist/companion/extension/manifest.json` after preparing the local helper. The build compiles `companion/background.ts` into the browser's required `background.js`. This lasts until Firefox restarts and is not the release installation flow.

## Validation boundaries

The bridge tests compile the actual Swift host and execute the actual companion background script against a simulated Firefox API. They exercise adapter → Unix socket → native framing → companion → response, URL changes without tab selection, exact focus, versions, reconnects, malformed input, EOF, and requested shutdown. Download tests use real ZIP fixtures and mocked HTTP responses to check redirects, limits, SHA-256, identity, caching, and failures. Setup tests check download/install/open ordering, unavailable releases, repairs, updates, cancellation, and removal.

The Raycast settings screen and **Repair Local Helper** flow were also verified in the native app: an outdated helper showed a repair entry point, and repair completed with the state **Local helper ready — waiting for the Firefox companion to connect**. During that earlier test, no enable action was exposed because the signed download was not yet configured. The signed 1.0.1 XPI is now hosted and pinned; this does not establish browser installation acceptance.

On 2026-11-13, Firefox 160.0 with companion 1.0.1 passed live background-URL search, exact selection among identically titled test tabs in one window, and normal quit/relaunch reconnection in the existing profile. The original tab URL set was restored using Firefox's **Restore Previous Session**. See the [local acceptance record](compatibility.md#local-browser-acceptance-2026-11-13) for the tested working tree and evidence limits.

The same profile subsequently passed exact focus across two windows, safe rejection of moved/closed-tab results, refresh recovery, repair of a healthy helper, local removal, and re-enable/reinstallation through Firefox's confirmation. The downloaded 1.0.1 XPI matched the release pin, and connection recovered. See the [follow-up record](compatibility.md#firefox-follow-up-2026-11-13) and the [URL-based fix for same-title window duplicates](compatibility.md#same-title-window-reconciliation-fix-2026-11-13). Windows with insufficient matching evidence remain separate.

The remaining release checks are first installation in a clean account, a version upgrade, and repair of a deliberately stale/damaged installation. Private-window checks require explicit user permission. See the [compatibility checklist](compatibility.md) for clean-account and downloaded-install checks.

References: [Mozilla self-distribution](https://extensionworkshop.com/documentation/publish/self-distribution/), [native messaging](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_messaging).

Firefox and Zen install the same companion XPI, using `companion/manifest.json` as
the canonical manifest and `app-hopper-firefox@chenghsj` as the shared identity.
`build:companion`, `build:firefox` and `build:zen` produce the same loadable directory.
`package:companion`, `package:firefox` and `package:zen` produce the same archive.
Configure the signed release once with `configure:companion-release`; both setup
flows read `assets/companion-integration.json`. Native hosts and socket directories
remain independent. Zen's runtime reports a `zen.version` extension even though its
name is Firefox; that metadata selects `app_hopper.zen`. Firefox selects
`app_hopper.firefox`.
