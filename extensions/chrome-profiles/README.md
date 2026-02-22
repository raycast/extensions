# Chrome Profiles - Raycast Extension

Quickly switch between Google Chrome profiles from Raycast.

## Features

- List all Chrome profiles with custom names
- Show Google account email for each profile
- Display Google avatar (circular, async loaded)
- Open Chrome with selected profile in one keystroke
- Auto-close Raycast after selection

## Install

```bash
git clone https://github.com/jaynguyen-vn/raycast-chrome-profiles.git
cd raycast-chrome-profiles
npm install
npm run dev
```

Then in Raycast:
1. Open **Raycast Settings** (`⌘ + ,`)
2. Go to **Extensions** → find **Chrome Profiles**
3. Set **Alias** to `cp` (or any shortcut you prefer)

## Usage

1. Open Raycast (default: `⌥ + Space`)
2. Type `cp` → Enter
3. Select a profile from the list → Enter
4. Chrome opens with that profile, Raycast closes automatically

## How It Works

- Reads Chrome's `Local State` file to get custom profile names
- Reads each profile's `Preferences` file for Google avatar URLs
- Uses `open -na "Google Chrome" --args --profile-directory="..."` to launch

## Development

```bash
npm run dev    # Start dev mode (hot reload)
npm run build  # Build for production
npm run lint   # Lint code
```

## Requirements

- macOS
- Google Chrome installed
- Raycast
- Node.js >= 16
