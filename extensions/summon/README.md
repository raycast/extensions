# Summon — Raycast Extension

Summon groups of app windows to the front. Define named groups and switch between them instantly — no manual alt-tabbing through a dozen apps.

## Features

- **Create Groups** — Pick from all currently open windows and group them into a named group.
- **Summon Groups** — One action brings all group windows to the front, so you jump straight into context.
- **Hotkey Slots (1–5)** — Assign a group to a slot and bind Raycast hotkeys for instant, keyboard-only summoning.
- **Smart Window Matching** — Matches windows by ID first, then by title substring, then by bundle ID as a fallback. Handles windows that change titles (e.g., VS Code, browsers).
- **Edit & Delete Groups** — Update window selections or remove groups at any time.
- **Data Migration** — Storage format upgrades automatically across versions, so groups are never lost.

## Commands

| Command | Description | Mode |
|---|---|---|
| **Create Group** | Open a form to name a group and pick which windows belong to it | View |
| **Summon Group** | List all groups and summon one (raises its windows) | View |
| **Summon Slot 1–5** | Instantly summon the group assigned to that slot | No-view (background) |

The `Summon Group` command also accepts a `groupName` argument for scripting or Quicklinks.

## Requirements

- **macOS** (uses macOS-specific window management APIs)
- **Accessibility permission** — The Swift helper uses the Accessibility API to raise windows. macOS will prompt you to grant permission the first time you summon a group. Go to **System Settings > Privacy & Security > Accessibility** and enable Raycast.
- **Xcode Command Line Tools** — Required to compile the Swift helper. Install with:
  ```sh
  xcode-select --install
  ```

## Installation

### From Source

```sh
git clone https://github.com/jamalx31/raycast-summon.git
cd raycast-summon
npm install
npm run build
```

Then open Raycast, run **Import Extension**, and select the project directory.

## How It Works

The extension uses a small Swift helper binary (`swift-helper/window-helper.swift`) that accesses macOS internals:

1. **Window enumeration** — Uses `CGWindowListCopyWindowInfo` and private `CGSCopySpacesForWindows` to list all windows with their space assignments.
2. **Display/space info** — Uses private `CGSCopyManagedDisplaySpaces` to map monitors to their desktops.
3. **Window raising** — Uses the Accessibility API (`AXUIElement`) to raise specific windows to the front by window ID, title match, or bundle ID.

These private CGS APIs (loaded via `dlsym` from the SkyLight framework) are well-known and used by many window management tools (yabai, Amethyst, etc.). They may break between major macOS versions.

Groups are stored as JSON in Raycast's support directory.

## Limitations

- **No Mission Control / Spaces switching** — There is no public macOS API for switching between Spaces (virtual desktops). Tools like yabai that can do this require System Integrity Protection (SIP) to be disabled, because Dock.app owns the privileged WindowServer connection for space operations.
- **Cross-space window raising** — Whether a window on another Space gets pulled to the current Space depends on the user's **"When switching to an application, switch to a Space with open windows for the application"** setting in System Settings > Desktop & Dock > Mission Control.
- **Windows are raised, not exclusively shown** — Other windows remain behind the summoned group. This is a raise-to-front operation, not a hide-everything-else operation.
- **Window IDs are ephemeral** — macOS window IDs change when apps restart. The extension falls back to title substring matching, then bundle ID matching when saved window IDs are stale.
- **Private CGS APIs may break between macOS versions** — The SkyLight framework APIs are undocumented and have broken on macOS 14.5, 15.0, and 15.4 in the past. If the helper stops working after a macOS update, recompiling with `npm run build-helper` usually resolves it.
- **Accessibility permission required** — Without it, the extension can list windows but cannot bring them to the front.

## Development

### Prerequisites

- Node.js (latest LTS)
- npm
- Xcode Command Line Tools (`xcode-select --install`)

### Setup

```sh
git clone https://github.com/jamalx31/raycast-summon.git
cd raycast-summon
npm install
```

### Build the Swift Helper

The native helper must be compiled before the extension can work:

```sh
npm run build-helper
```

This compiles `swift-helper/window-helper.swift` and copies the binary to `assets/`.

### Run in Development

```sh
npm run dev
```

This starts Raycast's development server with hot reload for the TypeScript code. Note: changes to the Swift helper require re-running `npm run build-helper`.

### Full Build

```sh
npm run build
```

This compiles the Swift helper and then builds the Raycast extension.

### Lint

```sh
npm run lint
npm run fix-lint
```

### Project Structure

```
├── assets/
│   ├── extension-icon.png       # 512x512 extension icon
│   └── window-helper            # Compiled Swift helper (generated)
├── swift-helper/
│   └── window-helper.swift      # Native macOS helper source
├── src/
│   ├── create-group.tsx         # Create/edit group form
│   ├── summon-group.tsx         # Group list + summon action
│   ├── summon-slot.tsx          # Generic slot summoner (no-view)
│   ├── summon-slot-[1-5].tsx    # Re-exports for each slot command
│   └── utils/
│       ├── native.ts            # Swift helper bridge (spawn + JSON parse)
│       ├── storage.ts           # JSON file storage with migrations
│       └── types.ts             # TypeScript interfaces
├── package.json
└── tsconfig.json
```

## License

MIT
