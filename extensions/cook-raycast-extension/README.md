# Cook — Raycast Extension

A Raycast extension for [CookCLI](https://cooklang.org/cli/) — browse, search, scale, and generate shopping lists from your Cooklang recipe collection, all from the Raycast command bar.

## Prerequisites

Install CookCLI:

```sh
brew install cooklang/tap/cook
```

Or via cargo:

```sh
cargo install cookcli
```

## Commands

- **View Recipes** — Search and browse your recipe collection with full ingredient/cookware/step rendering
- **Shopping List** — Multi-select recipes and generate a combined ingredient list
- **Pantry** — Browse pantry inventory with filters and status indicators
- **Start Server** — Launch the CookCLI web UI in your browser

## Setup

1. Install CookCLI (see above)
2. Configure the extension preferences in Raycast:
   - **Recipe Directory**: Path to your Cooklang recipe collection (e.g. `~/Documents/Recipes`)
   - **CookCLI Binary Path**: Path to the `cook` executable (e.g. `/opt/homebrew/bin/cook`)
   - **Server Port**: Port for the web server (default: 9080)
