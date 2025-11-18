# NixPkgs Search

Raycast version of <https://search.nixos.org>

## Features

- Search NixOS packages directly from Raycast
- View package details including description, version, homepage, and licenses
- Copy package attribute names, URLs, and source code links
- **Dynamic support for multiple NixOS branches** - automatically fetched from the latest available versions
- In-app branch switcher with real-time updates

## Preferences

### Search Result Count
Choose how many results to display at once:
- 10 results
- 20 results (default)
- 50 results
- 100 results

## Branch Selection

### Dynamic Branch Dropdown
The extension now features a **dynamic branch selector** directly in the search interface. Available NixOS branches are automatically fetched from the [nix-version-reporter API](https://github.com/0xdhrv/nix-version-reporter), ensuring you always have access to the latest indexed channels without needing to update the extension.

### Currently Available Branches
The dropdown automatically includes:
- **Unstable** (rolling release) - Latest bleeding edge packages
- **NixOS 25.05** - Current stable release
- **NixOS 24.11** - Previous stable release
- **NixOS 24.05** - Older stable release
- **NixOS 23.11** - Older stable release
- **NixOS 23.05** - Older stable release

The list updates automatically based on which branches are currently indexed by search.nixos.org. Simply select your preferred branch from the dropdown in the search bar to switch between different NixOS versions.

### How It Works
When you launch the extension, it fetches the current list of available NixOS channels from:
```
https://raw.githubusercontent.com/0xdhrv/nix-version-reporter/refs/heads/main/versions.json
```

This ensures that:
- You always see the most up-to-date list of searchable branches
- New NixOS releases appear automatically without extension updates
- Invalid or deprecated branches are removed from the options

If the API is temporarily unavailable, the extension gracefully falls back to the "unstable" branch to ensure uninterrupted functionality.
