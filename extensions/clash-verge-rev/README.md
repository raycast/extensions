# Clash Verge Rev Raycast Extension

[中文](README.zh.md)

A Raycast extension for managing Clash Verge Rev and Mihomo from Raycast. It lets you switch subscription profiles, manage proxy groups and nodes, change proxy modes, inspect live connections, and view real-time logs without opening the Clash Verge Rev desktop app.

![](https://fastly.jsdelivr.net/gh/czh020110/image@main/images/2026-06-12_222924_clash-raycast-1.png)

## Features

![](https://fastly.jsdelivr.net/gh/czh020110/image@main/images/2026-06-12_223714_clash-raycast-4.png)

- Manage subscription profiles from Raycast.
- Quickly switch profiles by selecting a profile or passing a custom shortcut argument.
- Edit profile metadata, subscription URL, update interval, and Raycast-only shortcuts.

![](https://fastly.jsdelivr.net/gh/czh020110/image@main/images/2026-06-12_223231_clash-raycast-2.png)

- Manage proxy groups and switch nodes.
- Search proxy groups or nodes with flexible search modes.
- Test node delay individually or test all nodes in a proxy group.

![](https://fastly.jsdelivr.net/gh/czh020110/image@main/images/2026-06-12_223424_clash-raycast-3.png)

- Switch Mihomo mode between Rule, Global, and Direct.

![](https://fastly.jsdelivr.net/gh/czh020110/image@main/images/2026-06-12_223828_clash-raycast-5.png)

- View live connection traffic, speed, rule, chain, process, source, and destination details.
- Sort active connections by speed, traffic, start time, or host.
- Close one connection or all active connections.

![](https://fastly.jsdelivr.net/gh/czh020110/image@main/images/2026-06-12_224159_clash-image-5.png)

- View real-time Clash/Mihomo logs and copy visible logs.

## Requirements

- Raycast installed.
- Clash Verge Rev installed and running.
- Mihomo external controller enabled in Clash Verge Rev.
- The external controller port must match the extension preference. The default is `9090`.
- If your Mihomo controller uses a secret, configure the same secret in the extension preferences.

## Installation and Development

Install dependencies:

```bash
npm install
```

Start local development in Raycast:

```bash
npm run dev
```

Build the extension:

```bash
npm run build
```

Lint the code:

```bash
npm run lint
```

Fix lint issues automatically where possible:

```bash
npm run fix-lint
```

## Extension Preferences

Open the extension preferences in Raycast and configure:

| Preference          | Description                                                                | Default        |
| ------------------- | -------------------------------------------------------------------------- | -------------- |
| Controller Port     | Mihomo external controller port.                                           | `9090`         |
| API Secret          | Mihomo external controller secret. Leave empty if no secret is configured. | Empty          |
| Default Search Mode | Default search target in Manage Proxies.                                   | Groups         |
| Default Sort Order  | Default sorting method in View Connections.                                | Download Speed |

## Commands

### Manage Proxies

View all proxy groups and proxy nodes, switch the selected node for a group, and test node delays.

Usage tips:

- Use the search box to search by the configured default search mode.
- Prefix the search text with `:` to search the other type. For example, if the default is Groups, `:hk` searches nodes instead.
- Use the proxy group dropdown to focus on a specific group.
- Use `Ctrl + ←` and `Ctrl + →` to move between proxy groups.
- Use `Ctrl + Return` to test the selected node delay.
- Use `Ctrl + Shift + Return` to test all nodes in the current group.
- Use the optional command argument `query` to open the command with an initial search query.

### Manage Subscriptions

View Clash Verge Rev subscription profiles, switch the active profile, edit profile metadata, and copy subscription URLs.

When switching a profile, the extension updates Clash Verge Rev's `profiles.yaml`, merges the selected profile content into the current `clash-verge.yaml`, and asks Mihomo to reload the merged configuration. This avoids a full Clash Verge Rev restart in the common case.

Usage tips:

- Select a profile and run **Activate Profile** to switch to it.
- Run **Edit Profile** to update name, description, shortcut, subscription URL, or update interval.
- Run **Copy Subscription URL** for remote profiles.
- Use `Cmd + R` to refresh the profile list.
- Use the optional command argument `shortcut` to quickly switch to a profile by a saved shortcut.

Profile shortcuts are stored separately by this extension in Clash Verge Rev's config directory as `raycast-shortcuts.json`; they are not written into `profiles.yaml`.

### Switch Mode

Switch Mihomo's proxy mode:

- Rule Mode: routes traffic according to rules.
- Global Mode: routes all traffic through the proxy.
- Direct Mode: bypasses proxy routing.

The command also shows selected current config values such as mixed port, LAN access, and log level.

### View Connections

View active Mihomo connections in real time through the controller WebSocket.

Displayed information includes:

- Current global upload and download speed.
- Total upload and download traffic.
- Connection host, process path, network type, source, destination, rule, rule payload, chain, start time, and per-connection speed.

Usage tips:

- Use the dropdown to sort by download speed, upload speed, total download, total upload, start time, or host name.
- Use `Ctrl + ←` and `Ctrl + →` to cycle sorting options.
- Use **Detail View** / **List View** to switch display style.
- Use `Ctrl + X` to close the selected connection.
- Use `Ctrl + Shift + X` to close all active connections.
- Use copy actions to copy the host or proxy chain.

### View Logs

View recent Clash/Mihomo logs in real time.

Usage tips:

- The command keeps the latest 100 log entries.
- Use the search box to filter visible logs.
- Use **Detail View** to show parsed fields from common connection logs.
- Copy a single log entry or all currently visible logs.
- Use `Ctrl + X` to clear the current log list.
- Use `Ctrl + R` to reconnect to the log stream.

## How It Works

This extension uses two integration paths:

1. Mihomo external controller API
   - REST endpoints are used for proxies, configs, delay testing, and connection closing.
   - WebSocket is used for live connections.
   - Streaming HTTP is used for live logs.

2. Clash Verge Rev local configuration files
   - `profiles.yaml` is read to list and activate profiles.
   - `clash-verge.yaml` is rewritten during fast profile switching.
   - Profile files under the Clash Verge Rev `profiles` directory are used as the source of subscription content.
   - `raycast-shortcuts.json` stores Raycast-only profile shortcuts.

On Windows, the Clash Verge Rev config directory is expected at:

```text
%APPDATA%\io.github.clash-verge-rev.clash-verge-rev
```

## Troubleshooting

### Failed to fetch proxies or configuration

Check that Clash Verge Rev is running, Mihomo external controller is enabled, and the controller port in Raycast preferences matches Clash Verge Rev.

### Unauthorized or API errors

If Clash Verge Rev has configured an external controller secret, set the same value in the extension's **API Secret** preference.

### Profiles config not found

Make sure Clash Verge Rev has been launched at least once and has created its config files. The extension reads profiles from Clash Verge Rev's app data directory.

### Connection or log stream does not update

Check that the controller port and secret are correct. Then use the command's reconnect or refresh action.
