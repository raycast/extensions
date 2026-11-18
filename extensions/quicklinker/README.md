# QuickLinker

Resolve your [QuickLinker](https://quicklinker.app) shortcuts directly from Raycast. Open any shortcut instantly or search and browse your full list.

## Setup

You need a free QuickLinker account at [quicklinker.app](https://quicklinker.app).

### Magic Key (required for Quick Open)

1. Log in to your QuickLinker dashboard
2. Go to **Settings > Advanced**
3. Copy your **Magic Key**
4. Paste it into this extension's preferences

### API Token (required for Search Shortcuts)

1. In your dashboard, go to **Settings > Advanced**
2. Enable **API Access**
3. Copy the generated **API Token**
4. Paste it into this extension's preferences

## Commands

### Quick Open Shortcut

A no-view command for maximum speed. Type a shortcut name and it opens immediately in your browser via QuickLinker's redirect.

**Tip:** Set `gl` as an alias for this command (right-click the command > Configure Command) for even faster access.

### Search Shortcuts

Browse and search all your shortcuts with Raycast's fuzzy filtering. Results are cached locally for 5 minutes so repeated searches are instant.

**Actions:**

- **Enter** — Open URL in browser
- **Cmd+Shift+C** — Copy URL
- **Cmd+Shift+N** — Copy shortcut name
- **Cmd+R** — Refresh shortcuts from server

## Preferences

| Preference | Type     | Required | Description                                                                                       |
| ---------- | -------- | -------- | ------------------------------------------------------------------------------------------------- |
| Magic Key  | Password | Yes      | Your QuickLinker magic key (`ql_...`) from Dashboard > Settings > Advanced                        |
| API Token  | Password | No       | Your QuickLinker API token (`qlapi_...`) from Dashboard > Settings > Advanced > Enable API Access |
