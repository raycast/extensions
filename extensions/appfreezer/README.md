# App Freezer for Raycast

Search, pause, and resume macOS applications from Raycast. This extension is a thin client: only the native App Freezer agent manages process trees, sends signals, applies safety rules, and persists recovery state.

## Requirements

- macOS
- Raycast
- App Freezer v0.1.0 or newer

The extension locates App Freezer by bundle identifier (`com.chxsong.AppFreezer`), invokes the bundled `Contents/MacOS/appfreezerctl` for typed JSON snapshots, and sends actions through the `appfreezer://` URL scheme. It never sends process signals itself.

Install App Freezer before using the extension. The native app is distributed separately because process-tree management, safety exclusions, and recovery records remain in the signed macOS agent.

## Commands

### Pause or Resume App

- Search running applications
- Pause or resume the selected application
- Ask an application to quit normally (with confirmation)
- Resume all paused applications
- Open App Freezer Settings
- Refresh the native-agent snapshot

### Resume All Apps

Resume every application currently paused by App Freezer.

### Quit App

Send a normal Quit request to a selected application after confirmation.

### Force Quit App

Force quit a selected application after confirmation. Unsaved changes may be lost.

Application lists can be sorted by name, CPU, or memory. Paused status, CPU, and memory appear as accessories.

## Development

```sh
npm install
npm run typecheck
npm test
npm run lint
npm run build
```

Install and run App Freezer before testing actions. The native agent protocol is documented in [`docs/protocol.md`](docs/protocol.md).

## License

MIT. App Freezer's native agent is distributed separately and is not covered by this repository's license.
