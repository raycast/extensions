# Karabiner Elements Toggle

[![Raycast Extension](https://img.shields.io/badge/Raycast-Extension-blue.svg)](https://www.raycast.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![macOS](https://img.shields.io/badge/macOS-13%2B-brightgreen.svg)](https://www.apple.com/macos/)

> Toggle Karabiner-Elements complex modifications instantly from Raycast.

Perfect for developers who frequently switch between Vim-style navigation and standard arrow keys—or any other keyboard configuration that needs quick toggling.

## Features

- **Instant toggle** — Enable/disable rules in ~50ms
- **Bidirectional** — Automatically flips state (enabled ↔ disabled)
- **Visual feedback** — Clear HUD notification shows new state
- **Configurable** — Works with any complex modification rule
- **Safe** — Direct JSON manipulation with no external CLI dependencies

## Prerequisites

### Karabiner-Elements

This extension requires [Karabiner-Elements](https://karabiner-elements.pqrs.org/) to be installed and configured.

```bash
brew install --cask karabiner-elements
```

### Required Karabiner Configuration

#### Add your complex modification rule

Your `~/.config/karabiner/karabiner.json` must contain a rule with a `description` field that matches your configured preference.

**Example rule** (Vim Ctrl+HJKL → Arrow Keys):

```json
{
  "description": "Vim Ctrl+HJKL to Arrow Keys",
  "enabled": true,
  "manipulators": [
    {
      "type": "basic",
      "from": { "key_code": "h", "modifiers": { "mandatory": ["left_control"] } },
      "to": [{ "key_code": "left_arrow" }]
    },
    {
      "type": "basic",
      "from": { "key_code": "j", "modifiers": { "mandatory": ["left_control"] } },
      "to": [{ "key_code": "down_arrow" }]
    },
    {
      "type": "basic",
      "from": { "key_code": "k", "modifiers": { "mandatory": ["left_control"] } },
      "to": [{ "key_code": "up_arrow" }]
    },
    {
      "type": "basic",
      "from": { "key_code": "l", "modifiers": { "mandatory": ["left_control"] } },
      "to": [{ "key_code": "right_arrow" }]
    }
  ]
}
```

**Find your existing rule titles:**

```bash
grep '"description"' ~/.config/karabiner/karabiner.json
```

## Installation

### From Raycast Store

*Coming soon*

## Configuration

After installation, configure the extension in Raycast:

1. Open Raycast → **Settings** (`⌘ + ,`)
2. Navigate to **Extensions** → **Karabiner Elements**
3. Set **Rule Title** to the exact `description` from your `karabiner.json`

| Setting | Description | Default |
|---------|-------------|---------|
| **Rule Title** | Exact `description` of the complex modification rule | `Vim Ctrl+HJKL to Arrow Keys` |

> The title must match **exactly**, including capitalization and spacing.

## Usage

1. Open Raycast: `⌥ + Space` `⌘ + Space`
2. Search: `Toggle Vim Ctrl+HJKL Keys`
3. Press `Enter`

**HUD Feedback:**

| State Change | Notification |
|--------------|--------------|
| Enabled → Disabled | `⏸ Vim Ctrl+HJKL to Arrow Keys: Disabled` |
| Disabled → Enabled | `▶️ Vim Ctrl+HJKL to Arrow Keys: Enabled` |

### Pro Tip: Add a Hotkey

For even faster access:

1. Open Raycast → **Settings** → **Extensions**
2. Find **Toggle Vim Ctrl+HJKL Keys**
3. Click **Record Hotkey** and set your preferred shortcut (e.g., `⌃⌥K`)

## Project Structure

```
karabiner-elements/
├── assets/
│   └── command-icon.png       # Extension icon
├── src/
│   └── toggle-vim-ctrl-hjkl-keys.tsx  # Main command
├── package.json               # Raycast manifest & dependencies
├── tsconfig.json              # TypeScript configuration
└── README.md
```

## Development

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development mode with hot-reload |
| `npm run build` | Build the extension |
| `npm run lint` | Check for linting errors |
| `npm run fix-lint` | Auto-fix linting issues |
| `npm run publish` | Publish to Raycast Store |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **"Rule Not Found"** | Verify the title in preferences matches `description` in `karabiner.json` exactly |
| **Toggle has no effect** | Check that Karabiner's automatic reload is enabled in Misc settings |
| **Permission denied** | Fix ownership: `sudo chown -R $USER ~/.config/karabiner/` |
| **Changes not detected** | Restart Karabiner-Elements or run `launchctl kickstart -k gui/$(id -u)/org.pqrs.karabiner.karabiner_console_user_server` |

**Validate your Karabiner config:**

```bash
/Library/Application\ Support/org.pqrs/Karabiner-Elements/bin/karabiner_cli \
  --lint-complex-modifications ~/.config/karabiner/karabiner.json
```

## License

This project is licensed under the MIT License—see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Karabiner-Elements](https://karabiner-elements.pqrs.org/) — Powerful keyboard customizer for macOS
- [Raycast](https://www.raycast.com/) — Blazingly fast launcher and productivity tool

