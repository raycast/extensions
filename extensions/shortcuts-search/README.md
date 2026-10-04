# Hotkys Raycast extension

Search all shortcuts, shortcuts for the current macOS or Windows app, or shortcuts for the current supported browser page. Apply is available only with a verified execution target and executable bindings. Failures stop execution without automatic retries.

```bash
npm ci
npm test -- --runInBand
npm run test:types
npm run lint
npm run build
npm run dev
```

Development/build requires a supported macOS or Windows host and the Raycast toolchain. To preview a local catalog, start the website, then run `npm run dev:catalog -- --origin http://localhost:3000`. Build and publish reject an active catalog override. See [contribution instructions](https://github.com/solomkinmv/hotkys/blob/main/CONTRIBUTING.md).

Accounts use public-client PKCE and Clerk. Account actions expose connect/disconnect and retry within a command; Raycast also provides native OAuth logout. Public catalog browsing remains usable when private synchronization fails. See [auth operations](https://github.com/solomkinmv/hotkys/blob/main/docs/auth-operations.md) for token modes, test scenarios, and rollout order.

Windows uses the app identifier returned by Raycast for matching and a separate executable process name for execution. Catalog metadata and installed-app resolution cover common desktop apps. A unique open target window is required; the runner verifies process ownership and focus before each chord. Windows binds Ctrl, Alt, Shift, and Win; macOS Cmd bindings are displayed but cannot be applied on Windows.

Custom app details on Hotkys accept a Windows app ID and a Windows process name, so a display name such as “My Editor” can target Visual Studio Code. Run **Copy Current App's ID** with the target app open: it copies the Windows app ID when available, or an executable process name such as `Code` when no ID is supplied. Paste the value into the corresponding field. macOS continues to copy the bundle ID. If several shortcut collections match the current Windows app, **List Current Shortcuts** offers a choice and keeps the detected native process as the execution target.

Current Web Shortcuts supports Chrome/Chromium, Edge, Brave, Vivaldi, Opera, and Firefox on Windows when their address bar is accessible to UI Automation. It captures the browser window and address value and cancels execution if either changes. Unsupported or ambiguous targets omit Apply or stop with an error. Windows blocks input to apps running at a higher integrity level.

Windows CI exercises native PowerShell helpers; interactive Raycast, browser, and account acceptance is documented in [Windows verification](https://github.com/solomkinmv/hotkys/blob/main/docs/verification/windows-support.md).
