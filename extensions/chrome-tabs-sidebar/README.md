# Chrome Tabs Sidebar

A Raycast extension that toggles Chrome's vertical tabs sidebar with a single keystroke.

Chrome's vertical tabs sidebar ("Expand tabs" / "Collapse tabs") has no keyboard shortcut. This extension uses the macOS Accessibility API to find and press it programmatically — no coordinate hacking, works on any screen or resolution.

## Install

1. Install from the [Raycast Store](https://www.raycast.com/saqibameen/chrome-tabs-sidebar) (or run `npm run dev` locally)
2. Grant Raycast accessibility permission in System Settings > Privacy & Security > Accessibility

That's it. Open Raycast, search "Toggle Sidebar", and run it.

## Default Shortcut

**Cmd + Shift + ,** — configurable in Raycast Settings > Extensions > Chrome Tabs Sidebar.

## Requirements

- macOS 13+
- [Raycast](https://www.raycast.com/)
- Google Chrome with tab sidebar enabled
- Xcode Command Line Tools (`xcode-select --install`)

## How It Works

1. Finds Chrome by its bundle identifier
2. Gets the frontmost window's accessibility element
3. Recursively walks the AX tree for a button titled "Expand Tabs" or "Collapse Tabs"
4. Presses it via `AXUIElementPerformAction`

The Swift source is compiled on first run and cached — subsequent invocations execute in ~10ms.

## Development

```bash
git clone https://github.com/saqibameen/chrome-sidebar-toggle.git
cd chrome-sidebar-toggle
npm install
npm run dev
```

## License

MIT

---

Built by [Saqib Ameen](https://x.com/saqibameen) with [Command Code](https://commandcode.ai)
