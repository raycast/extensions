<div align="center">
  <img src="assets/globalping.png" alt="Globalping Icon" width="70" height="70">
  <h1>The Official Globalping Extension for Raycast</h1>
  <p><em>Run ping, traceroute, MTR, DNS, and HTTP checks from Globalping probes directly in Raycast.</em></p>
</div>

---

## Features

- Run network measurements from multiple probes worldwide
- Compare probe results in a compact Raycast-native UI
- Choose locations from continents, countries, cities, cloud regions, networks, ASNs, and more
- Re-run tests quickly with native Raycast shortcuts on macOS and Windows
- Switch DNS record types and HTTP methods from the action panel and with dedicated shortcuts
- Keep your most-used probe locations handy with recent and popular local suggestions
- Create Raycast Quicklinks for your favorite checks
- Share or copy results for debugging and support workflows

## Commands

This extension includes five commands:

- `Ping`: Compare latency, packet loss, and per-probe timing data
- `DNS`: Resolve all Globalping-supported DNS record types from multiple locations
- `HTTP`: Run `HEAD` and `GET` requests from distributed probes
- `Traceroute`: Inspect the route to a target hop by hop
- `MTR`: Combine latency and route data in a compact multi-hop view

## Configuration

Globalping requires signing in with your Globalping account through Raycast's native OAuth flow before you can run measurements.

Available preferences:

- `Default Probe Count`: Global default number of probes used by all commands

Sign-in happens automatically when you open a command for the first time.

See more information about the API and its limits in the [Globalping API documentation](https://globalping.io/docs/api.globalping.io#overview).

## Usage

1. Open one of the Globalping commands in Raycast
2. Enter a hostname, IP, domain, or URL target
3. Optionally open `Edit Location` with `⌘L` on macOS or `Ctrl+L` on Windows to choose or compose a probe location
4. Run the test with `⌘R` on macOS or `Ctrl+R` on Windows

Tips:

- If you leave the location empty, the extension falls back to your most-used local location when available, otherwise `world`
- DNS record types can be switched from the header dropdown or with shortcuts
- HTTP methods can be switched from the header dropdown or with shortcuts
- Results stream into the list as probe updates arrive
- You can create a Raycast Quicklink from any command result to save a reusable check with pre-filled arguments

## Supported Locations

The location picker is built from Globalping probe data and supports more than just cities and countries. Depending on probe availability, you can target:

- `world`
- Continents and regions
- Countries and US states
- Cities
- Providers and ASNs
- Network types like `eyeball` and `datacenter`
- Cloud filters such as `aws+europe`, `aws-us-east-1`, `gcp-europe-west3`,`oracle+europe` or `azure-eastus`

## Notes

- Probe availability depends on the live Globalping network
- Some measurement types may complete in batches depending on the API response model
- This extension uses the official Globalping API at `api.globalping.io`

## Quicklinks

The extension supports Raycast Quicklinks directly.

From any command result, use `Create Raycast Quicklink` to save a reusable shortcut that reopens the same Globalping command with the same arguments, including:

- target
- location
- DNS record type
- HTTP method

Quicklinks are managed by Raycast itself, so users can rename them, assign aliases or hotkeys, and sync them with Raycast Cloud Sync when available.

## Shortcuts

The extension follows Raycast shortcut conventions as closely as possible:

- `⌘R` / `Ctrl+R`: Run the current test again
- `⌘L` / `Ctrl+L`: Open `Edit Location` from any measurement view
- `⌘C` / `Ctrl+C`: Copy the primary result for the current command
- `⌘S` / `Ctrl+S`: Create a Raycast Quicklink
- DNS and HTTP commands expose additional record-type or method shortcuts in the Action Panel

## Development

Install dependencies with `npm install`, then run `npm run dev` to launch the extension in Raycast development mode.

This extension was created by [@Valent1d](https://github.com/valent1d) for Globalping
