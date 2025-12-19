# ArchiSteamFarm Raycast Extension

Interact with your locally hosted [ArchiSteamFarm (ASF)](https://github.com/JustArchiNET/ArchiSteamFarm) instance directly from Raycast!

## Features

- **Dashboard**: View summary of your ASF instance and manage your bots.
- **Copy 2FA**: Quickly copy 2FA tokens from your bots to your clipboard.

## Prerequisites

- You must have a running instance of **ArchiSteamFarm (ASF)**.
- **IPC (Inter-Process Communication)** must be enabled and accessible on your ASF instance.
  - Ensure `IPC` is set to `true` in your `ASF.json` configuration.
  - Review the [ASF IPC Wiki](https://github.com/JustArchiNET/ArchiSteamFarm/wiki/IPC) for setup details.

## Configuration

This extension requires the following configuration:

1.  **ASF URL**: The URL where your ASF IPC is hosted (default: `http://localhost:1242`).
2.  **IPC Password**: Your ASF IPC password (if one is set).

## Installation

Install from the Raycast Store.
