# Folder Launcher

<p align="center">
  <img src="assets/command-icon.png" width="128" height="128" alt="Folder Launcher Icon">
</p>

<p align="center">
  <strong>Quickly open folders in your favorite editor with fuzzy search</strong>
</p>

<p align="center">
  <a href="https://www.raycast.com/cuipengcheng/folder-launcher">
    <img src="https://img.shields.io/badge/Raycast-Store-FF6363?style=flat-square&logo=raycast&logoColor=white" alt="Raycast Store">
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License">
  </a>
</p>

---

A [Raycast](https://raycast.com) extension inspired by [zoxide](https://github.com/ajeetdsouza/zoxide). Jump to your project folders instantly with smart fuzzy matching and frecency-based ranking.

## Features

- **Fuzzy Search** - Find folders by typing partial names (e.g., `auth` matches `opencode-antigravity-auth`)
- **Frecency Ranking** - Frequently and recently accessed folders rank higher
- **Multiple Editors** - Support for VS Code, Cursor, Zed, WebStorm, IntelliJ IDEA, Sublime Text, and more
- **Custom Apps** - Configure any application as your default editor
- **Directory Picker** - Easy workspace selection during setup

## Installation

### From Raycast Store

1. Open Raycast
2. Search for "Folder Launcher"
3. Click Install

### Manual Installation

```bash
git clone https://github.com/anthropic-ai/folder-launcher.git
cd folder-launcher
npm install
npm run dev
```

## Usage

1. Open Raycast
2. Type `z` to launch the extension
3. Start typing to fuzzy search your folders
4. Press `Enter` to open in your configured editor

### Examples

| Input | Matches |
|-------|---------|
| `auth` | `opencode-antigravity-auth`, `auth-service` |
| `react` | `my-react-app`, `react-components` |
| `api` | `backend-api`, `api-gateway` |

## Configuration

| Setting | Description |
|---------|-------------|
| **Workspace Path** | Root directory to scan for projects |
| **Search Depth** | How many levels deep to scan (1-5) |
| **Application** | Editor to open folders with |
| **Custom App Path** | Path for custom editor (when "Custom" is selected) |

### Supported Editors

- VS Code
- Cursor
- Zed
- WebStorm
- IntelliJ IDEA
- Sublime Text
- Antigravity
- Any custom application

## How It Works

### Frecency Algorithm

Like zoxide, Folder Launcher uses a frecency algorithm that combines **frequency** and **recency**:

- Each time you open a folder, its score increases
- Recently accessed folders get a time-based boost:
  - Last hour: 4x multiplier
  - Last day: 2x multiplier
  - Last week: 1.5x multiplier

This ensures your most-used and most-recent folders always appear first.

### Fuzzy Matching

Powered by [Fuse.js](https://fusejs.io/), the search considers:
- Folder name (70% weight)
- Full path (30% weight)

## Development

```bash
# Install dependencies
npm install

# Start development mode
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Inspired by [zoxide](https://github.com/ajeetdsouza/zoxide) - A smarter cd command
- Built with [Raycast API](https://developers.raycast.com/)
- Fuzzy search powered by [Fuse.js](https://fusejs.io/)
