# Password Manager for Chrome

Open [Google Chrome](https://www.google.com/chrome/) built-in password manager from Raycast, with an optional search query.

This extension does **not** read, copy, or export passwords. It only opens Chrome's native password manager page.

## Usage

1. Open Raycast and search for **Password Manager** (subtitle: Google Chrome).
2. Optionally enter a search term in the **Search** argument field (for example `github`).
3. Press Enter.

Examples:

- No query → `chrome://password-manager/passwords`
- With query `github` → `chrome://password-manager/passwords?q=github`

On macOS, if a tab with `chrome://password-manager/passwords` is already open, the command focuses that tab instead of opening a duplicate. When a search query is provided, the tab navigates to the matching `?q=` URL; without a query, the current page is left unchanged.

You can also assign a command alias (for example `cpw`) in Raycast to run it faster.

## Requirements

- Google Chrome installed
- Raycast on macOS or Windows

### macOS

On first use, macOS may ask you to allow Raycast to control Google Chrome:

**System Settings → Privacy & Security → Automation**

If automation is denied, the command fails with an AppleScript authorization error.

### Windows

If Chrome is installed in a non-standard location, set **Chrome Executable** in extension preferences to the full path of `chrome.exe`.

## Development

```bash
npm install
npm run dev
```

## Source Code

- Development repository: https://github.com/zhouhuiquan/password-manager-for-chrome
- Raycast Store source (after publish): https://github.com/raycast/extensions/tree/main/extensions/password-manager-for-chrome

## Publish to Raycast Store

```bash
npm run build
npm run publish
```

This opens a pull request to the official [raycast/extensions](https://github.com/raycast/extensions) repository.

## License

MIT
