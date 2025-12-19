# API Key Vault (Raycast Extension)

For Raycast Store submissions, the extension README lives at:

- metadata/README.md

That file is what Raycast uses for metadata validation and Store listing content.

## Storage & Sync

This extension supports two storage backends (set via extension preferences):

- **Local (Raycast LocalStorage)**: Stored locally on this Mac.
- **iCloud Keychain (macOS Keychain)**: Stored in macOS Keychain and should sync across Macs signed into the same Apple ID with **iCloud Keychain** enabled.

To move existing data from LocalStorage to Keychain, use the **Migrate Storage** command.

## Development

- Dev: `npm run dev`
- Lint: `npm run lint`
- Build for local import: `npx ray build -e dist -o .raycast-build`

## Install (local import)

In Raycast, use **Import Extension** and select the `.raycast-build` folder.
