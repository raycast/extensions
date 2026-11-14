# Zen workspace feasibility probe

Status: Console listing/selection and automatic startup/companion acceptance passed on Zen 1.24.1b.
See [current integration and acceptance](zen-integration.md#local-cross-workspace-bridge).
The observations below record the earlier investigation stages.

The installed Zen build's `Window.getTabs()` in
`chrome/browser/content/browser/parent/ext-browser.js` iterates
`this.window.gBrowser.tabs`. Its window-close handler separately uses
`window.gZenWorkspaces?.allStoredTabs`, confirming these are distinct collections.
`modules/zen/ZenSpaceManager.mjs` exposes `allStoredTabs` and
`changeWorkspaceWithID(workspaceID)`. These are privileged browser internals,
not APIs available to the normal WebExtension companion.

## Live check

Run `npm run build:privileged` to compile the TypeScript probes into `dist/privileged/`.
Open Zen's **Browser Console** (not a webpage's developer console), in browser
chrome context. Paste `dist/privileged/scripts/prototypes/zen-workspaces-console.js`.
The initial operation only lists titles and workspace IDs in console memory.
Do not send the table elsewhere if it contains private titles.

1. Keep at least two workspaces with one distinct tab each.
2. Confirm the table includes a tab outside the current workspace.
3. Run `await appHopperZenProbe.focus(INDEX)` for that tab's numeric index.
4. Confirm Zen changes workspace and selects the intended tab, and the returned
   `selected` value is true. Repeat in the other direction.
5. Close a listed tab and confirm focusing its old index rejects as stale.
6. Clear the probe with `delete globalThis.appHopperZenProbe`.

This script is a manual feasibility probe, not an installed integration. Console
JavaScript may require enabling browser chrome debugging in developer settings.
Do not weaken extension signature validation to run it.

## Integration decision

If both listing and selection pass, a privileged Zen-side bridge is technically
plausible. A regular signed WebExtension still cannot access these globals;
shipping requires either an upstream API fix or an explicitly installed,
version-maintained browser customization. Do not patch the signed app bundle or
silently enable remote debugging. Session restore files alone do not provide live
activatable tab identities and are not a complete solution.

No product code or installed browser configuration was changed by this probe.

## Companion bridge experiment

` dist/privileged/scripts/prototypes/zen-companion-console.js ` patches only the connected Zen
companion's per-window `getTabs()` wrappers in privileged Browser Console memory.
It preserves private-window permission checks and restores the previous methods
with `appHopperZenBridge.stop()`. No application bundle or profile changes occur.
Syntax checked only; actual wrapper access and cross-workspace activation through
the companion remain unverified. Paste this script, refresh Raycast, and test a
background-workspace tab. Restarting Zen removes the patch.

Inspection found no installed userChromeJS loader. Persistent AutoConfig requires
files under the application Resources directory, rather than just a profile edit:
https://support.mozilla.org/en-US/kb/customizing-firefox-using-autoconfig
A normal WebExtension cannot ship privileged experiment APIs as an AMO-signed
addon: https://firefox-source-docs.mozilla.org/toolkit/components/extensions/webextensions/basics.html
Therefore startup persistence is deferred until the scoped memory bridge passes;
the proposed profile-only startup integration was not supported by inspection.


## Startup regression and recovery

The first AutoConfig installation prevented the user's Zen from opening. Removing
the two owned files restored launch (user confirmed). The old source immediately
referenced Browser Console's `WebExtensionPolicy` global. A VM startup harness
without that global reproduced an uncaught ReferenceError. This is a demonstrated
code defect, not yet a confirmed full explanation of the real launch failure.

The revised source imports Services explicitly, waits for
`browser-delayed-startup-finished`, uses each browser window's WebExtensionPolicy,
and catches setup/patch failures. `tests/zen-workspace-startup.test.ts` checks
missing console globals, deferred patching, restoration and contained import errors.

An isolated Zen copy with a fresh profile could not complete startup: macOS first
rejected the modified signed copy; a locally signed copy also failed to initialize
the scratch profile within the observation period. No startup acceptance or
companion restart persistence is claimed. The normal Zen installation remains
without the bridge files.


## Completed startup acceptance

The test-copy launch problem was resolved with a fresh copy and development-only
signing without the original distribution-only entitlements. The installed Zen
was not re-signed. Inspection also found no Services.sys.mjs in this build; the
loader now uses AutoConfig's built-in Services and reports errors without assuming
a Console logger. The old unguarded WebExtensionPolicy lookup and nonexistent
Services module import are both removed.

`npm run verify:zen-workspaces` passed startup, delayed companion loading, listing
all workspaces, and actual workspace/tab focus in both directions through the
native companion socket. A separate fresh-profile launch using the original
installed binary and installed loader produced a headless screenshot and exit 0.
The installed bridge source hash matched the repository source. The user's active
profile was not restarted during acceptance; its next restart remains a separate
user-visible check.
