# Open in PyCharm

Quickly open folders from Finder in PyCharm via Raycast.

## Features

- Opens selected folder in PyCharm
- Automatically finds installed PyCharm (Professional or Community)
- If a file is selected, opens its parent folder
- Works without UI (no-view) — instant execution

## Installation

```bash
cd pycharm-opener
npm install
npm run dev
```

## Usage

1. Select a folder (or file) in Finder
2. Open Raycast (`⌥ + Space`)
3. Type "PyCharm" or "Open in PyCharm"
4. Press Enter

The folder will open in PyCharm!

## Supported PyCharm Versions

The extension automatically searches for PyCharm in the following locations:

- `/Applications/PyCharm.app`
- `/Applications/PyCharm CE.app`
- `/Applications/PyCharm Professional.app`
- `/Applications/JetBrains Toolbox/PyCharm*.app`
- `~/Applications/PyCharm*.app`
- Spotlight search
- Command line tool `pycharm`

## License

MIT
