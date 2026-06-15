# 🔔 Market Research — macOS ntfctl

## Competitive Landscape

### Top Projects

| Project | Stars | Type | Approach |
|---------|-------|------|----------|
| **[QuietYou](https://github.com/briankendall/QuietYou)** | ⭐60 | macOS App (Obj-C++) | Auto-dismisses notifications; runs in background |
| **[Alfred Notification Dismisser](https://github.com/bpetrynski/alfred-notification-dismisser)** | ⭐42 | Alfred Workflow (JXA) | Dismiss via Alfred keywords; multi-language (11 languages) |
| **[lancethomps gist](https://gist.github.com/lancethomps/a5ac103f334b171f70ce2ff983220b4f)** | — | JXA Script | Foundational script; most solutions fork from this |
| **[macos-notification-cli](https://github.com/coryfklein/macos-notification-cli)** | ⭐0 | Swift CLI + Alfred | List, click, dismiss, expand/collapse; Homebrew; most full-featured |
| **[ThankYouScript](https://github.com/octern/thankyouscript)** | ⭐3 | AppleScript | Simple dismiss-only AppleScript |
| **[yeet-mac-notifications](https://github.com/aneely/yeet-mac-notifications-in-bash)** | ⭐1 | Bash | Shell scripts for clear + dismiss |
| **[dismiss-macos-notifications](https://github.com/toonarmy14/dismiss-macos-notifications)** | ⭐1 | AppleScript | Configurable auto-dismiss |

### Gaps & Opportunities

| Gap | Our Solution |
|-----|-------------|
| **No Raycast extension exists** | We have the only Raycast extension for notification control |
| **No unified CLI + GUI solution** | We provide AppleScripts (CLI) + Raycast extension (GUI) |
| **Most solutions are dismiss-only** | We add peek, count, DnD toggle, and center toggle |
| **Limited macOS 26 (Tahoe) support** | Tested on macOS 26.5 — works with current Notification Center UI |
| **Pure AppleScript** | No Node.js/Swift compilation needed; works out of the box |

### Competitor Deep Dives

#### 1. lancethomps JXA Script (Foundation)
- **What it does**: Dismiss notifications using JavaScript for Automation
- **Key technique**: Walks `AXNotificationCenterAlert` UI elements, finds "Close"/"Clear All" buttons
- **Strengths**: Battle-tested, supports 11 languages, version-aware (macOS 10–26)
- **Weakness**: JXA has poor tooling and debugging; complex codebase
- **Our advantage**: Pure AppleScript is simpler, more maintainable, better IDE support

#### 2. `notif` CLI (coryfklein)
- **What it does**: Full ntfctl — Notification Center CLI — list, click, dismiss, expand, collapse
- **Key technique**: Swift + Accessibility API, compiled binary
- **Strengths**: Most feature-complete; Homebrew installable; Alfred workflow bundled
- **Weakness**: Requires Swift compilation; 0 stars (very new); complex install
- **Our advantage**: No compilation needed; Raycast extension (prettier UX than Alfred)

#### 3. QuietYou
- **What it does**: Background app that auto-dismisses notifications
- **Key technique**: Monitors notification events, dismisses automatically
- **Strengths**: "Set and forget" — no manual intervention
- **Weakness**: Only dismisses; no peek/count/interact; Objective-C++ codebase
- **Our advantage**: Interactive control, not just auto-dismiss

#### 4. Alfred Notification Dismisser
- **What it does**: Dismiss notifications from Alfred bar
- **Key technique**: Forks lancethomps' JXA; adds Alfred workflow packaging
- **Strengths**: Popular (42 stars); well-tested across macOS versions
- **Weakness**: Alfred-only; dismiss-only; JXA maintenance burden
- **Our advantage**: Raycast (growing faster than Alfred); multiple actions; AppleScript

### Why Our Solution Wins

1. **Raycast-first**: No other notification control extension exists for Raycast (the fastest-growing macOS launcher)
2. **Multi-action**: Clear, peek, dismiss, count, DnD toggle, center toggle — 6 commands vs. competitors' 1–2
3. **Zero dependencies**: Pure AppleScript — no Node.js, Swift, or compilation required
4. **Raycast extension**: Proper Raycast extension with TypeScript, React views, and HUD feedback
5. **Modern macOS**: Tested on macOS 26.5 (Tahoe) — competitors struggle with the latest macOS versions
6. **Clean architecture**: Separate concerns — AppleScripts handle UI automation; Raycast extension handles presentation

### Market Positioning

```
                         Dismiss Only    Multi-Action
Raycast Extension         (none)          ← US (unique)
Alfred Workflow          ⭐42             (none)
CLI                      ⭐0              ← US (AppleScript)
Native App               ⭐60             (none)
```

Our solution occupies a **unique position**: the only Raycast extension + the only multi-action solution + pure AppleScript simplicity.
