# Open Anyway for Raycast

Quickly approve blocked applications and installers with macOS Gatekeeper without having to manually open and scroll through System Settings.

## Motivation

In macOS 15 (Sequoia) and later, Apple removed the legacy Control-click ("Right-Click → Open") shortcut for launching applications from unidentified developers. Users are now required to:
1. Attempt to launch the blocked application.
2. Open **System Settings** → **Privacy & Security**.
3. Scroll to the bottom **Security** section.
4. Locate the small **Open Anyway** button and click it.
5. Complete Apple's native authorization prompt.

**Open Anyway** eliminates the manual navigation friction. It identifies the blocked application and triggers Apple's legitimate Gatekeeper approval flow directly from Raycast.

---

## How It Works

```
[ App Blocked by Gatekeeper ]
            │
            ▼
[ Raycast: "Open Anyway" ]
            │
            ▼
[ Detects blocked item & triggers Gatekeeper override in background ]
            │
            ▼
[ Apple Native Confirmation Dialog & Touch ID Prompt ]
            │
            ▼
[ User Authenticates & App Opens ]
```

1. **Detection**: Queries unified system event logs from `syspolicyd` to identify the most recent Gatekeeper denial breadcrumb and resolves its application name.
2. **Safe Triggering**: Uses an Apple Accessibility semantic action (`AXPress`) to trigger the Gatekeeper override control for the identified application without foreground focus stealing.
3. **Apple Native Authorization**: macOS immediately presents its official confirmation alert (`Open "<App>"?`).
4. **User Verification**: You authenticate normally using Touch ID or your account password. The extension never automatically dismisses or approves Apple's final prompt.

---

## Security & Privacy Principles

- **No Security Bypasses**: Does not run `spctl --master-disable` or tamper with system policy databases.
- **No Quarantine Tampering**: Does not strip quarantine metadata (`xattr -d com.apple.quarantine`). The app is evaluated and approved through Apple's legitimate Gatekeeper architecture.
- **Preserves Native Confirmation & Touch ID**: Apple's native authorization dialog is always displayed for user confirmation.
- **Target Verification**: Validates that the control being approved corresponds to the specific blocked application.
- **Local & Private**: No network requests, telemetry, or analytics.

---

## Prerequisites & Permissions

### Accessibility Permission
Because macOS requires user interaction to approve unverified software, Open Anyway uses macOS Accessibility APIs (`AXUIElement`) to activate the approval control.

On first use, ensure Raycast is enabled in:
**System Settings** → **Privacy & Security** → **Accessibility** → **Raycast** (Toggle **On**).

---

## Supported macOS Versions

- macOS 15+ (Sequoia)
- macOS 14+ (Sonoma)
- macOS 13+ (Ventura)
- macOS 27+

Architectures: Universal binary supporting both **Apple Silicon (arm64)** and **Intel (x86_64)**.

---

## License

MIT License. See [LICENSE](LICENSE) for details.
