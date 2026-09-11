<p align="center">
    <img src="./assets/command-icon.png" width="150" height="150" />
</p>

# Terminal Finder

Open currently selected Finder (or Path Finder) window in **Terminal**<sup>*</sup>

### <sup>*</sup> Supported:

- [cmux](https://www.cmux.dev/)
- [Ghostty](https://ghostty.org/)
- [iTerm2](https://iterm2.com/)
- [kitty](https://sw.kovidgoyal.net/kitty/)
- Terminal
- [Warp](https://www.warp.dev/)
- [WezTerm](https://wezterm.org/index.html)

### cmux note

`cmux` support uses the bundled `cmux` CLI. In `cmux`, open `Settings -> Automation` and set `Socket Mode` to `Allow all local processes` or `Password`; the default external-control mode blocks Raycast from opening new cmux workspaces or reading the active working directory.
