# npm for Raycast

Manage globally installed npm packages from Raycast.

## Commands

- `Show Installed`: browse globally installed packages, inspect metadata, update, and uninstall.
- `Show Outdated`: see only packages with updates available and update one or all of them.
- `Upgrade`: shortcut view for upgrading outdated global packages.
- `Search`: search the npm registry and install packages globally.
- `Clean Up`: verify the npm cache or clear it entirely.

## Notes

- This extension currently manages global packages via `npm`.
- If Raycast cannot find your `npm` binary, set `Custom npm Executable Path` in the extension preferences.

## Development

```bash
npm install
npm run dev
```
