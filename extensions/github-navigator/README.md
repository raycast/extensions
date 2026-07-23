# GitHub Navigator

![GitHub Navigator screenshot][1]

> Based on [webpro/raycast-github-navigator](https://github.com/webpro/raycast-github-navigator). Thanks to [webpro](https://github.com/webpro) for the original work.

Browse your GitHub repositories in Raycast: personal, collaborator, and organization repositories in one place, with flexible sorting.

## Features

- **Unified repository list**: personal (owner), collaborator, and organization repositories in one place
- **Flexible sorting**: sort by last updated, stars, open issues, or pull requests
- **Optional frecency sorting**: repositories you open more often and more recently can move higher in the list
- **Quick actions**: open a repository, issues, pull requests, actions, releases, insights, settings, and dependents; forked repositories also include an upstream action (⌘1 ~ ⌘9)
- **Browser tab reuse**: optionally focus an existing browser tab instead of opening a new one

## GitHub Token

The extension requires a [classic personal access token][2] with these scopes:

- `repo` — access repository data
- `read:org` — list organization repos
- `read:user` — identify your account

You'll be prompted to enter the token when you first run the command.

## Command Preferences

| Setting           | Description                                                                                                             | Default      |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------ |
| Sorting           | Choose the initial sorting method for repositories                                                                      | Last Updated |
| Frecency Sorting  | After the initial sort, apply frecency sorting based on how often and how recently you open repositories                | On           |
| Browser Tab Reuse | On macOS, focus an existing browser tab instead of opening a new one. On Windows, this falls back to opening a new tab. | Off          |

## Firefox / Zen

The "Reuse existing browser tab (macOS only)" feature and the "Add Bookmark" URL pre-fill
from the active tab work out of the box for Chrome and Safari (via AppleScript).

For Firefox and Zen, a companion browser extension and native messaging host are
required — see [browser-tab-bridge][3] to set this up.

## Tip

Assign a global hotkey to open this command directly: Raycast Settings → Extensions → GitHub Navigator → Browse Repositories → Hotkey (e.g. `Hyper Key` + `N`).

## License

MIT License © [Frankie](https://github.com/tofrankie)

[1]: metadata/screenshot-1.png
[2]: https://github.com/settings/tokens
[3]: https://github.com/webpro/browser-tab-bridge
