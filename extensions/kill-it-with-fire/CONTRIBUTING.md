# Contributing to Kill It With Fire 🔥

Thanks for your interest in contributing! This project is a fun Raycast extension that sets your screen on fire, and contributions of all kinds are welcome.

## Getting Started

### Prerequisites

- **macOS** (required — the overlay relies on native macOS APIs)
- **Node.js** ≥ 18
- **Xcode Command Line Tools** (`xcode-select --install`)
- **Raycast** installed on your Mac

### Setup

```bash
git clone https://github.com/tylerlotz/raycast-kill-it-with-fire.git
cd raycast-kill-it-with-fire
npm install        # installs deps + compiles the Swift overlay binary
npm run dev        # starts the Raycast dev server
```

Open Raycast and search for **"Kill It With Fire!"** to test.

## Project Structure

| Path | Purpose |
|------|---------|
| `src/kill-it-with-fire.tsx` | Raycast command entry point |
| `swift/overlay.swift` | Native macOS overlay (transparent window + WebView) |
| `assets/flame.html` | Self-contained flame animation (loaded by the overlay) |
| `scripts/build-overlay.sh` | Compiles the Swift source into `assets/overlay` |
| `demo/` | Standalone browser demo (not part of the extension) |

## Development Workflow

1. **Modify the flame animation** → Edit `assets/flame.html`. Reload from Raycast or use the browser demo (`demo/index.html`) for rapid iteration.
2. **Modify the overlay window** → Edit `swift/overlay.swift`, then run `npm run build-overlay` to recompile.
3. **Modify the Raycast command** → Edit `src/kill-it-with-fire.tsx`. The dev server (`npm run dev`) picks up changes automatically.

## Submitting Changes

1. Fork the repository and create a feature branch from `main`.
2. Make your changes with clear, descriptive commits.
3. Test locally via `npm run dev` in Raycast.
4. Open a pull request against `main`.

## Code Style

- **TypeScript** (Raycast command): Follow the existing Raycast ESLint config. Run `npm run lint` before submitting.
- **Swift** (overlay): Keep it minimal — the overlay is intentionally a single-file CLI.
- **JavaScript** (flame engine): Use JSDoc comments for public APIs.

## Reporting Issues

Found a bug or have a feature idea? [Open an issue](https://github.com/tylerlotz/raycast-kill-it-with-fire/issues) with:

- macOS version
- Raycast version
- Steps to reproduce (if applicable)

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
