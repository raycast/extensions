# Clash Verge Controller

Control Clash Verge directly from Raycast: switch proxy nodes, toggle modes, refresh subscriptions, and run speed tests without leaving your keyboard.

## Prerequisites

- Clash Verge installed and running with the External Controller enabled.
- Controller URL and optional secret (found in Clash Verge Settings → General → External Controller).
- A selector group name that contains the proxies you want to switch (default: `Proxy`).

## Setup

1. Open the command in Raycast and fill in the preferences:
   - **Controller URL** – e.g. `http://127.0.0.1:9090`
   - **External Controller Secret** – leave empty if not configured
   - **Selector Group Name** – the Clash selector group to control
   - **Speed Test URL / Timeout** – optional overrides for latency tests
2. Ensure Clash Verge is running and the external controller is reachable from your Mac.

## Commands

- **Switch Proxy**: list proxy nodes by provider, switch the active node, copy node addresses, and mark the active selection.
  - Run latency tests per node or in batch, plus download speed tests.
  - Toggle proxy mode between Rule / Global / Direct from the list dropdown or actions.
  - Refresh subscription providers and reload the node list.
  - Manage exclude URLs/domains that should bypass the proxy (synced to the controller when supported).
  - Quick actions to test controller connectivity and copy node addresses.

## Notes

- The extension only talks to your configured Clash external controller; nothing is sent elsewhere.
- Secrets are stored in Raycast preferences; avoid sharing screenshots or logs containing sensitive data.
