# App Freezer for Raycast

Search, pause, and resume macOS applications from Raycast. This extension is a deliberately thin client: only the native App Freezer agent manages process trees, sends signals, applies safety rules, and persists recovery state.

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

## Development

```sh
npm install
npm run typecheck
npm test
npm run lint
npm run build
```

Install and run App Freezer before testing actions. The native agent protocol is documented in [`docs/protocol.md`](docs/protocol.md).

Pause or Resume App replaces the duplicate standalone Pause and Resume commands. Resume All Apps, Quit App, and Force Quit App remain available. Application lists can be sorted by name, CPU, or memory and consistently show Paused status only when applicable, followed by CPU and memory using Raycast's standard text color. Quit and Force Quit always require confirmation. Refreshes and app actions are serialized because protocol v4 exposes one `lastAction` result slot. Older native agents are rejected with an upgrade message. The blue extension icon uses the exact native menu-bar PNG as its alpha mask; the unchanged source copy is `assets/menu-bar-mark.png`.

## License

MIT. App Freezer's native agent is distributed separately and is not covered by this repository's license.
