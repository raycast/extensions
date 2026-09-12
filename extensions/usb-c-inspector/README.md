# USB-C Inspector

USB-C Inspector shows what each USB-C or MagSafe cable can do: charging watts, data speed, Thunderbolt, and the device on the other end.

Plug a cable in, pick the port, and read the details. On first launch the extension downloads the official WhatCable CLI and verifies it. No separate install needed.

## Requirements

- **Apple Silicon Mac** (M1 or later). USB-PD / e-marker data is not available on Intel Macs.
- **macOS 14 (Sonoma)** or later.

## Commands

- **Show All USB-C Ports** — list every USB-C and MagSafe port with side-by-side details.
- **Check Connected Cables** — same view, filtered to ports that currently have something plugged in.

## Optional setup

If you already manage a `whatcable` binary yourself, set **WhatCable CLI Path** in the extension preferences. Otherwise the extension auto-detects WhatCable.app / Homebrew, or downloads the official CLI.

## Credits

Diagnostics are provided by [WhatCable](https://github.com/darrylmorley/whatcable) by Darryl Morley and contributors, licensed under MIT. This extension is an independent Raycast frontend and is not affiliated with the WhatCable project.
