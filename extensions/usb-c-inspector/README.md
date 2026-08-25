# USB-C Inspector

See exactly what your USB-C and MagSafe cables can do — charging watts, data speed, Thunderbolt, and connected devices — directly from Raycast.

## Requirements

- **Apple Silicon Mac** (M1 or later). USB-PD / e-marker data is not available on Intel Macs.
- **macOS 14 (Sonoma)** or later.

You do **not** need to install WhatCable separately. On first launch the extension downloads the notarized CLI from [GitHub Releases](https://github.com/darrylmorley/whatcable/releases) and verifies it with SHA-256.

## Commands

- **Show All USB-C Ports** — list every USB-C and MagSafe port with side-by-side details.
- **Check Connected Cables** — same view, filtered to ports that currently have something plugged in.

## Optional setup

If you already manage a `whatcable` binary yourself, set **WhatCable CLI Path** in the extension preferences. Otherwise the extension auto-detects WhatCable.app / Homebrew, or downloads the official CLI.

## Credits

Diagnostics are provided by [WhatCable](https://github.com/darrylmorley/whatcable) by Darryl Morley and contributors, licensed under MIT. This extension is an independent Raycast frontend and is not affiliated with the WhatCable project.
