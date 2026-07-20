# DNS Quick Change

A Raycast extension to quickly switch between DNS presets, create custom DNS configurations, or reset to DHCP-provided DNS.

## Features

- **Quick DNS Switching** - Instantly switch between your saved DNS presets
- **DNS Presets** - Create and manage multiple named DNS configurations
- **DHCP Reset** - Quickly revert to automatic DHCP-assigned DNS
- **Network Details** - View comprehensive network information including IP address, subnet, router, and MAC address
- **Preset Descriptions** - Add descriptions to presets to remember what each one does

## Usage

### Switch to a Preset
1. Open the extension
2. Select a preset from the \"DNS Presets\" section
3. Press Enter to apply it
4. macOS will prompt for your password

### Create a New Preset
1. Select \"Add DNS Preset\" in the Quick Actions section
2. Enter a preset name (e.g., `home`, `work`, `filtered`)
3. Enter comma-separated DNS server IPs (e.g., `1.1.1.1, 1.0.0.1`)
4. Optionally add a description (e.g., \"Cloudflare - Fast & Privacy\")
5. Press Enter to save

### Edit or Delete Presets
- Press `⌘E` to edit a preset
- Press `⌃X` to delete a preset

### View Network Details
- Select \"Network Interface in Use\" and press Enter to see full network information

## Keyboard Shortcuts

- `Enter` - Apply preset or view details
- `⌘R` - Reset to DHCP
- `⌘E` - Edit preset
- `⌘N` - Add new preset
- `⌃X` - Delete preset

## How It Works

DNS presets are stored in `~/.dns_presets` and applied using macOS's `networksetup` command with admin privileges.

## Built-in Presets

- **Cloudflare** - `1.1.1.1, 1.0.0.1` - Fast, privacy-focused DNS
- **Quad9** - `9.9.9.9, 149.112.112.112` - Blocks malware and phishing
- **OpenDNS** - `208.67.222.222, 208.67.220.220` - Filtering and content control

## Privacy

This extension does not collect or transmit any personal data. All DNS configuration changes are applied locally using macOS built-in tools.

## Requirements

- macOS 12 or later
- Administrator password for DNS changes
