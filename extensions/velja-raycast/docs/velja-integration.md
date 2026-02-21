# Velja Integration Surface

> Research findings from reverse-engineering Velja v3.1.1 on macOS.
> This document captures all known integration points for programmatic control of Velja.

## Table of Contents

- [AppIntents (Shortcuts Actions)](#appintents-shortcuts-actions)
- [Preferences Plist](#preferences-plist)
- [URL Scheme](#url-scheme)
- [System Services](#system-services)
- [Rules Data Model](#rules-data-model)
- [Browser Identifiers](#browser-identifiers)
- [Known Limitations](#known-limitations)

---

## AppIntents (Shortcuts Actions)

Discovered by inspecting the Velja binary (`strings /Applications/Velja.app/Contents/MacOS/Velja`):

| Intent | Description | Use Case |
|--------|-------------|----------|
| `SetDefaultBrowser` | Set the primary/default browser | Switching default browser |
| `GetDefaultBrowser` | Get the current default browser | Displaying current config |
| `SetAlternativeBrowser` | Set the alternative browser (Fn-click) | Switching alt browser |
| `GetAlternativeBrowser` | Get the current alternative browser | Displaying current config |
| `OpenBrowserProfileIntent` | Open a URL in a specific browser profile | Targeted URL opening |
| `OpenURLsIntent` | Open one or more URLs through Velja | URL opening with rules |
| `OpenAlternativeBrowserIntent` | Open the alternative browser directly | Quick launch |
| `OpenDefaultBrowserIntent` | Open the default browser directly | Quick launch |
| `RemoveTrackingParametersIntent` | Strip tracking params from a URL | URL cleaning |
| `FocusFilterIntent` | Integration with macOS Focus modes | Automation |

### Invocation

These can be invoked via the macOS `shortcuts` CLI:

```bash
# Run a shortcut by name
shortcuts run "My Shortcut Name"

# With input
echo "https://example.com" | shortcuts run "Clean URL"
```

**Important**: Shortcuts must be pre-created in the macOS Shortcuts app that use Velja's actions. There is no way to invoke AppIntents directly from the command line without a Shortcut wrapper.

### Alternative: AppleScript

```applescript
tell application "Shortcuts Events"
    run shortcut "My Velja Shortcut"
end tell
```

---

## Preferences Plist

**Location**: `~/Library/Preferences/com.sindresorhus.Velja.plist`

**Read**: `defaults read com.sindresorhus.Velja`
**Write**: `defaults write com.sindresorhus.Velja <key> <value>`

### Key Properties

| Key | Type | Description | Example |
|-----|------|-------------|---------|
| `defaultBrowser` | String | Bundle ID of default browser | `"com.apple.Safari"` |
| `alternativeBrowser` | String | Bundle ID of alt browser | `"com.sindresorhus.Velja.promptMarker"` |
| `preferredBrowsers` | Array | Ordered list of browsers shown in prompt | See below |
| `rules` | Array | JSON-encoded rule objects | See [Rules Data Model](#rules-data-model) |
| `menuBarIcon` | String | Menu bar icon style | `"paw"` |
| `removeTrackingParametersOnClipboard` | Bool | Auto-clean clipboard URLs | `1` |
| `removeMailtoOnClipboard` | Bool | Strip mailto: on clipboard | `1` |
| `promptShowBrowserNames` | Bool | Show names in browser prompt | `0` |

### Special Marker Values

| Value | Meaning |
|-------|---------|
| `com.sindresorhus.Velja.promptMarker` | Show the browser picker prompt |
| `com.sindresorhus.Velja.defaultBrowserMarker` | Use the system default browser |

---

## URL Scheme

Velja registers the `velja://` URL scheme (confirmed in `Info.plist`).

```
CFBundleURLSchemes: ["https", "http", "file", "velja"]
```

Velja also handles `https://` and `http://` as the system default browser.

### Usage

```bash
open "velja://open?url=https://example.com"
```

> ⚠️ The exact parameters of the `velja://` scheme are not fully documented. Further testing needed.

---

## System Services

Velja registers two macOS system services (found in `Info.plist`):

| Service | Message | Description |
|---------|---------|-------------|
| Open URLs with Velja | `openWithVeljaService` | Opens selected URLs through Velja rules |
| Open URLs with Velja Prompt | `openWithVeljaPromptService` | Forces the browser picker prompt |

These can be activated by selecting text containing URLs → right-click → Services.

---

## Rules Data Model

Rules are stored in the plist as an array of JSON-encoded strings. Each rule is a JSON object.

### Rule Schema

```typescript
interface VeljaRule {
  id: string;                    // UUID v4, e.g., "185327B3-771E-4E8E-9A34-9446266FD9EE"
  title: string;                 // Human-readable name
  browser: string;               // Target browser bundle ID (may include "|Profile Name")
  isEnabled: boolean;            // Whether the rule is active
  matchers: VeljaMatcher[];      // URL matching conditions
  sourceApps: string[];          // Bundle IDs of source apps (e.g., ["com.microsoft.VSCode"])
  forceNewWindow: boolean;       // Open in a new browser window
  openInBackground: boolean;     // Open without bringing browser to front
  onlyFromAirdrop: boolean;      // Only match URLs from AirDrop
  runAfterBuiltinRules: boolean; // Run after Velja's built-in app rules
  isTransformScriptEnabled: boolean; // Whether transform script is active
  transformScript: string;       // JavaScript transform script (can rewrite URLs)
}
```

### Matcher Schema

```typescript
interface VeljaMatcher {
  id: string;                    // UUID v4
  kind: "host" | "hostSuffix" | "urlPrefix"; // Match type
  pattern: string;               // The pattern to match against
  fixture: string;               // Sample URL for testing the pattern
}
```

### Matcher Kind Semantics

| Kind | Behavior | Example Pattern | Matches |
|------|----------|-----------------|---------|
| `host` | Exact hostname match | `lsegroup.sharepoint.com` | Only `lsegroup.sharepoint.com` |
| `hostSuffix` | Hostname ends with pattern | `microsoft.sharepoint.com` | `*.microsoft.sharepoint.com` |
| `urlPrefix` | URL starts with pattern | `dev.azure.com/LSEG360` | `dev.azure.com/LSEG360/*` |

### Example Rule (from live config)

```json
{
  "browser": "com.microsoft.edgemac.Beta|Default",
  "forceNewWindow": false,
  "id": "A1B2C3D4-E5F6-7890-ABCD-EF1234567890",
  "isEnabled": true,
  "isTransformScriptEnabled": false,
  "matchers": [
    {
      "fixture": "https://dxt.fabric.microsoft.com",
      "id": "816E3EFA-69B9-4011-B28F-2B827C2E8FF0",
      "kind": "hostSuffix",
      "pattern": "dxt.fabric.microsoft.com"
    },
    {
      "fixture": "something.microsoft.sharepoint.com",
      "id": "BCAC5BD0-ED19-4363-9177-D539CCC84078",
      "kind": "hostSuffix",
      "pattern": "microsoft.sharepoint.com"
    }
  ],
  "onlyFromAirdrop": false,
  "openInBackground": false,
  "runAfterBuiltinRules": false,
  "sourceApps": [],
  "title": "Microsoft Work Tools",
  "transformScript": ""
}
```

---

## Browser Identifiers

Browsers are identified by their macOS bundle ID. Profiles append `|Profile Name`.

### Format

```
<bundle-id>                    → Browser without profile
<bundle-id>|<profile-name>     → Browser with specific profile
```

### Common Bundle IDs

| Browser | Bundle ID |
|---------|-----------|
| Safari | `com.apple.Safari` |
| Chrome | `com.google.Chrome` |
| Chrome Beta | `com.google.Chrome.beta` |
| Edge | `com.microsoft.edgemac` |
| Edge Beta | `com.microsoft.edgemac.Beta` |
| Firefox | `org.mozilla.firefox` |
| Arc | `company.thebrowser.Browser` |
| Brave | `com.brave.Browser` |
| Vivaldi | `com.vivaldi.Vivaldi` |
| Kagi | `com.kagi.kagimacOS` |

### Profile Examples

```
com.microsoft.edgemac.Beta|Default
com.microsoft.edgemac.Beta|Profile 7
com.microsoft.edgemac|Profile 9
ai.perplexity.comet|Default
```

---

## Known Limitations

1. **No direct AppIntent invocation** — Must create Shortcuts wrappers to call AppIntents from CLI
2. **Plist caching** — macOS caches plist reads via `cfprefsd`. After writing, may need `killall cfprefsd` to flush
3. **App reload** — Unknown whether Velja watches for plist changes or needs restart to pick up rule edits
4. **Sandboxed** — Velja is sandboxed (App Store); its container is at `~/Library/Containers/com.sindresorhus.Velja/`
5. **No rule management API** — No Shortcuts actions for creating/editing/deleting rules; must use plist
6. **Universal Links** — Velja cannot override macOS Universal Links
7. **Browser links** — Velja cannot intercept links clicked inside browsers (only via browser extensions)

---

## Discovery Method

These findings were obtained by:
1. Inspecting `Info.plist` — `plutil -p /Applications/Velja.app/Contents/Info.plist`
2. String extraction — `strings /Applications/Velja.app/Contents/MacOS/Velja | grep -i intent`
3. Plist inspection — `defaults read com.sindresorhus.Velja`
4. Official documentation — https://sindresorhus.com/velja
5. App Store listing and third-party reviews
