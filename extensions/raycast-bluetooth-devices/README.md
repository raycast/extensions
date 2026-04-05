# Bluetooth Devices for Raycast

[![Latest release](https://img.shields.io/github/v/tag/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME?sort=semver&label=version&style=flat-square&color=0070F3)](https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME/releases/latest)
[![Build](https://img.shields.io/github/actions/workflow/status/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME/publish.yml?branch=main&style=flat-square)](https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME/actions/workflows/publish.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)

Manage Windows Bluetooth devices directly from [Raycast](https://raycast.com). Connect, disconnect, pair, remove, and toggle your adapter — including a real-time scan that matches what Windows Settings sees.

---

## Features

| Command | Description |
|---|---|
| **Manage Bluetooth Devices** | Sectioned list of paired devices (Connected / Not Connected). Connect, disconnect, or remove any device. Shows MAC address, device kind (Classic / LE), and audio output status. |
| **Toggle Bluetooth** | Instantly flip the adapter on or off. Displays a HUD confirmation. |
| **Scan for Bluetooth Devices** | Active radio scan — puts the adapter into inquiry mode, same as Windows Settings. Discover and pair nearby devices. |

### Audio output integration

Connected devices show a speaker badge:

- 🔊 **Green** — currently the default audio output
- 🔊 **Grey** — audio endpoint matched but not the default
- _(no badge)_ — no audio endpoint found for this device

Use **Set as Audio Output** (`⌘A`) to switch the default without opening Sound Settings.

---

## Requirements

| Requirement | Details |
|---|---|
| **OS** | Windows 10 (build 19041 / 2004) or later |
| **Raycast** | v1.50+ ([download](https://raycast.com)) |
| **Runtime** | Self-contained — no .NET installation needed (CLI is bundled) |

---

## Installation

### From the Raycast Store _(once published)_

Search **"Bluetooth Devices"** in the Raycast Extension Store.

### From source

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME

# 2. Build and run in dev mode (requires .NET 8 SDK + Raycast desktop app)

---

## Architecture

```
repository-root/          Raycast extension (TypeScript + React) + C# .NET 8 app
│
├── package.json          Raycast manifest
├── Program.cs            WinRT + Win32 Bluetooth APIs
├── WinBluetoothCli.csproj
│                         Commands: list · connect · disconnect · remove
│                                   pair · toggle · status · scan
│                                   audio-list · set-audio · info
│
├── src/
│   ├── bluetooth.ts        Typed wrapper around the CLI binary
│   ├── manage-devices.tsx  "Manage Bluetooth Devices" command
│   ├── toggle-bluetooth.tsx "Toggle Bluetooth" no-view command
│   └── scan-devices.tsx    "Scan for Bluetooth Devices" command
│
└── assets/cli/
    └── WinBluetoothCli.exe Self-contained CLI (built by prebuild script)

---

## Development

```bash
npm install
npm run dev          # compiles C# CLI + starts Raycast hot-reload watcher
npm run build        # production build
npm run lint         # ESLint + Prettier check
npm run fix-lint     # auto-fix
```

To rebuild the CLI only:

```bash
dotnet publish WinBluetoothCli.csproj -c Release -r win-x64 --self-contained true \
  -p:PublishSingleFile=true \
  -o ./assets/cli

---

## CI / CD

Releases are managed by **[release-please](https://github.com/googleapis/release-please)** via [`.github/workflows/release.yml`](.github/workflows/release.yml).

### Flow

```
push to main
    │
    ▼
release-please reads commits
    │
    ├─ no releasable commits? → nothing happens
    │
    └─ releasable commits found?
           │
           ▼
       "Release vX.Y.Z" PR opened / updated
           │
           │   ← review, edit version or changelog, or close to hold
           │
           ▼ (PR merged)
       package.json bumped, vX.Y.Z tag pushed
       C# CLI compiled, extension published to Raycast store
       GitHub Release created with CHANGELOG
```

### Commit message format

The next version is inferred from commit messages on `main`:

| Prefix | Example | Bump |
|---|---|---|
| `feat:` | `feat: add device battery level` | `minor` → `1.1.0` |
| `fix:` / `perf:` | `fix: airpods reconnect loop` | `patch` → `1.0.1` |
| `feat!:` or `BREAKING CHANGE:` | `feat!: require Windows 11` | `major` → `2.0.0` |
| `chore:` / `docs:` / `ci:` | `docs: update readme` | _(no release)_ |

### Manual override

Before merging the Release PR you can:

- **Change the version** — edit the PR title: `chore(main): release 1.2.0`
- **Edit the changelog** — modify `CHANGELOG.md` directly in the PR branch
- **Hold the release** — close the PR; it will reopen on the next releasable commit
- **Force a specific version** — add label `autorelease: custom 2.0.0` to the PR

### Setup

Add this secret to your repository (**Settings → Secrets → Actions**):

| Secret | Where to get it |
|---|---|
| `RAYCAST_API_TOKEN` | [raycast.com/settings](https://www.raycast.com/settings) → API |

---

## Contributing

Pull requests are welcome. Please follow the [conventional commit](https://www.conventionalcommits.org) format so release-please can infer the correct version bump automatically.

1. Fork the repo
2. Create a branch (`git checkout -b feat/my-feature`)
3. Write commits using the prefixes above (`feat:`, `fix:`, etc.)
4. Push and open a Pull Request against `main`

---

## License

MIT © see [LICENSE](LICENSE)
