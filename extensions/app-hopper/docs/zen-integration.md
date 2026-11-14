# Zen integration

The optional Zen companion supplies live tab titles, URLs and IDs through WebExtension APIs, even when Compact Mode hides the sidebar. Tab activation uses the browser's tab ID, not an Accessibility index. Private-window access remains off unless explicitly granted in Zen.

## Setup

Open **App Hopper**, select Zen, then press **⌘K** and choose **Set up Zen Integration**. A configured signed release provides **Enable Zen Integration**, signature-checked installation in Zen, version checks, update, repair and removal. Firefox and Zen use the same companion identity and signed XPI. The companion detects Zen runtime metadata to select the Zen native host.

The shared signed companion 1.0.1 is available from the [GitHub Release](https://github.com/chenghsj/app-hopper/releases/tag/companion-v1.0.1), with URL and SHA-256 pinned in `assets/companion-integration.json`. **Prepare Local Helper** registers the native host without installing an add-on.

For development, run `npm run build:zen`, prepare the local helper, then load `dist/companion/extension/manifest.json` through Zen's `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on**. This grants the companion `tabs` and `nativeMessaging` access and lasts until Zen restarts. After loading, refresh App Hopper. This is a development test, not a signed release installation.

## Isolation and fallback

- Shared add-on ID: `app-hopper-firefox@chenghsj`; native host: `app_hopper.zen`.
- Native manifest: `~/Library/Application Support/Mozilla/NativeMessagingHosts/app_hopper.zen.json` (Zen's macOS build uses the Mozilla vendor).
- Helper and sockets: `~/Library/Application Support/raycast-app-hopper-zen/`; the installed helper is named `zen-bridge-<source hash>`.
- Firefox retains its existing host and directory; both browsers allow the same add-on ID. The shared native binary selects the Zen directory from its installed `zen-bridge-` executable name.
- Each profile gets a random connection session. Window and tab IDs include that session; focus requests stay in the selected browser's socket directory. Repair/removal touches only that browser's files and helpers.
- Unconnected profiles retain native/Accessibility windows. Ambiguous native/companion matches remain separate rather than discarding windows.

No browsing-history database or session-restore file is read. The companion sends current tab data over local IPC. Raycast caches the latest search snapshot, including tab titles and URLs, locally for the next launch; refresh checks current targets. Without the companion, sidebar-hidden windows report **Tab List Unavailable** rather than an invented tab count. With the companion, background URLs and switching do not depend on the sidebar. Cross-workspace activation and private windows require separate real-browser acceptance; the standard API returns browser tabs, not Zen workspace labels.

## Release

The current 1.0.1 release is already signed, hosted, and pinned. The following steps prepare a future companion version; installation acceptance uses the existing release.

`npm run package:companion` creates the single `dist/companion/app-hopper-companion-<version>.zip` for Mozilla signing. The older `package:zen` and `package:firefox` commands are aliases for this same artifact. After obtaining an unlisted signed XPI and hosting it at a direct HTTPS URL, run:

```sh
npm run configure:companion-release -- --xpi /path/to/signed.xpi --url https://example.com/companion.xpi
```

This configures the same download for Firefox and Zen. Then rebuild App Hopper. The signing and pinned SHA-256 workflow is shared with [Firefox integration](firefox-integration.md). Signing, hosting and accepting the actual browser installation remain separate from local builds and simulated bridge tests.

## Local acceptance

The development companion was loaded through Zen's temporary add-on picker after preparing its helper from Raycast. On the installed Zen 1.24.1b, with Compact Mode's sidebar still hidden, the live adapter returned one window and three tabs, with URLs for all three and no duplicate unavailable-window row. Raycast showed **Connected — companion 1.0.0**, displayed the three tabs, matched `google.com`, and successfully activated the corresponding Google tab through the companion.

That earlier smoke test validates the temporary-add-on path only. On 2026-11-13, the daily-use Zen 1.24.1b profile with the installed signed companion 1.0.1 also passed normal restart/reconnection, background-URL search, and cross-workspace activation in both directions through App Hopper. The installed XPI checksum matched the pinned release. See the [local acceptance record](compatibility.md#local-browser-acceptance-2026-11-13). Clean first-install confirmation, update, repair/removal, and private-window access remain separate checks.

## Local cross-workspace bridge

The local AutoConfig bridge in `companion/zen-workspace-bridge/bridge.ts` exposes all
workspace tabs to App Hopper's Zen companion. It waits for a browser window to
finish startup and for the companion to connect, handles new windows, and retains
the companion's private-window permission checks. It patches only this companion's
window wrappers. Firefox is unaffected.

Install: `node --import tsx scripts/zen-workspace-bridge.ts install`

Status (installed files, not live connection): `node --import tsx scripts/zen-workspace-bridge.ts status`

Remove: `node --import tsx scripts/zen-workspace-bridge.ts remove`

Restart Zen after installing or removing. The installer adds only
`Contents/Resources/app-hopper-zen.cfg` and
`Contents/Resources/defaults/pref/app-hopper-zen.js` inside Zen.app. It refuses
existing AutoConfig configurations and unmanaged files. Removal leaves profile
data and companion registration intact. Reinstall replaces owned files.

AutoConfig sandboxing is disabled for this local startup script. The webpage
sandbox and extension signature checks remain enabled. Zen updates may remove the
files; check status and reinstall after an update if necessary. This integration
uses Zen internals and requires compatibility checks after browser changes.

The companion must be installed separately. Use the shared signed XPI for a
persistent installation. If using a temporary development add-on, reload it from
`about:debugging#/runtime/this-firefox` after restarting Zen; no Console script is
required. This bridge does not turn an unsigned temporary companion into a
permanent signed add-on.

### Startup and workspace acceptance

`npm run verify:zen-workspaces` builds the Zen companion, creates a disposable
Zen copy and scratch profile, development-signs only that copy, and loads the
bridge through AutoConfig. It creates two workspaces, loads the companion after
startup, queries all tabs through its new local socket, and verifies actual
workspace and selected-tab changes in both directions. The temporary copy and
profile are removed afterward. Requires macOS, installed Zen and the prepared
local native helper. No daily-use profile or installed app files are changed by
this test.

On Zen 1.24.1b the test passed. After installing the same source in the original
Zen, its unmodified executable also completed a separate headless screenshot
startup check with a fresh profile (exit 0). Installed/source hashes matched.
The user's current profile also passed normal restart and bidirectional cross-workspace activation through Raycast on 2026-11-13, with installed companion 1.0.1. See the [local acceptance record](compatibility.md#local-browser-acceptance-2026-11-13).

The initial loader prevented startup and was removed. The replacement uses the
built-in AutoConfig Services global (this build has no Services.sys.mjs), obtains
WebExtensionPolicy from initialized browser windows, and contains setup/patching
errors even when no Browser Console logger exists. Regression coverage lives in
`tests/zen-workspace-startup.test.ts`.

## Migrating from the old Zen-only development companion

Remove the old **App Hopper Zen Companion** (`app-hopper-zen@chenghsj`) from Zen.
Prepare/repair the Zen local helper using the updated App Hopper, then load
`dist/companion/extension/manifest.json` temporarily or install the shared signed
XPI. The shared companion retains Firefox's existing ID
`app-hopper-firefox@chenghsj`; existing Firefox installations upgrade in place.
Update the local workspace bridge using `node --import tsx scripts/zen-workspace-bridge.ts install`
and restart Zen so it targets the shared identity. Do not load both companions.
The bridge remains a separate local component; it is not included in the signed XPI.

### TypeScript sources

The local bridge, Console probes, installer and smoke fixture are TypeScript.
`npm run build:privileged` emits the browser scripts under `dist/privileged/`.
Paste compiled probe JavaScript into Console, not its `.ts` source. The installer
compiles `companion/zen-workspace-bridge/bridge.ts` before writing AutoConfig; the
smoke test compiles its fixture before loading it. `npm run typecheck` checks these
sources with `tsconfig.privileged.json`, separately from Node tooling and the
WebExtension background script.
