# SecureCRT

Open saved SecureCRT sessions from Raycast.

## Commands

### SecureCRT Sessions

Lists saved SecureCRT sessions from your SecureCRT configuration folder. Select a session to open it in SecureCRT.

The command:

- Recursively scans the `Sessions` folder inside your SecureCRT config path.
- Shows the session name and, when enabled in the extension options, the host name and protocol.
- Opens sessions with SecureCRT's `/T /S <session>` arguments so they open in a tab when SecureCRT is already running.

Available actions:

- **Open Session**: Opens the selected session in SecureCRT.
- **Copy Hostname**: Copies the configured SecureCRT host value. This does not necessarily match the session name; it may be an IP address or FQDN.
- **Reload Sessions**: Reloads the session list from disk.

## Preferences

### SecureCRT Config Path

Default: `auto`

This is the path to SecureCRT's `Config` folder. The extension reads sessions from:

```text
<SecureCRT Config Path>/Sessions
```

When set to `auto`, the extension asks SecureCRT where its config folder is by reading the macOS preference:

```bash
defaults read com.vandyke.SecureCRT "Config Path"
```

If SecureCRT has not stored a custom config path, the extension falls back to:

```text
~/Library/Application Support/VanDyke/SecureCRT/Config
```

You can replace `auto` with an explicit config folder path if needed, for example:

```text
~/Library/Application Support/VanDyke/SecureCRT/Config
```

The value should point at the `Config` folder itself, not the `Sessions` folder inside it.

### SecureCRT App Path

Default:

```text
/Applications/SecureCRT.app/Contents/MacOS/SecureCRT
```

This is the path used to launch SecureCRT. You can provide either the executable path or the `.app` bundle path:

```text
/Applications/SecureCRT.app
```

If a `.app` path is provided, the extension resolves it to:

```text
<app>/Contents/MacOS/SecureCRT
```

Paths beginning with `~` are supported.

### Show Hostnames

Default: enabled

Controls whether the extension reads each session file while loading the list to show hostnames and protocols.

When enabled, hostnames and protocols appear in the list, and hostnames can be copied immediately.

When disabled, the list loads faster because session files are not read for metadata up front. The **Copy Hostname** action still works by reading only the selected session file when you use the action.
