# External HDR

A Raycast extension that turns **HDR on or off** for an external display on macOS, plus an optional watcher that applies your preferred HDR state when the display connects.

```
Toggle HDR      assign a hotkey in Raycast    flip HDR, get a HUD
HDR Displays                                  menu-bar icon with live state and per-display toggles
HDR on Connect                                opt-in rules for when a display is plugged in
```

## How it works

macOS has no public API for HDR. This uses the private `MonitorPanel` framework:

```objc
[display setPreferHDRModes:YES];   // MPDisplay
```

That is the same call BetterDisplay and the open-source DisplaySync use. It needs no SIP changes, no entitlements, no Accessibility permission, and no Automation permission. The extension shells out to a small Objective-C binary (`hdrctl`) that makes the call; the binary is bundled in `assets/` and copied to Raycast's support directory on first use.

## Requirements

**Using it:** macOS on Apple Silicon or Intel, Raycast 2.x, and an HDR-capable external display. Nothing else. The extension ships a prebuilt universal `hdrctl`, copies it into Raycast's support directory on first run, and asks for no permissions.

**Building it:** Xcode Command Line Tools (`xcode-select --install`).

## Development

Users install nothing. This section is only for working on the code.

```sh
make                 # builds tools/hdrctl, copies to assets/, ad-hoc signs both
npm install
npm run dev          # registers the extension with Raycast and hot-reloads
```

`assets/hdrctl` is committed on purpose: Raycast's Store build copies it straight into the bundle and never runs `make`. Rebuild and commit it whenever `tools/hdrctl.m` changes.

`npm run dev` must stay running while you change code. Ctrl-C stops the dev server; the extension stays installed in Raycast.

Assign a hotkey to **Toggle HDR** in Raycast → Settings → Extensions → External HDR.

## Commands

### Toggle HDR

Toggles the target display and shows `HDR On — LG HDR 4K` or a failure toast.

The command title is fixed by the manifest, but the subtitle tracks reality: `Disable HDR — LG HDR 4K` when HDR is on, `Enable HDR — …` when it is off, `No HDR display connected` when there is nothing to act on. It refreshes after every toggle and once a minute in the background.

The manifest sets `"interval": "1m"`, so Raycast also launches this command in the background. That run is guarded by `environment.launchType` and **only** rewrites the subtitle — it can never toggle your display. Do not remove that check.

Target selection: the **Target Display** preference if set, otherwise the first external HDR-capable display. Leave the preference empty and replugging can't break targeting. Set it to a display name if you have two HDR displays.

Display names come from macOS, which reads them from the display's EDID — the same string System Settings shows. Nothing is hardcoded: swap the LG for a Dell and the subtitle, HUD and menu bar all say the Dell's name. The LG in this README is only an example.

The command waits ~1 s for the panel to finish its mode change before reporting, so the HUD reflects reality. The screen goes black for that second — that's the display switching modes, not a bug.

### HDR Displays

A menu-bar icon: filled when the target display is in HDR, hollow when not, exclamation when no HDR display is connected. Click for per-display state, a toggle per display, watcher status, and a link to **HDR on Connect**.

The icon refreshes every 30 seconds and immediately after any toggle it performs. Raycast keeps it alive while Raycast runs. Because it is always running, it also keeps the root-search subtitle current: `HDR on — LG HDR 4K`, `No HDR display connected`, or `HDR state unavailable`. If you disable this command in Raycast settings, that label stops updating.

### HDR on Connect

Per-display rules: **Apply HDR On When Connected**, **Apply HDR Off When Connected**, **Remove Rule**, and **Remove Watcher Agent**. Rules are opt-in; nothing runs in the background until you set one.

Its root-search subtitle says whether auto-apply is armed: `Auto-apply: off`, `Auto-apply: HDR on — LG HDR 4K`, or `Auto-apply: watcher not running`. This view is the only place rules change, so that label can't drift.

When at least one rule exists, the extension installs a launchd agent:

```
~/Library/LaunchAgents/com.hdrtoggle.watch.plist
```

It runs `<Raycast support>/hdrctl watch --rules <Raycast support>/rules.json`, applies rules once at startup (2 s delay) and on display add/enable events (1.2 s debounce). It no-ops when the display is already in the desired state, which also prevents a feedback loop with its own mode change. Logs go to `<support>/watcher.log`.

Removing every rule, or choosing **Remove Watcher Agent**, unloads the agent and deletes the plist. The watcher idles at 0% CPU between events.

## Menu bar icon: showing and hiding it

Raycast's manifest is static — an extension cannot add or remove its own commands at runtime. To hide the menu bar icon, disable the command in Raycast:

**Raycast → Settings → Extensions → External HDR → HDR Displays**

That toggle is Raycast's, not the extension's. There is no preference that can do it.

## Permissions

None. The first run may show a Raycast prompt about the extension running a command from outside the app if you launch it from a `raycast://` deeplink; choose **Always Run Command** once per command.

## Troubleshooting

| Symptom | Fix |
|---|---|
| "The hdrctl binary is missing" | Run `make` in the extension folder. |
| "Display Not Found" | The configured **Target Display** name isn't connected. Connect it, or clear the preference to fall back to the first external HDR display. |
| "HDR Not Supported" | The display reports no HDR modes. Check the cable/port; HDR needs DisplayPort 1.4 or HDMI 2.0 bandwidth. |
| "HDR Did Not Switch" | The panel didn't reach the requested state within 2.5 s. Retry; some docks/switches swallow the mode change. |
| Watcher doesn't react after replug | `launchctl print gui/$(id -u)/com.hdrtoggle.watch` and check `<support>/watcher.log`. Remove and re-add the rule to reinstall. |
| A macOS update removes `MonitorPanel` | The binary fails to link or the class disappears. Fallback: drive System Settings via AppleScript (slower, needs Accessibility) or use BetterDisplay Pro's `hdr` CLI parameter. |

## Uninstall

1. Open **HDR on Connect** and choose **Remove Watcher Agent**.
2. Remove the extension in Raycast.
3. Optional: `rm -rf ~/Library/Application\ Support/com.raycast.macos/extensions/external-hdr`.

## Publishing to the Raycast Store

Ready apart from screenshots. The Store allows bundled binaries when their source is available and the build is traceable: `tools/hdrctl.m`, `tools/Makefile`, and the committed `assets/hdrctl` all live in the repo, and CI rebuilds the binary from source on every push to prove it still compiles. `SECURITY.md` documents exactly what the binary does and does not touch.

The remaining judgment call is `MonitorPanel` itself — a private framework. No public API exists for HDR, so there is no compliant alternative; reviewers may still decline. `SECURITY.md` is written for that conversation.

## License

MIT. The `MonitorPanel` interface is private and undocumented; use at your own risk.

## Icon

The icon is generated, not drawn by hand:

```sh
swift design/icon.swift assets/icon.png word      # current: HDR wordmark
swift design/icon.swift assets/icon.png monitor   # display split 42/58
swift design/icon.swift assets/icon.png sun       # half-disc on a horizon
```

It renders at 1024 and aspect-fits type to the tile; downscale to 512 with `sips -z 512 512`.
