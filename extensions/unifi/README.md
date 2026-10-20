# UniFi

Monitor UniFi Network and Protect from Raycast, browse the wider UniFi platform, and ask Raycast AI about current infrastructure state.

## What It Does

- Opens with a unified Network and Protect health dashboard: offline Network hardware, firmware updates, low sensor batteries, actionable Protect disconnections, camera connectivity, and alarm mode.
- Turns the health count into a searchable problem list with direct links to the affected Network device or Protect resource.
- Keeps the same health summary in an optional menu-bar command that Raycast refreshes every 15 minutes.
- Searches Network devices and clients with detailed port, radio, and live-stat views.
- Pins important clients locally and keeps them visible when they are no longer connected.
- Browses documented Network resources including firewall, DNS, switching, VPN, RADIUS, hotspot, DPI, and traffic-list data.
- Browses Protect cameras, sensors, lights, sirens, relays, speakers, alarm hubs, NVRs, users, and related devices, with connected cameras shown first.
- Shows authenticated, file-backed camera snapshots and supports confirmed siren and Protect arm/disarm actions.
- Browses read-only Site Manager, Mobility, InnerSpace, and Carrier Fabric collections.
- Gives Raycast AI seven tools, including one combined Network and Protect health check, inventory search, resource lookup, device restart, and Protect control.

Every physical action requires an explicit Raycast confirmation. Read requests are retried only for rate limits and transient server errors; mutation requests are never retried automatically.

## Requirements

The implementation follows these official documentation releases:

- UniFi Network `10.4.57`
- UniFi Protect `7.3.53`
- UniFi Mobility `1.0.0`
- UniFi InnerSpace `1.3.23`
- UniFi Site Manager `1.0.0`
- UniFi Carrier Fabric `1.0.0`

Older application versions may expose only part of the documented API. Cloud Connector access requires a console that supports the Site Manager Cloud Connector.

## Set Up

1. Create an API key in UniFi Site Manager or your local UniFi console.
2. Open the extension preferences in Raycast.
3. Choose **Local Console** or **Cloud Connector**.
4. Enter the API key.
5. Enter the console IP or URL, such as `https://192.168.1.1`.
6. If a local console still uses UniFi's default self-signed certificate, enable **Allow a self-signed console certificate**.
7. For a cloud connection, enter the console ID shown in Site Manager.
8. Run **Select Site** before using Network commands.

API keys are sent only in the `X-API-Key` request header. They are never placed in URLs or returned by AI tools.

Raycast opens these preferences before any command can run until both the console address and API key have been entered. The extension does not scan an IP range. It connects to the single UniFi console address supplied here.

### TLS Certificates

Local Console mode requires HTTPS and validates the console certificate by default. Use a hostname and certificate trusted by the Raycast runtime when possible. For consoles that still use UniFi's default self-signed certificate, enable **Allow a self-signed console certificate** in the extension preferences. This opt-in applies only to direct Local Console requests. Cloud requests always validate certificates.

Allowing a self-signed certificate prevents the extension from confirming that it reached the intended console. Enable it only for a console you trust on a local network.

## Raycast AI

Use `@unifi` in Raycast AI to ask questions such as:

- Which Network devices are offline?
- Are any firmware updates available?
- Find the Front Door camera.
- Summarize the Protect installation.
- List the firewall policies for the selected site.
- Restart Garage AP.

The AI tools treat all names and descriptions returned by UniFi as untrusted data. They retrieve exact IDs before mutations and require confirmation for device restarts, sirens, relays, alarm outputs, PTZ movement, and arm-state changes.

## Product Direction

The primary commands focus on common customer questions: what is broken, who or what is connected, and whether a camera is reachable. The generic resource browsers remain available for advanced inspection without turning raw API operations into the main experience.

The health roll-up counts a Protect device only when an actionable camera or accessory reports the terminal `DISCONNECTED` state. Transitional `CONNECTING` records and inventory-only bridge, fob, and link-station records remain visible in the Protect browser but do not create top-level incidents.

High-value next steps are WAN quality history, change-only health notifications, and guest-access controls. Those require additional API and interaction validation before they should be exposed as reliable customer features.

Protect exposes live event messages through a WebSocket rather than a searchable event archive. Raycast unloads menu-bar commands between refreshes, so event history needs a separate durable collector before it can be reliable here.

## API Coverage

The extension reviewed all six published UniFi service specifications and exposes 56 allowlisted read resources. Network and Protect are first-class Raycast experiences; the other services use a generic read-only browser. Deliberately excluded high-risk or poor-fit operations are documented in [docs/API_COVERAGE.md](docs/API_COVERAGE.md).

## Development

```bash
npm install
npm run check
```

`npm run check` runs TypeScript, unit tests, Raycast linting, and a production build.
