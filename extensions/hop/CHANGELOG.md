# Changelog

## [Initial Release] - 2026-02-28

### Features

- Fuzzy search connections from hop config (`~/.config/hop/config.yaml`)
- Connect to SSH servers in your preferred terminal
- Support for multiple terminals: Terminal.app, iTerm, Warp, Alacritty, Kitty, custom
- Copy SSH command to clipboard
- Copy host or user@host to clipboard
- Recent connections sorted to top (reads from `history.yaml`)
- Connections grouped by project
- Environment color coding (prod=red, staging=orange, dev=green)
- Tags displayed in purple
- Configurable terminal preference
- Configurable config file path

### Supported Connection Fields

- `id`, `host`, `user`, `port`
- `project`, `env`, `tags`
- `identity_file`, `proxy_jump`, `forward_agent`
- Custom SSH `options`
