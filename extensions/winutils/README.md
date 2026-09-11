# Winutils (Raycast extension)

This Raycast extension provides a single command to launch the WinUtil script from ChrisTitusTech:
https://github.com/ChrisTitusTech/winutil

It runs the same installer/bootstrap command used by WinUtil and elevates a PowerShell process to run the remote script.

**What it does**
- Runs the WinUtil bootstrap command which downloads and executes the WinUtil script from the project's GitHub URL.
- Displays simple HUD notifications while launching and on success/failure.

**Security / privacy note**
This extension executes a remote script fetched from the internet. Review the script at the WinUtil repository before running. Do not run remote scripts you do not trust.

**Usage (development)**
1. Install dependencies:

```powershell
pnpm install
```

2. Run the extension locally in Raycast (dev mode):

```powershell
pnpm run dev
```

3. The command `winutils` will appear in your Raycast commands list (mode: `no-view`). Executing it will attempt to launch WinUtil.

**Build & publish**
- Build: `pnpm run build`
- Publish to Raycast store: `pnpm run publish`

**Notes**
- Platform: Windows only
- Notifications use `showHUD` (simple text HUD messages). The extension elevates PowerShell to run the installer and therefore will trigger a UAC prompt.

**License**
This repository uses the MIT license (see `package.json`).
