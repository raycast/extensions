# Blip Send

Send files from Finder or File Explorer to any of your [Blip](https://blip.net) devices or contacts, and manage transfers, without opening the Blip window.

## Commands

- **Send Files with Blip**. Select files or folders in Finder or File Explorer, open Raycast, run the command, pick a device or a person, press Enter. If nothing is selected, a file picker appears instead. Type an email address to reach anyone on Blip.
- **Blip Transfers**. Live list of transfers with size, status and time. Accept or decline incoming transfers, pause, resume, cancel, and reveal received files in your file manager. Press ⌘D (Ctrl+D on Windows) for a detail panel with speed, route and encryption.
- **Blip Devices and Contacts**. See which of your devices are online, rename or remove a device, and manage contacts.

## Requirements

- macOS or Windows, with the Blip app installed and signed in. Get it at [blip.net](https://blip.net).
- Blip must be running. The extension offers to open it when it is not.

## Preferences

- **After Sending**: close Raycast (default) or stay on the transfer list to watch progress.
- **Save Incoming Files To**: folder used when you accept a transfer from Raycast. Empty means Blip's own setting.

## How it talks to Blip

Blip has no public API. The desktop app runs a core service and talks to it over a local Unix socket, the same channel Blip's own share extension uses. This extension speaks that protocol directly, so it only works on the computer where Blip is installed, and nothing leaves your machine except through Blip itself.

Windows needs one extra hop. Node cannot open a Unix socket there, so the extension starts a small PowerShell bridge (`assets/blip-bridge.ps1`) that accepts a named pipe and relays it to Blip's socket. The bridge only ever talks to that socket, it exits when the command ends, and everything above the transport is the same code on both platforms.

Because the protocol is private, a Blip update could change it. If a command stops working after a Blip update, please open an issue with the Blip version number.

## Not affiliated

Blip is a product of Blip Studio Inc. This extension is an independent project and is not endorsed by or affiliated with Blip.
