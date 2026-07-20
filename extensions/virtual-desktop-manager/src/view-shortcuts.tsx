import { Detail } from "@raycast/api";

const SHORTCUTS_MD = `
# Virtual Desktop Keyboard Shortcuts

## Go to Desktop
| Shortcut | Action |
|----------|--------|
| \`Numpad 1\` | Go to Desktop 1 |
| \`Numpad 2\` | Go to Desktop 2 |
| \`Numpad 3\` | Go to Desktop 3 |

## Move Window & Follow
| Shortcut | Action |
|----------|--------|
| \`Numpad 4\` | Move window to Desktop 1 & follow |
| \`Numpad 5\` | Move window to Desktop 2 & follow |
| \`Numpad 6\` | Move window to Desktop 3 & follow |

## Move Window (Stay on Current)
| Shortcut | Action |
|----------|--------|
| \`Numpad 7\` | Move window to Desktop 1 (stay) |
| \`Numpad 8\` | Move window to Desktop 2 (stay) |
| \`Numpad 9\` | Move window to Desktop 3 (stay) |

## Navigate Desktops
| Shortcut | Action |
|----------|--------|
| \`Ctrl + Shift + Win + ←\` | Previous Desktop (wraps) |
| \`Ctrl + Shift + Win + →\` | Next Desktop (wraps) |

## Move Window Left/Right
| Shortcut | Action |
|----------|--------|
| \`Win + Alt + ←\` | Move window left & follow |
| \`Win + Alt + →\` | Move window right & follow |

## Desktop Management
| Shortcut | Action |
|----------|--------|
| \`Alt + Numpad+\` | Create desktop & switch |
| \`Win + Numpad+\` | Create desktop (stay) |
| \`Alt + Numpad-\` | Remove current desktop |
| \`Ctrl + Shift + Numpad+\` | Ensure 3 desktops exist |

## Pin Window
| Shortcut | Action |
|----------|--------|
| \`Numpad 0\` | Toggle pin window |
| \`Ctrl + Numpad 0\` | Pin window |
| \`Alt + Numpad 0\` | Unpin window |
| \`Win + Numpad 0\` | Check if window is pinned |

## Pin App
| Shortcut | Action |
|----------|--------|
| \`Numpad .\` | Toggle pin app |
| \`Ctrl + Numpad .\` | Pin app |
| \`Alt + Numpad .\` | Unpin app |
| \`Win + Numpad .\` | Check if app is pinned |

## Info / Utility
| Shortcut | Action |
|----------|--------|
| \`F1\` | Show current desktop number |
| \`F2\` | Show total desktop count |
| \`F3\` | Exit daemon |

---

**Run "Run Keybindings Daemon"** to enable these shortcuts.

**Use "Edit Keybindings"** to customize any shortcut.
`;

export default function Command() {
  return <Detail markdown={SHORTCUTS_MD} navigationTitle="Keyboard Shortcuts" />;
}
