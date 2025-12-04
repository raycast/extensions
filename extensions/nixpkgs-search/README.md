# NixPkgs Search

Raycast version of <https://search.nixos.org>

## Features

- Search NixOS packages directly from Raycast
- View package details including description, version, homepage, and licenses
- Copy package attribute names, URLs, and source code links
- **Support for multiple NixOS branches** - switch between different NixOS versions
- In-app branch switcher with validation

## Preferences

### Search Result Count

Choose how many results to display at once:

- 10 results
- 20 results (default)
- 50 results
- 100 results

## Branch Selection

### Branch Selection

The extension features a **branch selector** directly in the search interface. Available NixOS branches are validated at runtime to ensure they are currently indexed by search.nixos.org.

### Available Branches

The dropdown includes:

- **Unstable** (rolling release) - Latest bleeding edge packages
- **NixOS 25.05** - Current stable release

Simply select your preferred branch from the dropdown in the search bar to switch between different NixOS versions.

### How It Works

The extension uses a predefined list of NixOS branches that are currently supported by search.nixos.org. The available branches are hardcoded in the extension to ensure reliable access to working search endpoints.
