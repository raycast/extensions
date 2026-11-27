# Chocolatey for Raycast (Windows)

Search, install, upgrade, pin, and uninstall [Chocolatey](https://chocolatey.org/) packages on Windows directly from Raycast, modeled after the Raycast Brew extension.

## Features

- **Search Packages**: Fast search powered by the Chocolatey Community OData v2 API (with CLI fallback for private/offline sources), showing package icons, download counts, dependencies, and install status.
- **Show Installed**: View all installed packages separated into **Pinned** and **Installed** sections, with quick actions to upgrade, pin/unpin, inspect `choco info`, or uninstall.
- **Show Upgrades**: Review outdated packages (`current → available`), upgrade individual packages, or upgrade all non-pinned packages at once.
- **Upgrade All Packages**: `no-view` command to update every unpinned Chocolatey package in one step.
- **Manage Sources**: List, add, enable, disable, and remove Chocolatey package repositories.
- **Export Packages**: Generate and save a `packages.config` XML manifest (with or without pinned version numbers) to restore your setup on another machine.

## Requirements

- Windows with Raycast for Windows
- [Chocolatey CLI](https://chocolatey.org/install) (`choco.exe`) installed

## Elevation Options

Modifying Chocolatey packages typically requires administrator privileges. You can choose your preferred elevation method in **Extension Preferences**:

- **Windows UAC Prompt (PowerShell)** *(Default)*: Prompts via standard UAC and captures full output and exit status.
- **gsudo**: Runs elevated commands inline when `gsudo.exe` is available on `PATH`.
- **Open in Terminal**: Launches commands in an elevated Windows Terminal / PowerShell window so you can watch live installation logs.
- **No Elevation**: Runs `choco.exe` directly for non-administrator Chocolatey installations.

## Development

```bash
npm install
npm run dev
```

Run tests, linter, and production build:

```bash
npm test
npm run lint
npm run build
```
