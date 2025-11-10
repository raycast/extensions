# TokenTerminal Search

Search TokenTerminal projects and chains directly from Raycast. Copy project logos and details with a simple keyboard shortcut.

## Features

- Search through all TokenTerminal projects and chains
- Filter by name, symbol, tags, or market sectors
- Copy logo URLs to clipboard (primary action)
- View project details including chains, tags, and market sectors
- Quick access to project symbols and names

## Setup

1. Install dependencies:
   ```bash
   cd token-terminal-search
   npm install
   ```

2. Add a command icon:
   - Place a PNG image (512x512px recommended) at `assets/command-icon.png`
   - Or download a crypto-related icon and save it as `command-icon.png` in the root directory

3. Configure your API token:
   - The extension will prompt you for your TokenTerminal API token on first use
   - You can also set it in Raycast preferences

4. Run in development mode:
   ```bash
   npm run dev
   ```

## Usage

1. Open Raycast
2. Search for "Search Projects"
3. Start typing to filter projects
4. Press Enter to copy the logo URL
5. Use shortcuts for other actions:
   - `Cmd+Enter`: Copy logo URL
   - `Cmd+Shift+N`: Copy project name
   - `Cmd+Shift+S`: Copy symbol
   - `Cmd+O`: Open logo in browser

## API Token

You need a TokenTerminal API token to use this extension. Set it in the extension preferences when prompted.
