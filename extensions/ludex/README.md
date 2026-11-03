<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="media/banner-dark.png">
  <img alt="Ludex: launch games and open their save, config and install folders" src="media/banner-light.png" width="720">
</picture>

<br>

[![License: MIT](https://img.shields.io/github/license/Leocadio94/ludex?style=flat-square&color=6366F1)](https://github.com/Leocadio94/ludex/blob/main/LICENSE)
[![Windows 10 | 11](https://img.shields.io/badge/Windows-10%20%7C%2011-0078D4?style=flat-square&logo=windows11&logoColor=white)](#supported-stores)
[![Raycast](https://img.shields.io/badge/Raycast-extension-8B5CF6?style=flat-square&logo=raycast&logoColor=white)](#features)
[![Source](https://img.shields.io/badge/source-Leocadio94%2Fludex-6366F1?style=flat-square&logo=github&logoColor=white)](https://github.com/Leocadio94/ludex)

**[Features](#features) · [Supported stores](#supported-stores) · [How it works](#how-it-works) · [Credits](#credits)**

</div>

---

Every PC game hides its saves somewhere different. Ludex puts them one keystroke away: open Raycast, type a game, and jump to its save folder, its config, its install directory, or just start the game. Windows only.

This is the Raycast version of [Ludex](https://github.com/Leocadio94/ludex), which also has a Flow Launcher plugin and a PowerToys Command Palette extension. Those two share a C# core; this one is written in TypeScript and shares no code with them.

Save locations come from the [Ludusavi Manifest](https://github.com/mtkennerly/ludusavi-manifest), a community-maintained database covering about 19,000 games.

## Features

### Browse Games

Lists the games detected on your machine, grouped by store, each with the artwork its store keeps on disk. Each game shows how many save and config paths are known and whether they exist on disk. From there you can launch the game or open its save, config or install folder in Explorer. If a save folder has not been created yet, the nearest existing parent opens instead.

- Ctrl+R refreshes the installed games.
- Ctrl+Shift+R refreshes the game database.

### Search Games

Searches the whole Ludusavi database by name. Use it to check whether a game is supported before you install it.

### Refresh Installed Games

Re-scans the stores for newly installed or removed games and updates the local cache. The installed games list is cached for 1 hour, and this command clears it right away.

### Refresh Game Database

Downloads the Ludusavi Manifest from GitHub again and rebuilds the index. Use it when save paths look outdated. The database is cached locally for 7 days.

## Supported Stores

| Store            | Detection method                              |
| ---------------- | --------------------------------------------- |
| Steam            | Registry + `libraryfolders.vdf`               |
| GOG              | Registry                                      |
| Epic Games       | Launcher manifests (`%ProgramData%\Epic\...`) |
| Xbox / Game Pass | `%LOCALAPPDATA%\Packages\...`                 |

## How it works

1. On first launch, the Ludusavi Manifest (about 16 MB of YAML, roughly 19,000 entries) is streamed straight to disk, so it never sits in memory.
2. The manifest is parsed line by line into a compact JSON index, filtered to the current OS to keep it small. The index lives in Raycast's support directory and is reused for 7 days. If an update fails, for example offline, the last index keeps working.
3. Installed games are found by reading each store's own files: `.acf` for Steam, the registry for GOG, JSON manifests for Epic and package folders for Xbox.
4. Detected games are matched against the index by store ID first, then by normalized name.
5. Save and config paths are resolved by expanding the Ludusavi path variables (`<home>`, `<winAppData>`, `<winLocalAppData>` and so on) and checking whether they exist on disk.

## Path variables

The Ludusavi Manifest uses named placeholders for common directories. The extension resolves them to real paths at runtime:

| Variable               | Resolves to            |
| ---------------------- | ---------------------- |
| `<home>`               | `C:\Users\<user>`      |
| `<winAppData>`         | `%APPDATA%`            |
| `<winLocalAppData>`    | `%LOCALAPPDATA%`       |
| `<winLocalAppDataLow>` | `AppData\LocalLow`     |
| `<winDocuments>`       | `Documents`            |
| `<winProgramData>`     | `%PROGRAMDATA%`        |
| `<base>`               | Game install directory |

## Credits

Save path data is provided by the [Ludusavi Manifest](https://github.com/mtkennerly/ludusavi-manifest), maintained by the open-source community.
