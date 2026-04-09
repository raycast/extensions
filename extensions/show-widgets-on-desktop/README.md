# Desktop Widgets

A [Raycast](https://raycast.com/) extension for macOS that toggles **Show widgets on desktop**—the same option as **System Settings → Desktop & Dock → Widgets**—without opening Settings.

## Features

- **Toggle Desktop Widgets** — Switch desktop widgets on or off from Raycast with a single command
- **Clear feedback** — Success and error toasts so you know the new state immediately
- **No extra UI** — Runs as a no-view command (fast path from the root search)

## Requirements

- macOS (widgets on desktop are a system feature; behavior depends on your OS version)
- [Raycast](https://raycast.com/)

## Installation

### From source

1. Clone this repository and open the folder in a terminal.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Start development mode:

   ```bash
   npm run dev
   ```

4. In Raycast, run **Toggle Desktop Widgets** (search for “Desktop Widgets” or the command title).

## Usage

Open Raycast and run **Toggle Desktop Widgets**. Each invocation flips the setting: widgets shown ↔ widgets hidden.

## Development

| Command            | Description                                      |
| ------------------ | ------------------------------------------------ |
| `npm run dev`      | Development mode with hot reload (`ray develop`) |
| `npm run build`    | Production build (`ray build`)                   |
| `npm run lint`     | ESLint via Raycast CLI                           |
| `npm run fix-lint` | Auto-fix lint issues where possible              |
| `npx ray validate` | Validate manifest, icons, and tooling            |

## Technical notes

- The extension updates the `StandardHideWidgets` key under `com.apple.WindowManager` using the `defaults` command. This matches the standard (non–Stage Manager) desktop. If you rely on **Stage Manager**-specific widget visibility, macOS may use a separate preference; this extension targets the usual desktop toggle.

## License

MIT.

## Author

[Zoran Jambor](https://zoranjambor.com)
