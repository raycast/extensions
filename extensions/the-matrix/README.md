# The Matrix

Summon a click-through Matrix rain overlay from Raycast, with procedural audio, randomized quotes, and a graceful red pill exit.

The overlay is a native macOS window that stays above your desktop, ignores mouse input, and renders cmatrix-style fixed-cell rain across every display.

## Commands

- **Take a Blue Pill** starts the Matrix overlay.
- **Take a Red Pill** reverses, fades out, and stops the Matrix overlay.

## Preferences

- **Audio enabled** controls enter, ambient, and exit sounds.

## Notes

- macOS only.
- The rain behavior is inspired by [`cmatrix`](https://github.com/abishekvashok/cmatrix).
- No external `cmatrix`, Electron runtime, or bundled audio files are required.
- Audio is generated procedurally inside the overlay.
