# Caffeine for Windows — Raycast Extension

<p align="center">
  <img src="./assets/icon.png" width="128" height="128" alt="Caffeine Icon" />
</p>

**Caffeine** is a lightweight, Windows-native Raycast extension that temporarily prevents your Windows PC from going to sleep or turning off its display.

---

## ☕ Why Caffeine?

Windows users often need their computer to stay awake temporarily while:

* Downloading or uploading large files
* Running builds, renders, or long scripts
* Giving presentations or screen shares
* Monitoring real-time dashboards or progress
* Reading long documents

Caffeine provides a fast, keyboard-first way to keep your PC awake indefinitely or for a specific duration, without permanently altering your Windows sleep and display timeout configuration.

---

## ✨ Features

* **Native Windows Power Management**: Uses the official Win32 `SetThreadExecutionState` API.
* **Zero Permanent Changes**: Does **not** modify your registry, power plans, or system power settings.
* **System Tray Status & Controls**: When active, a dynamic indicator appears in your Windows system tray showing remaining time and quick controls. Automatically hides when inactive.
* **One-Click Indefinite Mode**: Quickly turn Caffeine on or off with a single keystroke.
* **Quick Timer Presets**: Quick options for **5 minutes**, **10 minutes**, **15 minutes**, **30 minutes**, **45 minutes**, **1 hour**, and **2 hours**.
* **Custom Minutes**: Enter any custom duration between 1 and 10,080 minutes (up to 7 days).
* **Display Control**: Option to keep both the display and system awake, or only prevent system sleep while allowing display timeout.
* **Automatic Expiration**: Automatically releases power requests and restores normal power management when the timer finishes.
* **Instant Manual Stop**: Return your PC to normal power management behavior at any time.
* **Self-Healing State**: Gracefully reconciles state if Raycast or the helper process is restarted.
* **Extremely Lightweight**: Consumes negligible system resources with zero visible console windows.

---

## 🚀 Usage

### 1. Indefinite Keep-Awake
1. Open Raycast (`Alt + Space` or configured hotkey).
2. Type **Caffeine** and press `Enter`.
3. Press `Enter` on **Turn On** to keep Windows awake indefinitely.
4. When done, open Caffeine (or click the tray icon) and choose **Turn Off**.

### 2. Timed Keep-Awake
1. Open Raycast and search for **Caffeine**.
2. Select **Timer…**.
3. Choose a suggested duration (**5m**, **10m**, **15m**, **30m**, **45m**, **1h**, **2h**) or select **Custom Duration…** for custom minutes.
4. Caffeine will keep your PC awake until the timer expires, or until you manually choose **Turn Off**.

### 3. System Tray Controls
* When Caffeine is active, an indicator appears in the Windows system tray displaying the active status / countdown.
* Clicking the tray icon gives quick access to **Turn Off**, **Turn On (Indefinitely)**, and quick duration adjustments.
* When Caffeine is stopped, the icon automatically disappears from the system tray.

---

## ⚙️ Extension Preferences

| Preference | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| **Prevent Display Sleep** | Checkbox | `Enabled` | When enabled, prevents both the display and system from sleeping. When disabled, only prevents system sleep. |

---

## 🔒 Security & Permissions

* **No Administrator Privileges Required**: Runs completely under standard Windows user accounts.
* **No Registry Modifications**: Does not touch Windows Registry power keys.
* **No Power Plan Tampering**: Leaves active Windows power plans (`Balanced`, `High Performance`, etc.) untouched.
* **No Input Simulation**: Does not simulate fake mouse movements or keystrokes.

---

## 🔍 How It Works

Caffeine requests temporary continuous execution states from Windows via the Win32 `SetThreadExecutionState` API:

* **System Awake**: `ES_CONTINUOUS | ES_SYSTEM_REQUIRED` (0x80000001)
* **System + Display Awake**: `ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED` (0x80000003)

The request is maintained by a lightweight background helper process for the exact chosen duration or until manually stopped. When the session expires or is stopped, the execution state is cleanly released with `ES_CONTINUOUS` (0x80000000) and the helper terminates, immediately returning Windows to its normal configured power behavior.

---

## 🛠️ Development

### Prerequisites

* Node.js (v18+)
* Windows 10 or Windows 11
* Raycast for Windows

### Setup

```bash
# Install dependencies
npm install

# Run extension in development mode
npm run dev

# Run linter
npm run lint

# Build production bundle
npm run build

# Run unit and runtime test suite
npm test
```

---

## 📄 License

MIT License.
