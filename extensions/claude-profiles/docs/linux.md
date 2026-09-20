# Linux

Claude Desktop for Linux is the same Electron app, so `--user-data-dir` works
the same way. `claude-profiles profile add` writes an XDG `.desktop` launcher,
which is what makes a profile appear in the app grid and be pinnable to the dock
— the direct equivalent of the separate `.app` the macOS side launches.

## Install Claude Desktop

Targets Anthropic's official Claude Desktop for Linux, not a browser wrapper.
Officially supported on Ubuntu 22.04+ and Debian 12+; anything with the
`claude-desktop` binary and a standard XDG desktop should work.

```bash
sudo curl -fsSLo /usr/share/keyrings/claude-desktop-archive-keyring.asc https://downloads.claude.ai/claude-desktop/key.asc
```

```bash
echo "deb [arch=amd64,arm64 signed-by=/usr/share/keyrings/claude-desktop-archive-keyring.asc] https://downloads.claude.ai/claude-desktop/apt/stable stable main" | sudo tee /etc/apt/sources.list.d/claude-desktop.list
```

```bash
sudo apt update && sudo apt install claude-desktop
```

Full docs: https://code.claude.com/docs/en/desktop-linux

## Where things go

| What | Path |
| --- | --- |
| Default profile | `$XDG_CONFIG_HOME/Claude` |
| Created profiles | `$XDG_CONFIG_HOME/claude-profiles/<slug>/` |
| Registry | `$XDG_CONFIG_HOME/claude-profiles/profiles.json` |
| Launchers | `$XDG_DATA_HOME/applications/claude-profile-<slug>.desktop` |
| Launcher badges | `$XDG_CONFIG_HOME/claude-profiles/icons/<slug>.svg` |
| Undo manifests | `$XDG_STATE_HOME/claude-profiles/runs/` |

Badges are generated SVGs, so there is no ImageMagick dependency.

## Running-window grouping

Pinned launcher icons are distinct per profile. The **running window** is not.

Electron derives a window's `WM_CLASS` — the identity GNOME and KDE use to group
taskbar entries — from the app's own internal name, and ignores Chromium's
`--class` override. Every profile's window therefore reports `WM_CLASS=Claude`
regardless of its `--user-data-dir`, and a shell may group several running
profiles under one indicator even while the pinned icons above it stay separate.

This is the same constraint the macOS side has, where a running window shows
Claude's standard Dock tile. Alt-Tab and the windows themselves are unaffected;
it is purely taskbar grouping.

On COSMIC, the Application Library reads standard XDG `.desktop` files, so
pinning should behave the same way. Whether its Wayland compositor groups
running windows identically is untested here.
