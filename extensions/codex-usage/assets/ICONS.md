# Icons

This extension uses the following icons:

## Source Icons
- **Source File**: `codex-usage-icon-v2.png` / `codex-usage-icon-v2.svg`
- **Provided by**: User (gleve)

## Icon Files

| File | Size | Usage |
|------|------|-------|
| `command-icon.png` | Original | Main extension icon - shown in Raycast store and command list |
| `menu-bar-icon.png` | Original | Menu bar icon - shown in system menu bar |
| `preferences-icon.png` | Original | Preferences icon - shown in settings |

## Usage in Code

Icons are referenced in `package.json`:

```json
{
  "icon": "command-icon.png",
  "commands": [
    {
      "name": "index",
      "icon": "command-icon.png"
    },
    {
      "name": "menu-bar",
      "icon": "menu-bar-icon.png"
    },
    {
      "name": "preferences",
      "icon": "preferences-icon.png"
    }
  ]
}
```

## Notes

- Menu bar icons work best when simple and monochrome
- Raycast automatically handles icon scaling
- SVG source file is kept for future edits
