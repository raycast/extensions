# OrbStack

Manage OrbStack machines and containers directly from Raycast

## Features

- **Machine Management** - Start, stop, and monitor OrbStack Linux machines instantly
- **Machine Creation** - Create new Linux machines with supported distributions
- **AI Chat Integration** - Ask AI to run commands in your Linux machines

## Prerequisites

Before using this extension, you must have:

1. **OrbStack installed** on your macOS device
   - [Download from orbstack.dev](https://docs.orbstack.dev/install)
   - Or install via Homebrew: `brew install orbstack`
2. **OrbStack CLI tools** (`orbctl`) automatically installed with OrbStack

## DANGER ZONE

By default OrbStack machines have [two-way file sharing](https://docs.orbstack.dev/machines/file-sharing) between the host and guest machines. If you use the `@orbstack` tool in
the AI chat and you ask it to run commands, you may inadvertently expose sensitive information, destroy important data, or compromise your host system.

## FAQs

1. **Why can't I set a user password when creating a machine?**

  `orbctl` (which this extension uses) prompts the user for a password during machine creation. We can't 'answer' the prompt via the raycast API. Use `orbctl` or `orb` cli if you need to set a username with password when creating a machine. Example: `orbctl create -u <user> -p <distro> <machine-name>`.

2. **Why do I get a `-bash: warning: setlocale: LC_ALL: cannot change locale ...` when I open a machine via the extension?**

  By default, macOS Terminal sets locale environment variables (like `LANG`, `LC_ALL`, and others) and, via SSH, forwards these to the remote host.
  I don't know of a workaround for this. If you know of a fix, please let me know.
