# Remote Desktop Manager Connections for Raycast

Search and open connections from [Devolutions Remote Desktop Manager](https://devolutions.net/remote-desktop-manager/) directly from Raycast.

The extension is designed for macOS users who keep their RDM connections in the local SQLite data source and want a fast keyboard-driven launcher.

## Features

- Search RDM connections by name or folder.
- Optionally show folders as separate navigable items.
- Open the selected connection directly in Remote Desktop Manager.
- Copy the generated `rdm://` link from the action menu.
- Refresh the connection list without restarting Raycast.
- Keep credentials and passwords inside Remote Desktop Manager.

## Requirements

- macOS.
- [Raycast](https://www.raycast.com/) installed.
- [Remote Desktop Manager for macOS](https://devolutions.net/remote-desktop-manager/) installed.
- A local RDM SQLite data source at:

  ```text
  ~/Library/Application Support/com.devolutions.remotedesktopmanager/Connections.db
  ```

The extension uses RDM's registered `rdm://` URL scheme to open connections. Remote Desktop Manager must be installed and associated with that URL scheme.

## Installation

### Install from source

Clone the repository and start the extension in Raycast development mode:

```bash
git clone https://github.com/<your-username>/raycast-remote-desktop-manager.git
cd raycast-remote-desktop-manager
npm install
npm run dev
```

Raycast imports the extension during `npm run dev`. After the first successful import, you can stop the development process with `Ctrl+C`; the extension remains available in Raycast. Run `npm run dev` again only when developing or changing the source.

### Use the extension

1. Open Raycast.
2. Search for **Remote Desktop Manager Connections**.
3. Type part of a connection name or folder name.
4. Press `Enter` on a connection to open it in Remote Desktop Manager.

You can assign a Raycast hotkey to the command for faster access.

### Folder display

Open the extension's preferences in Raycast and use **Show Folders** to control folder items:

- Enabled: folders appear as separate items. Selecting a folder opens a second view containing only the connections in that folder.
- Disabled: folder items are hidden, but each connection still shows its full folder path beside its name.

When **Show Folders** is disabled, all Connection rows are shown in one searchable list regardless of their folder location.

This setting does not remove folder information from connection rows.

### Recent connections

- **Show Recent** controls whether the Recent section is displayed.
- **Show Recent at Start of List** moves Recent above the folders and connections. When disabled, Recent appears at the end.

Recent items are not duplicated in the regular connection list.

The root view follows the RDM hierarchy: it shows top-level folders and only connections that are directly at the root level. Opening a folder shows its direct child folders and direct connections. Searching from the root remains global and searches all available connections and folder paths regardless of their folder depth.

## How it works

The extension reads non-sensitive metadata from the local `Connections.db` SQLite database, including connection IDs, names, folders, and connection types. When a connection is selected, it builds an `rdm://open` URL and asks macOS to open it. Remote Desktop Manager then resolves the connection and handles authentication and the actual remote session.

The extension does not read or store passwords, credential values, private keys, or other sensitive connection fields.

## Limitations

- macOS only.
- The current implementation supports the local SQLite data source only.
- Connections stored exclusively in Devolutions Server, Devolutions Hub, SQL Server, or another remote data source are not queried directly.
- Remote Desktop Manager must be installed and configured on the same Mac.
- RDM must be able to access the selected data source and resolve the connection.
- If the database is moved, renamed, unavailable, or locked in a way that prevents reading, the list may be empty or stale.
- The extension does not manage credentials, start VPNs, or replace any RDM security settings.
- Opening a connection still follows the authentication, VPN, gateway, jump host, and permission requirements configured in RDM.

## Development

```bash
npm install
npm run dev
```

Validate a production build with:

```bash
npm run build
```

Run lint checks with:

```bash
npm run lint
```

### Continuous integration

GitHub Actions runs on pushes to `main` and on pull requests. It installs the locked dependencies with `npm ci`, builds the distribution bundle, and runs Raycast lint checks. The workflow is defined in `.github/workflows/ci.yml`.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
