# SSH Proxy Router for Raycast

Route selected websites through an SSH SOCKS tunnel on macOS while every other website continues to use the normal network connection. The routed sites open under their ordinary HTTPS URLs in Safari—no browser extension or manual proxy switching is required.

The extension provides a Raycast command and menu-bar item for starting, stopping, testing, and inspecting the tunnel.

## Features

- Exact host rules such as `internal.example.com`
- Wildcard rules such as `*.corp.example.com`
- Normal website URLs in Safari and other macOS applications that honor system proxy settings
- Built-in macOS `/usr/bin/ssh`; no `autossh`, VPN client, or browser extension required
- `launchd` supervision for automatic tunnel recovery after network interruptions
- Automatic backup and restoration of existing macOS PAC settings
- All configuration stored in Raycast preferences
- Local listeners bind only to `127.0.0.1`

## Requirements

- macOS
- The latest [Raycast](https://www.raycast.com/) for macOS (v2)
- Python 3 available at `/usr/bin/python3` for the local PAC server (verify with `/usr/bin/python3 --version`; on macOS this may require Apple's Command Line Tools)
- Working SSH key or SSH-agent access to a gateway that can reach the desired websites

Connect to the SSH gateway once in Terminal before using the extension. This lets SSH confirm the gateway's host key and verifies that authentication works:

```sh
ssh -p 22 username@gateway.example.com
```

## Installation

The extension is being prepared for the Raycast Store. Until the submission is accepted, install from source as described below. Once published, users will be able to install it directly from Raycast's Store without Node.js or npm.

### Install from source

Source installation and development require Node.js 22.22.2 or newer and npm.

Clone the repository and install its dependencies:

```sh
git clone https://github.com/mariusrueve/raycast-ssh-proxy-router.git
cd raycast-ssh-proxy-router
npm install
npm run dev
```

Raycast opens the local extension. Run **SSH Proxy Router** once to activate its menu-bar item. You can then stop `npm run dev` with `Control-C`; the local extension remains installed in Raycast.

To update an existing installation:

```sh
git pull
npm install
npm run dev
```

This extension uses Raycast SDK 2.4.1. When migrating from Raycast v1, update the Raycast app and Node.js first, then run the update commands above to rebuild and register the extension with Raycast v2. Existing extension preferences and SSH proxy state use the same identifiers and paths.

## Configuration

Open **Raycast Settings → Extensions → SSH Proxy Router**.

| Setting             | Description                                                                     | Example                                |
| ------------------- | ------------------------------------------------------------------------------- | -------------------------------------- |
| SSH User            | Account on the SSH gateway                                                      | `username`                             |
| SSH Gateway         | Gateway that can reach the private websites                                     | `gateway.example.com`                  |
| SSH Port            | Gateway's SSH port                                                              | `22`                                   |
| SSH Identity File   | Optional private key; leave empty to use the SSH agent/config                   | `~/.ssh/id_ed25519`                    |
| Routed Websites     | Comma-separated exact hosts, URLs, or wildcard hosts                            | `wiki.example.com, *.corp.example.com` |
| Primary Website URL | Optional URL used by **Open Primary Website**                                   | `https://wiki.example.com`             |
| Local SOCKS Port    | Local dynamic-forward port                                                      | `1080`                                 |
| Local PAC Port      | Local PAC-file server port                                                      | `18080`                                |
| Start Timeout       | Seconds allowed for SSH startup                                                 | `15`                                   |
| Network Services    | Optional comma-separated macOS services; empty applies to every enabled service | `Wi-Fi`                                |
| Open in Safari      | Open menu-bar website actions specifically in Safari                            | Enabled                                |

### Routing rules

Rules are separated with commas or semicolons.

- `internal.example.com` routes only that exact hostname.
- `*.corp.example.com` routes both `corp.example.com` and all its subdomains.
- `https://review.example.com/path` is accepted and normalized to `review.example.com`.

Only matching hosts use the SSH tunnel. The PAC file returns `DIRECT` for all other traffic.

After editing routing or connection settings, choose **Repair SSH Proxy Router** from the menu-bar item (or stop and start it). Repair applies the new PAC configuration and restarts SSH when the gateway, user, port, identity-file path, or SOCKS port changes. It saves original settings for newly selected network services and restores services removed from the selection. Repair briefly restores saved network settings before replacing listeners.

Only one Start, Stop, or Repair operation can run at a time, including actions from the separate Toggle command. If another action is in progress, wait for it to finish and retry.

## How it works

When started, the extension:

1. Creates a user LaunchAgent for an SSH dynamic forward bound to `127.0.0.1`.
2. Generates a PAC file containing the selected exact and wildcard host rules.
3. Creates a second user LaunchAgent that serves the PAC file on localhost.
4. Saves the current automatic-proxy settings for each selected macOS network service.
5. Enables the localhost PAC URL.

Stopping the extension restores the saved proxy settings before unloading and disabling either LaunchAgent. If restoration fails for any service, the backup and agents are retained; correct the reported issue and retry **Stop and Restore Proxy Settings** in the menu. This recovery action is available while routing is degraded. Their stable plist files remain installed so macOS does not treat every later start as newly installed background software. Raycast itself does not need to stay open for the tunnel to remain active.

### Background activity and battery use

While routing is active, the SSH tunnel and the local Python PAC server remain running as background LaunchAgents. A healthy idle tunnel does very little work: SSH checks an otherwise idle connection once per minute, and the PAC server waits for local requests without writing routine access logs.

If the gateway or DNS is unavailable, `launchd` restarts SSH at most once per minute. The menu-bar status reports the last SSH exit code and reconnect attempt information when available. Its automatic status check runs every five minutes; **Refresh Status** and all menu actions still check immediately.

Stopping the router unloads and disables both LaunchAgents. To compare energy use while running and stopped, open **Activity Monitor → Energy**, enable the **Idle Wake Ups** column, and compare **Energy Impact** over several minutes. You can also run `pmset -g assertions` in Terminal to confirm that the router is not preventing system sleep.

## Troubleshooting

- Confirm direct SSH access works using the same user, gateway, and port.
- Ensure the SOCKS and PAC ports are not already occupied.
- If a host is not routed, enter only its hostname or a supported `*.` wildcard—not a general glob or regular expression.
- Use **Test Routed Websites** from the menu bar to check the configured exact hosts through the tunnel.
- Runtime logs are stored in `~/.local/state/raycast-ssh-proxy-router/`.
- A **Reconnecting** status means the SSH LaunchAgent is loaded but its local SOCKS port is not ready. Check `ssh-tunnel.log` for DNS, authentication, or gateway failures; retries are limited to once per minute.
- If settings were changed while active, use **Repair SSH Proxy Router**.
- If a local port is occupied, stop the conflicting application or choose another port. The router verifies its own PAC server before enabling routing.
- The localhost HTTP server serves only `proxy.pac`; logs, saved settings, and diagnostic snapshots are private files and cannot be fetched through it.
- On the first activation, macOS may disclose that `ssh` and `python3` can run in the background. These are the two local LaunchAgents used for the tunnel and PAC server. Later stop/start cycles reuse those registrations instead of recreating them.

## Development

CI runs formatting, lint, offline tests, and the distribution build on macOS for each push to `main` and pull request. See [Publishing](PUBLISHING.md) for manually triggered release builds and Store submissions.

```sh
npm install
npm run build
npm run lint
npm run format:check
npm run dev
```

`npm run lint` validates the Raycast manifest and assets and runs ESLint and Prettier. Use `npm run format` to apply formatting changes.

### Testing without the GUI

```sh
npm run build      # Generate Raycast types and build into ./dist
npm test           # Local behavior tests; no SSH or system proxy changes
npm run check      # Formatting, lint, offline tests, and Raycast build
npm run test:live  # Read-only diagnostics against the active router (macOS)
```

Tests use Node's built-in test runner and temporary state directories with simulated system commands. They cover routing, listener identity, backup preservation, restoration failures, changed SSH preferences, and concurrent operations. Runtime tests also launch a temporary Python HTTP server on a random localhost port and exercise OS locks from independent processes; Python 3 and permission to bind localhost are required. They never change system proxy settings or start SSH connections. Run `npm run build` once after a clean checkout to generate Raycast's preference types. Test compilation writes to `.test-dist/`, and the distribution build writes to `dist/`; both are ignored. The full `check` command also needs access to Raycast's online manifest validation.

The live test uses `~/.local/state/raycast-ssh-proxy-router/diagnostic-config.json`. The updated Raycast extension saves this minimal snapshot after a successful start or healthy status refresh. For the first run after updating, load the extension with `npm run dev` and refresh its menu-bar status once (or allow the scheduled refresh to run). For a router started by an older extension version, run **Repair SSH Proxy Router** once to activate the restricted PAC server and record its instance identity. Once the snapshot exists, repeat live tests entirely from the terminal.

The snapshot records the active host rules, primary URL, local ports, and network services. It excludes SSH connection credentials and identity-file paths, is written with owner-only permissions, and is retained when routing stops. A live test verifies the actual running state rather than treating an existing snapshot as proof that routing is active. Changes made only in Raycast preferences are not active settings until the router is repaired or restarted.

`test:live` checks the LaunchAgents and listeners, each saved service's macOS PAC setting, the served PAC content and routing decisions, and website reachability through SOCKS with remote DNS and TLS verification. Raycast's **Test Routed Websites** action runs the same diagnostics. The terminal command prints `PASS`, `FAIL`, or `SKIPPED` for each check and exits nonzero if any check fails or cannot run. It never starts or stops agents, writes router state, or changes proxy settings; compilation only updates local build artifacts.

- **Missing or invalid snapshot:** load the updated extension and refresh its healthy menu-bar status once.
- **Missing agent or listener:** the router is stopped or reconnecting; start it or resolve the SSH connection issue before testing again.
- **PAC settings/content mismatch:** use **Repair SSH Proxy Router**, then rerun the live test.
- **Website failure:** inspect the reported DNS, TLS, connection, or timeout error. Each request allows 20 seconds; the PAC fetch allows five seconds.
- **HTTP 401/403 or another HTTP response:** transport reachability succeeded; the reported status does not prove login or application health. Redirects are not followed.

Live tests cover the primary URL and each additional exact-host rule, deduplicated by hostname. Wildcards are tested as PAC decisions rather than by requesting arbitrary subdomains. Routine changes need no GUI testing, but occasional Raycast/Safari smoke tests remain useful for menu rendering and Safari's own use of system PAC settings.

## License

MIT
