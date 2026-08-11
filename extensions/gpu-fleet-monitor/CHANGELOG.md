# GPU Fleet Monitor

## [0.2.0] - 2026-04-13

- Dynamic host groups: create, edit, and delete custom groups with pattern and identity file rules
- Single-command architecture: add hosts, manage groups, and quick-connect all from the main view
- Assign hosts to groups manually or automatically via name patterns and SSH identity files
- SSH `Include` directive glob pattern support
- Identity file (`-i`) flag parsed from SSH connection strings when adding hosts
- Improved error handling and path normalization

## [0.1.0] - 2026-04-13

- Monitor GPU and CPU usage across SSH hosts
- Quick Connect to best available free GPU host
- Tmux session listing and attachment
- Add Host from SSH connection string
- Support for Ghostty, iTerm, and macOS Terminal
- Support for Cursor and VS Code remote SSH
- Work / Personal host classification via identity files or patterns
- Configurable preferences for excluded hosts, timeouts, and refresh intervals
