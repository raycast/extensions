# Raycast Kill It With Fire
Kill it with fire! Set your screen on fire and watch it burn. A chaotic alternative to Raycast's confetti. 

[Raycast](https://raycast.com) has confetti. That's nice. But what do you do when you need to express your frustration? 

Kill It With Fire is a chaotic alternative to Raycast's confetti for when you need to **kill something with fire!**

## Features

- **Full-screen transparent overlay** — renders on top of your desktop and all apps
- **Growing flame wall** — fire rises from the bottom to midscreen over ~3 seconds
- **Billowing smoke** — smoke particles float from the flame front to the top of the viewport
- **Click-through** — interact with your apps while the screen burns
- **Lightweight** — canvas particle system with zero runtime dependencies
- **Auto-close** — the overlay disappears after ~6 seconds

## Install

### From the Raycast Store

Search for **"Kill It With Fire"** in the Raycast Store and click Install.

### From Source

> **Requirements:** macOS 12+, Node.js ≥ 18, Xcode Command Line Tools

```bash
git clone https://github.com/tylerlotz/raycast-kill-it-with-fire.git
cd raycast-kill-it-with-fire
npm install          # installs deps + compiles the Swift overlay binary
npm run dev          # starts the Raycast dev server
```

Open Raycast → search **"Kill It With Fire!"** → press Enter.

## How It Works

The extension has two main pieces:

1. **Raycast command** (`src/kill-it-with-fire.tsx`) — a "no-view" command that spawns the native overlay binary as a detached child process.
2. **Native macOS overlay** (`swift/overlay.swift`) — a minimal Swift CLI that:
   - Creates a borderless, always-on-top, transparent `NSWindow` covering the main screen
   - Loads the flame animation (`assets/flame.html`) inside a `WKWebView`
   - Sets `ignoresMouseEvents = true` so clicks pass through
   - Auto-terminates after the configured duration

The flame animation itself is a canvas-based particle system with two particle types (flame & smoke) driven by a `FullWidthGrowingEmitter` that ramps spawn rate and vertical coverage over time.

## Project Structure

```
kill-it-with-fire/
├── src/
│   └── kill-it-with-fire.tsx     Raycast "no-view" command entry point
├── swift/
│   └── overlay.swift             Native transparent-window overlay (Swift)
├── assets/
│   ├── flame.html                Self-contained flame animation page
│   ├── command-icon.png          Extension icon
│   └── overlay                   Compiled macOS binary (git-ignored, built on install)
├── scripts/
│   └── build-overlay.sh          Compiles overlay.swift → assets/overlay
├── package.json                  Raycast extension manifest & npm scripts
├── tsconfig.json                 TypeScript configuration
├── LICENSE                       MIT License
├── CONTRIBUTING.md               Contribution guidelines
└── CHANGELOG.md                  Release notes
```

## Development

### Modifying the flame animation

Edit `assets/flame.html` directly.

### Rebuilding the overlay binary

After modifying `swift/overlay.swift`:

```bash
npm run build-overlay
```

This compiles the Swift source and places the binary at `assets/overlay`. The binary is also automatically compiled on `npm install` via the `postinstall` hook.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Raycast dev server |
| `npm run build` | Build the extension for publishing |
| `npm run lint` | Run ESLint |
| `npm run fix-lint` | Auto-fix lint issues |
| `npm run build-overlay` | Recompile the Swift overlay binary |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, development workflow, and submission guidelines.

## License

[MIT](LICENSE) © Tyler Lotz
