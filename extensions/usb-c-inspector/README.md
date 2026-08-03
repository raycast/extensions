# USB-C Inspector

See exactly what your USB-C and MagSafe cables can do — charging watts, data speed, Thunderbolt, and connected devices — directly from Raycast.

## Requirements

- **Apple Silicon Mac** (M1 or later). USB-PD / e-marker data is not available on Intel Macs.
- **macOS 14 (Sonoma)** or later.

## Development

```bash
npm install
npm run dev
```

Open Raycast and run **Show All USB-C Ports** or **Check Connected Cables**.

```bash
npm run lint
npm run build
npm run publish
```

## How it works

This extension is a Raycast UI for the official open-source [WhatCable](https://github.com/darrylmorley/whatcable) diagnostic engine (MIT).

On first launch it:

1. Looks for an existing `whatcable` binary (optional preference path, WhatCable.app helper, or Homebrew).
2. If none is found, downloads the notarized `whatcable-cli` zip from [GitHub Releases](https://github.com/darrylmorley/whatcable/releases).
3. Verifies the zip with the published SHA-256 digest, extracts it into the extension support folder, and runs `whatcable --json`.

You do **not** need to install WhatCable separately. An optional preference lets you point at a custom CLI path if you already manage the binary yourself.

## Commands

- **Show All USB-C Ports** — list every USB-C and MagSafe port with side-by-side details.
- **Check Connected Cables** — same view, filtered to ports that currently have something plugged in.

## Credits

Diagnostics are provided by [WhatCable](https://github.com/darrylmorley/whatcable) by Darryl Morley and contributors, licensed under MIT. This extension is an independent Raycast frontend and is not affiliated with the WhatCable project.
